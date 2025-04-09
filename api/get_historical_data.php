<?php
// CORS ayarları
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

// Veritabanı yapılandırmasını içe aktar
require_once 'config.php';

// Parametreleri kontrol et
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

// Varsayılan parametreler
$hours = isset($_GET['hours']) ? intval($_GET['hours']) : 24; // Son 24 saat
$type = isset($_GET['type']) ? cleanInput($_GET['type']) : 'all'; // Tüm sensör tipleri

// Başlangıç zamanı hesapla
$start_time = date('Y-m-d H:i:s', strtotime("-{$hours} hours"));

// Sensör tiplerine göre sorgu oluştur
$type_condition = "";
if ($type !== 'all') {
    // Belirli bir sensör tipi için sorgu
    $type_condition = "AND s.ad LIKE '%$type%'";
}

// Sera için sensörleri al
$sensorler = $conn->query("
    SELECT s.id, s.ad 
    FROM sensorler s
    WHERE s.sera_id = $sera_id $type_condition
");

if ($sensorler->num_rows === 0) {
    sendResponse(false, "Bu seraya ait sensör bulunamadı");
}

// Sonuç verisi
$result = [];

// Her sensör için geçmiş verileri al
while ($sensor = $sensorler->fetch_assoc()) {
    $sensor_id = $sensor['id'];
    $sensor_name = $sensor['ad'];
    
    // Bu sensör için geçmiş verileri al
    $query = "
        SELECT deger, kayit_zamani 
        FROM sensor_verileri 
        WHERE sensor_id = $sensor_id 
            AND kayit_zamani >= '$start_time'
        ORDER BY kayit_zamani ASC
    ";
    
    $data = $conn->query($query);
    
    // Sensör tipine göre key belirle
    $key = '';
    
    if (strpos($sensor_name, 'Sıcaklık') !== false) {
        $key = 'temperature';
    } else if (strpos($sensor_name, 'Nem') !== false) {
        if (strpos($sensor_name, 'Toprak') !== false) {
            $key = 'soilMoisture';
        } else {
            $key = 'humidity';
        }
    } else if (strpos($sensor_name, 'Su') !== false) {
        $key = 'waterLevel';
    } else if (strpos($sensor_name, 'Hava') !== false || strpos($sensor_name, 'Işık') !== false) {
        $key = 'lightLevel'; // Hava kalite sensörünü ışık seviyesi için kullanıyoruz
    }
    
    // Key belirlenmişse ve veri varsa ekle
    if ($key !== '' && $data->num_rows > 0) {
        $result[$key] = [];
        
        while ($row = $data->fetch_assoc()) {
            $result[$key][] = [
                'value' => floatval($row['deger']),
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
    sendResponse(false, "Belirtilen zaman aralığında veri bulunamadı");
}