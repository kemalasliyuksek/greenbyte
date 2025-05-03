<?php
// CORS ayarları (tüm isteklere izin ver)
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

// POST verisi olup olmadığını kontrol et
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(false, "Sadece POST istekleri kabul edilir");
}

// JSON verisini al
$json_data = file_get_contents('php://input');
error_log("Alınan ham veri: " . $json_data); // Ham veriyi logla

$data = json_decode($json_data, true);

// JSON verilerinin doğru formatta olup olmadığını kontrol et
if (!$data) {
    error_log("JSON parse hatası: " . json_last_error_msg());
    sendResponse(false, "JSON parse hatası: " . json_last_error_msg());
}

if (!isset($data['sera_id'])) {
    error_log("sera_id parametresi bulunamadı");
    sendResponse(false, "Geçersiz veri formatı: sera_id parametresi gerekli");
}

if (!isset($data['sensor_data'])) {
    error_log("sensor_data parametresi bulunamadı");
    sendResponse(false, "Geçersiz veri formatı: sensor_data parametresi gerekli");
}

// Veritabanı bağlantısı
$conn = connectDB();

// Sera ID'sini al ve temizle
$sera_id = cleanInput($data['sera_id']);

// Sera ID'sinin veritabanında var olup olmadığını kontrol et
$check_sera = $conn->query("SELECT id FROM seralar WHERE id = $sera_id");
if ($check_sera->num_rows === 0) {
    error_log("Geçersiz sera ID: $sera_id");
    sendResponse(false, "Geçersiz sera ID: $sera_id");
}

// Sensör verilerini al
$sensor_data = $data['sensor_data'];

// Sensorler tablosundan sensör ID'lerini al
$sensorler = $conn->query("SELECT id, ad FROM sensorler WHERE sera_id = $sera_id");

// Bulunan sensörleri logla
$sensor_names_found = array();
while ($row = $sensorler->fetch_assoc()) {
    $sensor_names_found[$row['ad']] = $row['id'];
}
error_log("Bulunan sensörler: " . implode(", ", array_keys($sensor_names_found)));

// Sensör adları ve ID'leri
$sensor_ids = [];
// Sorguyu yeniden çalıştır çünkü önceki while döngüsü verileri tüketti
$sensorler = $conn->query("SELECT id, ad FROM sensorler WHERE sera_id = $sera_id");
while ($row = $sensorler->fetch_assoc()) {
    $sensor_ids[$row['ad']] = $row['id'];
}

// Her sensör için veriyi kaydet
$success_count = 0;
$error_messages = [];

// Sıcaklık ve nem verisi (DHT11)
if (isset($sensor_data['temperature']) && isset($sensor_data['humidity']) && isset($sensor_ids['DHT11 Sıcaklık ve Nem Sensörü'])) {
    $temp = floatval($sensor_data['temperature']);
    $humidity = floatval($sensor_data['humidity']);
    $sensor_id = $sensor_ids['DHT11 Sıcaklık ve Nem Sensörü'];
    
    // Sıcaklık verisini kaydet
    $sql_temp = "INSERT INTO sensor_verileri (sensor_id, deger) VALUES ($sensor_id, $temp)";
    if ($conn->query($sql_temp) === TRUE) {
        $success_count++;
        error_log("Sıcaklık verisi kaydedildi: $temp");
    } else {
        $error_messages[] = "Sıcaklık verisi kaydedilemedi: " . $conn->error;
        error_log("Sıcaklık verisi kaydedilemedi: " . $conn->error);
    }
    
    // Nem verisini de aynı sensöre kaydet (not: gerçek uygulamada ayrı sensör ID'leri kullanılabilir)
    $sql_humidity = "INSERT INTO sensor_verileri (sensor_id, deger) VALUES ($sensor_id, $humidity)";
    if ($conn->query($sql_humidity) === TRUE) {
        $success_count++;
        error_log("Nem verisi kaydedildi: $humidity");
    } else {
        $error_messages[] = "Nem verisi kaydedilemedi: " . $conn->error;
        error_log("Nem verisi kaydedilemedi: " . $conn->error);
    }
} else {
    if (!isset($sensor_ids['DHT11 Sıcaklık ve Nem Sensörü'])) {
        error_log("DHT11 Sıcaklık ve Nem Sensörü veritabanında bulunamadı");
    }
}

// Toprak nem verisi
if (isset($sensor_data['soil_moisture']) && isset($sensor_ids['Toprak Nem Sensörü'])) {
    $soil_moisture = floatval($sensor_data['soil_moisture']);
    $sensor_id = $sensor_ids['Toprak Nem Sensörü'];
    
    $sql = "INSERT INTO sensor_verileri (sensor_id, deger) VALUES ($sensor_id, $soil_moisture)";
    if ($conn->query($sql) === TRUE) {
        $success_count++;
        error_log("Toprak nem verisi kaydedildi: $soil_moisture");
    } else {
        $error_messages[] = "Toprak nem verisi kaydedilemedi: " . $conn->error;
        error_log("Toprak nem verisi kaydedilemedi: " . $conn->error);
    }
} else {
    if (!isset($sensor_ids['Toprak Nem Sensörü'])) {
        error_log("Toprak Nem Sensörü veritabanında bulunamadı");
    }
}

// Su seviyesi verisi
if (isset($sensor_data['water_level']) && isset($sensor_ids['Su Seviyesi Sensörü'])) {
    $water_level = floatval($sensor_data['water_level']);
    $sensor_id = $sensor_ids['Su Seviyesi Sensörü'];
    
    $sql = "INSERT INTO sensor_verileri (sensor_id, deger) VALUES ($sensor_id, $water_level)";
    if ($conn->query($sql) === TRUE) {
        $success_count++;
        error_log("Su seviyesi verisi kaydedildi: $water_level");
    } else {
        $error_messages[] = "Su seviyesi verisi kaydedilemedi: " . $conn->error;
        error_log("Su seviyesi verisi kaydedilemedi: " . $conn->error);
    }
} else {
    if (!isset($sensor_ids['Su Seviyesi Sensörü'])) {
        error_log("Su Seviyesi Sensörü veritabanında bulunamadı");
    }
}

// Işık seviyesi verisi 
if (isset($sensor_data['light_level']) && isset($sensor_ids['Işık Seviyesi Sensörü'])) {
    $light_level = floatval($sensor_data['light_level']);
    $sensor_id = $sensor_ids['Işık Seviyesi Sensörü'];
    
    $sql = "INSERT INTO sensor_verileri (sensor_id, deger) VALUES ($sensor_id, $light_level)";
    if ($conn->query($sql) === TRUE) {
        $success_count++;
        error_log("Işık seviyesi verisi kaydedildi: $light_level");
    } else {
        $error_messages[] = "Işık seviyesi verisi kaydedilemedi: " . $conn->error;
        error_log("Işık seviyesi verisi kaydedilemedi: " . $conn->error);
    }
} else if (isset($sensor_data['light_level']) && isset($sensor_ids['Hava Kalite Sensörü'])) {
    // Alternatif olarak Hava Kalite Sensörünü ışık seviyesi için kullan
    $light_level = floatval($sensor_data['light_level']);
    $sensor_id = $sensor_ids['Hava Kalite Sensörü'];
    
    $sql = "INSERT INTO sensor_verileri (sensor_id, deger) VALUES ($sensor_id, $light_level)";
    if ($conn->query($sql) === TRUE) {
        $success_count++;
        error_log("Işık seviyesi verisi kaydedildi (Hava Kalite Sensörü üzerinden): $light_level");
    } else {
        $error_messages[] = "Işık seviyesi verisi kaydedilemedi: " . $conn->error;
        error_log("Işık seviyesi verisi kaydedilemedi: " . $conn->error);
    }
} else {
    if (!isset($sensor_ids['Işık Seviyesi Sensörü']) && !isset($sensor_ids['Hava Kalite Sensörü'])) {
        error_log("Işık Seviyesi Sensörü veya Hava Kalite Sensörü veritabanında bulunamadı");
    }
}

// CO2 seviyesi verisi
if (isset($sensor_data['co2_ppm']) && isset($sensor_ids['CO2 Sensörü'])) {
    $co2_level = floatval($sensor_data['co2_ppm']);
    $sensor_id = $sensor_ids['CO2 Sensörü'];
    
    $sql = "INSERT INTO sensor_verileri (sensor_id, deger) VALUES ($sensor_id, $co2_level)";
    if ($conn->query($sql) === TRUE) {
        $success_count++;
        error_log("CO2 seviyesi verisi kaydedildi: $co2_level");
    } else {
        $error_messages[] = "CO2 seviyesi verisi kaydedilemedi: " . $conn->error;
        error_log("CO2 seviyesi verisi kaydedilemedi: " . $conn->error);
    }
} else if (isset($sensor_data['co2_ppm']) && isset($sensor_ids['Hava Kalite Sensörü'])) {
    // Alternatif olarak Hava Kalite Sensörünü CO2 için kullan
    $co2_level = floatval($sensor_data['co2_ppm']);
    $sensor_id = $sensor_ids['Hava Kalite Sensörü'];
    
    $sql = "INSERT INTO sensor_verileri (sensor_id, deger, veri_tipi) VALUES ($sensor_id, $co2_level, 'co2')";
    if ($conn->query($sql) === TRUE) {
        $success_count++;
        error_log("CO2 seviyesi verisi kaydedildi (Hava Kalite Sensörü üzerinden): $co2_level");
    } else {
        $error_messages[] = "CO2 seviyesi verisi kaydedilemedi: " . $conn->error;
        error_log("CO2 seviyesi verisi kaydedilemedi: " . $conn->error);
    }
}

// Duman/yangın durumu verisi
if (isset($sensor_data['smoke_detected']) && isset($sensor_ids['Duman Sensörü'])) {
    $smoke_detected = $sensor_data['smoke_detected'] ? 1 : 0;
    $sensor_id = $sensor_ids['Duman Sensörü'];
    
    $sql = "INSERT INTO sensor_verileri (sensor_id, deger) VALUES ($sensor_id, $smoke_detected)";
    if ($conn->query($sql) === TRUE) {
        $success_count++;
        error_log("Duman durumu verisi kaydedildi: $smoke_detected");
    } else {
        $error_messages[] = "Duman durumu verisi kaydedilemedi: " . $conn->error;
        error_log("Duman durumu verisi kaydedilemedi: " . $conn->error);
    }
} else if (isset($sensor_data['smoke_detected']) && isset($sensor_ids['Hava Kalite Sensörü'])) {
    // Alternatif olarak Hava Kalite Sensörünü duman algılama için kullan
    $smoke_detected = $sensor_data['smoke_detected'] ? 1 : 0;
    $sensor_id = $sensor_ids['Hava Kalite Sensörü'];
    
    $sql = "INSERT INTO sensor_verileri (sensor_id, deger, veri_tipi) VALUES ($sensor_id, $smoke_detected, 'smoke')";
    if ($conn->query($sql) === TRUE) {
        $success_count++;
        error_log("Duman durumu verisi kaydedildi (Hava Kalite Sensörü üzerinden): $smoke_detected");
    } else {
        $error_messages[] = "Duman durumu verisi kaydedilemedi: " . $conn->error;
        error_log("Duman durumu verisi kaydedilemedi: " . $conn->error);
    }
}

// Bağlantıyı kapat
$conn->close();

// Sonuç gönder
if ($success_count > 0) {
    sendResponse(true, "Veriler başarıyla kaydedildi", [
        'success_count' => $success_count,
        'errors' => $error_messages
    ]);
} else {
    sendResponse(false, "Hiçbir veri kaydedilemedi", [
        'errors' => $error_messages
    ]);
}
?>