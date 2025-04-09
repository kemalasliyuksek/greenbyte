<?php
// CORS ayarları (gerektiğinde kullanın)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// Veritabanı yapılandırmasını içe aktar
require_once 'config.php';

// POST verisi olup olmadığını kontrol et
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(false, "Sadece POST istekleri kabul edilir");
}

// JSON verisini al
$json_data = file_get_contents('php://input');
$data = json_decode($json_data, true);

// JSON verilerinin doğru formatta olup olmadığını kontrol et
if (!$data || !isset($data['sera_id']) || !isset($data['sensor_data'])) {
    sendResponse(false, "Geçersiz veri formatı");
}

// Veritabanı bağlantısı
$conn = connectDB();

// Sera ID'sini al ve temizle
$sera_id = cleanInput($data['sera_id']);

// Sera ID'sinin veritabanında var olup olmadığını kontrol et
$check_sera = $conn->query("SELECT id FROM seralar WHERE id = $sera_id");
if ($check_sera->num_rows === 0) {
    sendResponse(false, "Geçersiz sera ID: $sera_id");
}

// Sensör verilerini al
$sensor_data = $data['sensor_data'];

// Sensorler tablosundan sensör ID'lerini al
$sensorler = $conn->query("SELECT id, ad FROM sensorler WHERE sera_id = $sera_id");

// Sensör adları ve ID'leri
$sensor_ids = [];
while ($row = $sensorler->fetch_assoc()) {
    $sensor_ids[$row['ad']] = $row['id'];
}

// Her sensör için veriyi kaydet
$success_count = 0;
$error_messages = [];

// Sıcaklık ve nem verisi (DHT11)
if (isset($sensor_data['temperature']) && isset($sensor_data['humidity']) 
    && isset($sensor_ids['DHT11 Sıcaklık ve Nem Sensörü'])) {
    
    $temp = floatval($sensor_data['temperature']);
    $humidity = floatval($sensor_data['humidity']);
    $sensor_id = $sensor_ids['DHT11 Sıcaklık ve Nem Sensörü'];
    
    // Sıcaklık verisini kaydet
    $sql_temp = "INSERT INTO sensor_verileri (sensor_id, deger) VALUES ($sensor_id, $temp)";
    if ($conn->query($sql_temp) === TRUE) {
        $success_count++;
    } else {
        $error_messages[] = "Sıcaklık verisi kaydedilemedi: " . $conn->error;
    }
    
    // Nem verisini de aynı sensöre kaydet (not: gerçek uygulamada ayrı sensör ID'leri kullanılabilir)
    $sql_humidity = "INSERT INTO sensor_verileri (sensor_id, deger) VALUES ($sensor_id, $humidity)";
    if ($conn->query($sql_humidity) === TRUE) {
        $success_count++;
    } else {
        $error_messages[] = "Nem verisi kaydedilemedi: " . $conn->error;
    }
}

// Toprak nem verisi
if (isset($sensor_data['soil_moisture']) && isset($sensor_ids['Toprak Nem Sensörü'])) {
    $soil_moisture = floatval($sensor_data['soil_moisture']);
    $sensor_id = $sensor_ids['Toprak Nem Sensörü'];
    
    $sql = "INSERT INTO sensor_verileri (sensor_id, deger) VALUES ($sensor_id, $soil_moisture)";
    if ($conn->query($sql) === TRUE) {
        $success_count++;
    } else {
        $error_messages[] = "Toprak nem verisi kaydedilemedi: " . $conn->error;
    }
}

// Su seviyesi verisi
if (isset($sensor_data['water_level']) && isset($sensor_ids['Su Seviyesi Sensörü'])) {
    $water_level = floatval($sensor_data['water_level']);
    $sensor_id = $sensor_ids['Su Seviyesi Sensörü'];
    
    $sql = "INSERT INTO sensor_verileri (sensor_id, deger) VALUES ($sensor_id, $water_level)";
    if ($conn->query($sql) === TRUE) {
        $success_count++;
    } else {
        $error_messages[] = "Su seviyesi verisi kaydedilemedi: " . $conn->error;
    }
}

// Işık seviyesi verisi (Hava Kalite Sensörü olarak kullanıyoruz, çünkü var olan sensörlerden en uygun bu)
if (isset($sensor_data['light_level']) && isset($sensor_ids['Hava Kalite Sensörü'])) {
    $light_level = floatval($sensor_data['light_level']);
    $sensor_id = $sensor_ids['Hava Kalite Sensörü'];
    
    $sql = "INSERT INTO sensor_verileri (sensor_id, deger) VALUES ($sensor_id, $light_level)";
    if ($conn->query($sql) === TRUE) {
        $success_count++;
    } else {
        $error_messages[] = "Işık seviyesi verisi kaydedilemedi: " . $conn->error;
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