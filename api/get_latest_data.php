<?php
// CORS ayarları
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// OPTIONS isteği için erken yanıt
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

header("Content-Type: application/json");

// Veritabanı yapılandırmasını içe aktar
require_once 'config.php';

// Hangi sera için veri istendiğini kontrol et
if (!isset($_GET['seraID'])) {
    sendResponse(false, "Sera ID belirtilmedi");
}

$sera_id = cleanInput($_GET['seraID']);

// Veritabanı bağlantısı
$conn = connectDB();

// Sera varlığını kontrol et
$check_sera = $conn->query("SELECT id FROM seralar WHERE id = $sera_id");
if ($check_sera->num_rows === 0) {
    sendResponse(false, "Geçersiz sera ID: $sera_id");
}

// Sera için sensörleri al
$sensorler = $conn->query("SELECT id, ad FROM sensorler WHERE sera_id = $sera_id");

if ($sensorler->num_rows === 0) {
    sendResponse(false, "Bu seraya ait sensör bulunamadı");
}

// Sonuç verisi
$result = [];

// DHT11 sensörü için özel işlem
$dht11_sensor_id = null;
$dht11_sensor_name = null;

// Önce DHT11 sensörünü bul
while ($sensor = $sensorler->fetch_assoc()) {
    if (strpos($sensor['ad'], 'DHT11') !== false || strpos($sensor['ad'], 'Sıcaklık ve Nem') !== false) {
        $dht11_sensor_id = $sensor['id'];
        $dht11_sensor_name = $sensor['ad'];
        break;
    }
}

// DHT11 sensörü bulunduysa, hem sıcaklık hem nem için iki ayrı sorgu yap
if ($dht11_sensor_id !== null) {
    // Son iki kaydı al (biri sıcaklık, biri nem)
    $query = "SELECT deger, kayit_zamani, veri_tipi 
            FROM sensor_verileri 
            WHERE sensor_id = $dht11_sensor_id 
            ORDER BY kayit_zamani DESC 
            LIMIT 2";
    
    $data = $conn->query($query);
    
    if ($data->num_rows > 0) {
        $records = [];
        while ($row = $data->fetch_assoc()) {
            $records[] = $row;
        }
        
        // İki kayıt varsa (hem sıcaklık hem nem)
        if (count($records) == 2) {
            // İlk kayıt (daha yeni olan) nem olacaktır, çünkü esp32 kodunda önce sıcaklık sonra nem gönderiliyor
            $result['humidity'] = [
                'value' => floatval($records[0]['deger']),
                'timestamp' => $records[0]['kayit_zamani']
            ];
            
            // İkinci kayıt (daha eski olan) sıcaklık olacaktır
            $result['temperature'] = [
                'value' => floatval($records[1]['deger']),
                'timestamp' => $records[1]['kayit_zamani']
            ];
        } 
        // Tek kayıt varsa, o zaman son kayıt neyse ona göre işlem yap
        else if (count($records) == 1) {
            // Varsayılan olarak sıcaklık kabul edelim
            $result['temperature'] = [
                'value' => floatval($records[0]['deger']),
                'timestamp' => $records[0]['kayit_zamani']
            ];
        }
    }
}

// Sera için sensörleri tekrar al (çünkü önceki while döngüsü verileri tüketti)
$sensorler = $conn->query("SELECT id, ad FROM sensorler WHERE sera_id = $sera_id");

// Diğer sensörler için işlemi yap
while ($sensor = $sensorler->fetch_assoc()) {
    $sensor_id = $sensor['id'];
    $sensor_name = $sensor['ad'];
    
    // DHT11 sensörünü atlayalım, çünkü zaten işledik
    if ($sensor_id == $dht11_sensor_id) {
        continue;
    }
    
    // Bu sensör için en son verileri al - veri_tipi kontrolüyle
    $query = "SELECT deger, kayit_zamani, veri_tipi 
              FROM sensor_verileri 
              WHERE sensor_id = $sensor_id 
              ORDER BY kayit_zamani DESC";
    
    // Özel sensör tipleri için sorguyu düzenle
    if (strpos($sensor_name, 'Hava Kalite') !== false) {
        // Hava kalite sensörü için en son farklı tip verileri al
        // CO2 verisi
        $co2_query = "SELECT deger, kayit_zamani 
                  FROM sensor_verileri 
                  WHERE sensor_id = $sensor_id AND (veri_tipi = 'co2' OR veri_tipi IS NULL)
                  ORDER BY kayit_zamani DESC 
                  LIMIT 1";
        
        $co2_data = $conn->query($co2_query);
        if ($co2_data->num_rows > 0) {
            $row = $co2_data->fetch_assoc();
            $result['co2Level'] = [
                'value' => floatval($row['deger']),
                'timestamp' => $row['kayit_zamani']
            ];
        }
        
        // Duman verisi
        $smoke_query = "SELECT deger, kayit_zamani 
                    FROM sensor_verileri 
                    WHERE sensor_id = $sensor_id AND veri_tipi = 'smoke'
                    ORDER BY kayit_zamani DESC 
                    LIMIT 1";
        
        $smoke_data = $conn->query($smoke_query);
        if ($smoke_data->num_rows > 0) {
            $row = $smoke_data->fetch_assoc();
            $result['smokeDetected'] = [
                'value' => (floatval($row['deger']) > 0),
                'timestamp' => $row['kayit_zamani']
            ];
        }
        
        // Işık seviyesi için normal sorgu
        $light_query = "SELECT deger, kayit_zamani 
                    FROM sensor_verileri 
                    WHERE sensor_id = $sensor_id AND (veri_tipi IS NULL OR veri_tipi = 'light')
                    ORDER BY kayit_zamani DESC 
                    LIMIT 1";
        
        $light_data = $conn->query($light_query);
        if ($light_data->num_rows > 0) {
            $row = $light_data->fetch_assoc();
            $result['lightLevel'] = [
                'value' => floatval($row['deger']),
                'timestamp' => $row['kayit_zamani']
            ];
        }
        
        continue; // Bu sensör için işlem tamamlandı, sonraki sensöre geç
    }
    
    // Standart sensörler için normal sorgu
    $data = $conn->query($query . " LIMIT 1");
    
    if ($data->num_rows > 0) {
        $row = $data->fetch_assoc();
        
        // Sensör tipine göre uygun anahtar belirle
        if (strpos($sensor_name, 'Toprak Nem') !== false) {
            $result['soilMoisture'] = [
                'value' => floatval($row['deger']),
                'timestamp' => $row['kayit_zamani']
            ];
        } else if (strpos($sensor_name, 'Su') !== false) {
            $result['waterLevel'] = [
                'value' => floatval($row['deger']),
                'timestamp' => $row['kayit_zamani']
            ];
        } else if (strpos($sensor_name, 'Işık') !== false) {
            $result['lightLevel'] = [
                'value' => floatval($row['deger']),
                'timestamp' => $row['kayit_zamani']
            ];
        } else if (strpos($sensor_name, 'CO2') !== false) {
            $result['co2Level'] = [
                'value' => floatval($row['deger']),
                'timestamp' => $row['kayit_zamani']
            ];
        } else if (strpos($sensor_name, 'Duman') !== false) {
            $result['smokeDetected'] = [
                'value' => (floatval($row['deger']) > 0),
                'timestamp' => $row['kayit_zamani']
            ];
        }
    }
}

// Bağlantıyı kapat
$conn->close();

// Sonuç gönder
if (count($result) > 0) {
    // Başarı durumunu ekle
    $result['success'] = true;
    echo json_encode($result);
} else {
    sendResponse(false, "Hiç veri bulunamadı");
}
?>