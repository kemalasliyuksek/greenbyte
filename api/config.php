<?php
// Veritabanı bağlantı ayarları
$db_host = "localhost"; // Muhtemelen "localhost" olmalı
$db_user = "admin"; // Kontrol panelinden doğru kullanıcı adı
$db_pass = "Ke3@1.3ySq1"; // Kullanıcınızın şifresi
$db_name = "greenbyte"; // Veritabanı adı

// Veritabanı bağlantısını oluştur
function connectDB() {
    global $db_host, $db_user, $db_pass, $db_name;
    
    try {
        $conn = new mysqli($db_host, $db_user, $db_pass, $db_name);
        
        // Bağlantıyı kontrol et
        if ($conn->connect_error) {
            error_log("Veritabanı bağlantı hatası: " . $conn->connect_error);
            die("Veritabanı bağlantı hatası: " . $conn->connect_error);
        }
        
        // Türkçe karakter desteği için karakter setini ayarla
        $conn->set_charset("utf8");
        
        return $conn;
    } catch (Exception $e) {
        error_log("Veritabanı bağlantı istisnası: " . $e->getMessage());
        die("Veritabanı bağlantı istisnası: " . $e->getMessage());
    }
}

// Güvenli SQL sorguları için giriş temizleme fonksiyonu
function cleanInput($data) {
    $conn = connectDB();
    return $conn->real_escape_string($data);
}

// API yanıtlarını JSON formatında döndüren fonksiyon
function sendResponse($success, $message, $data = null) {
    $response = [
        'success' => $success,
        'message' => $message
    ];
    
    if ($data !== null) {
        $response['data'] = $data;
    }
    
    header('Content-Type: application/json');
    echo json_encode($response);
    exit;
}
?>