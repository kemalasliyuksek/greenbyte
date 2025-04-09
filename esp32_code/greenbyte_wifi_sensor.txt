#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ===== AYARLANACAK PARAMETRELER =====
// WiFi Bağlantısı
const char* ssid = "Superbox53";
const char* password = "SuperB0x.53";

// Sunucu Ayarları
const char* serverName = "http://kemalasliyuksek.com/greenbyte/api/update_sensor_data.php";
const int seraID = 1; // Hangi seraya ait veriler

// Güncelleme Aralığı (milisaniye cinsinden)
unsigned long updateInterval = 10000; // 10 saniye

// Pin tanımlamaları
// LDR (Işık) Sensörü
const int ldrPin = 36;          // GPIO36 (ADC0)

// DHT11 Sıcaklık ve Nem Sensörü
#define DHTPIN 14               // GPIO14
#define DHTTYPE DHT11           // DHT11 sensör tipi

// Su Seviye Sensörü
const int waterSensorPin = 39;  // GPIO39 (ADC3)

// Toprak Nem Sensörü
const int soilMoistureAnalogPin = 34;    // GPIO34 (ADC6)
const int soilMoistureDigitalPin = 25;   // GPIO25

// LED
const int ledPin = 2;           // ESP32 üzerindeki dahili LED (GPIO2)

// DHT sensör nesnesi oluşturma
DHT dht(DHTPIN, DHTTYPE);

// LDR (Işık) Sensörü kalibrasyon ve değişkenleri
const int DARK_THRESHOLD = 3800;   // Karanlık ortam değeri (YÜKSEK değer)
const int LIGHT_THRESHOLD = 800;   // Aydınlık ortam değeri (DÜŞÜK değer)
int lightPercentage = 0;

// LDR hareketli ortalama filtresi
const int numReadings = 10;
int readings[numReadings];
int readIndex = 0;
int total = 0;
int averageValue = 0;

// Su Seviye Sensörü kalibrasyon ve değişkenleri
const int waterMinReading = 0;
const int waterMaxReading = 4000;
int waterLevel = 0;
int waterPercentage = 0;

// Toprak Nem Sensörü kalibrasyon ve değişkenleri
const int soilDry = 3400;        // Sensör kuru topraktayken ölçülen değer
const int soilWet = 1400;        // Sensör suda veya çok nemli topraktayken ölçülen değer
int soilAnalogValue = 0;
int soilDigitalValue = 0;
int soilMoisturePercentage = 0;

// DHT11 değişkenleri
float humidity = 0;
float temperature = 0;

// Zamanlama için değişkenler
unsigned long previousMillis = 0;
unsigned long currentMillis = 0;

// Sistem durumu değişkenleri
bool wifiConnected = false;
bool lastSendSuccess = false;
int failedAttempts = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  // Pin modlarını ayarla
  pinMode(ledPin, OUTPUT);
  pinMode(soilMoistureDigitalPin, INPUT);
  
  // ADC çözünürlüğünü ayarla (0-4095)
  analogReadResolution(12);
  
  // DHT sensörünü başlat
  dht.begin();
  
  // LDR hareketli ortalama dizisini sıfırla
  for (int i = 0; i < numReadings; i++) {
    readings[i] = 0;
  }
  
  Serial.println("\nESP32 GreenByte Sera IoT Sistemi");
  Serial.println("================================");
  Serial.println("Sensörler: LDR, DHT11, Su Seviye, Toprak Nem");
  Serial.println("Veri gönderme sıklığı: " + String(updateInterval / 1000) + " saniye");
  Serial.println("================================\n");
  
  // WiFi Bağlantısı
  connectToWifi();
  
  // İlk veri gönderimi
  readAllSensors();
  sendDataToServer();
}

void loop() {
  // Şu anki zamanı al
  currentMillis = millis();
  
  // WiFi bağlantısını kontrol et, bağlantı yoksa tekrar bağlan
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi bağlantısı kesildi. Yeniden bağlanılıyor...");
    connectToWifi();
  }
  
  // Güncelleme zamanı geldi mi kontrol et
  if (currentMillis - previousMillis >= updateInterval) {
    previousMillis = currentMillis;
    
    // Tüm sensörleri oku
    readAllSensors();
    
    // Verileri seri monitöre yazdır
    printAllSensorData();
    
    // Verileri sunucuya gönder
    sendDataToServer();
  }
  
  // LED durum göstergesi
  // 1. WiFi bağlantısı yoksa hızlı yanıp sön
  // 2. Son veri gönderimi başarısızsa orta hızda yanıp sön
  // 3. Toprak nemi düşükse veya su seviyesi düşükse yavaş yanıp sön
  // 4. Herşey normalde LED kapalı kalsın
  
  if (!wifiConnected) {
    // WiFi bağlantısı yoksa hızlı yanıp sön (250ms)
    digitalWrite(ledPin, (currentMillis / 250) % 2);
  }
  else if (!lastSendSuccess) {
    // Son veri gönderimi başarısızsa orta hızda yanıp sön (500ms)
    digitalWrite(ledPin, (currentMillis / 500) % 2);
  }
  else if (soilMoisturePercentage < 30 || waterPercentage < 20) {
    // Toprak nemi düşükse veya su seviyesi düşükse yavaş yanıp sön (1000ms)
    digitalWrite(ledPin, (currentMillis / 1000) % 2);
  }
  else {
    // Her şey normalse LED'i kapat
    digitalWrite(ledPin, LOW);
  }
  
  // Kısa bekleme ile döngü tekrarı
  delay(100);
}

// WiFi'ye bağlanma fonksiyonu
void connectToWifi() {
  Serial.print("WiFi ağına bağlanılıyor: ");
  Serial.println(ssid);
  
  WiFi.begin(ssid, password);
  
  // Bağlantıyı 20 saniye boyunca dene
  int connectionAttempts = 0;
  while (WiFi.status() != WL_CONNECTED && connectionAttempts < 20) {
    delay(1000);
    Serial.print(".");
    connectionAttempts++;
    
    // Her deneme için LED'i yanıp söndür
    digitalWrite(ledPin, connectionAttempts % 2);
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    Serial.println("\nWiFi bağlantısı başarılı!");
    Serial.print("IP Adresi: ");
    Serial.println(WiFi.localIP());
    
    // Bağlantı başarılı olduğunda LED'i 3 kez hızlıca yanıp söndür
    for (int i = 0; i < 3; i++) {
      digitalWrite(ledPin, HIGH);
      delay(100);
      digitalWrite(ledPin, LOW);
      delay(100);
    }
  } else {
    wifiConnected = false;
    Serial.println("\nWiFi bağlantısı kurulamadı! Daha sonra tekrar denenecek.");
  }
}

// Tüm sensörleri okuma fonksiyonu
void readAllSensors() {
  readLightSensor();
  readDHTSensor();
  readWaterLevelSensor();
  readSoilMoistureSensor();
}

// LDR Işık Sensörü okuma fonksiyonu
void readLightSensor() {
  // Sensör değerini oku
  int ldrValue = analogRead(ldrPin);
  
  // Hareketli ortalama hesapla
  total = total - readings[readIndex];
  readings[readIndex] = ldrValue;
  total = total + readings[readIndex];
  readIndex = (readIndex + 1) % numReadings;
  averageValue = total / numReadings;
  
  // Işık seviyesini yüzde olarak hesapla (0-100%)
  lightPercentage = map(averageValue, DARK_THRESHOLD, LIGHT_THRESHOLD, 0, 100);
  lightPercentage = constrain(lightPercentage, 0, 100);
}

// DHT11 Sıcaklık ve Nem Sensörü okuma fonksiyonu
void readDHTSensor() {
  // Nem ve sıcaklık değerlerini oku
  humidity = dht.readHumidity();
  temperature = dht.readTemperature();

  // Okunan değerleri kontrol et
  if (isnan(humidity) || isnan(temperature)) {
    Serial.println("DHT sensöründen veri okunamadı!");
    
    // Önceki değerler geçerli değilse, makul değerler ata
    if (isnan(humidity)) humidity = 50.0; // %50 varsayılan nem
    if (isnan(temperature)) temperature = 25.0; // 25°C varsayılan sıcaklık
  }
}

// Su Seviye Sensörü okuma fonksiyonu
void readWaterLevelSensor() {
  // Analog değeri oku
  waterLevel = analogRead(waterSensorPin);
  
  // Okunan değeri yüzdeye çevir (0-100)
  waterLevel = constrain(waterLevel, waterMinReading, waterMaxReading);
  waterPercentage = map(waterLevel, waterMinReading, waterMaxReading, 0, 100);
}

// Toprak Nem Sensörü okuma fonksiyonu
void readSoilMoistureSensor() {
  // Analog değeri oku
  soilAnalogValue = analogRead(soilMoistureAnalogPin);
  
  // Dijital değeri oku
  soilDigitalValue = digitalRead(soilMoistureDigitalPin);
  
  // Nem değerini yüzde olarak hesapla
  soilMoisturePercentage = map(soilAnalogValue, soilDry, soilWet, 0, 100);
  soilMoisturePercentage = constrain(soilMoisturePercentage, 0, 100);
}

// Tüm sensör verilerini seri monitöre yazdırma fonksiyonu
void printAllSensorData() {
  Serial.println("\n--- SENSÖR VERİLERİ ---");
  
  // LDR Işık Sensörü
  Serial.print("Işık Seviyesi: %");
  Serial.print(lightPercentage);
  Serial.print(" | Durum: ");
  Serial.println(getLightStatus(lightPercentage));
  
  // DHT11 Sıcaklık ve Nem
  Serial.print("Sıcaklık: ");
  Serial.print(temperature);
  Serial.print("°C | Nem: %");
  Serial.println(humidity);
  
  // Su Seviye Sensörü
  Serial.print("Su Seviyesi: %");
  Serial.print(waterPercentage);
  Serial.print(" | Durum: ");
  Serial.println(getWaterLevelStatus(waterPercentage));
  
  // Toprak Nem Sensörü
  Serial.print("Toprak Nemi: %");
  Serial.print(soilMoisturePercentage);
  Serial.print(" | Durum: ");
  Serial.println(getSoilMoistureStatus(soilMoisturePercentage));
  
  Serial.println("----------------------");
}

// Işık durumunu döndüren fonksiyon
String getLightStatus(int percentage) {
  if (percentage < 20) {
    return "Çok Karanlık";
  } else if (percentage < 40) {
    return "Karanlık";
  } else if (percentage < 60) {
    return "Normal";
  } else if (percentage < 80) {
    return "Aydınlık";
  } else {
    return "Çok Aydınlık";
  }
}

// Su seviyesi durumunu döndüren fonksiyon
String getWaterLevelStatus(int percentage) {
  if (percentage < 10) {
    return "Çok düşük";
  } else if (percentage < 30) {
    return "Düşük";
  } else if (percentage < 60) {
    return "Orta";
  } else if (percentage < 80) {
    return "Yüksek";
  } else {
    return "Çok yüksek";
  }
}

// Toprak nemi durumunu döndüren fonksiyon
String getSoilMoistureStatus(int percentage) {
  if (percentage < 20) {
    return "Çok kuru (Sulama gerekli!)";
  } else if (percentage < 40) {
    return "Kuru";
  } else if (percentage < 60) {
    return "Normal";
  } else if (percentage < 80) {
    return "Nemli";
  } else {
    return "Çok nemli";
  }
}

// Verileri sunucuya gönderme fonksiyonu
void sendDataToServer() {
  // WiFi bağlantısı yoksa gönderim yapma
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi bağlantısı yok. Veri gönderilemiyor!");
    lastSendSuccess = false;
    failedAttempts++;
    return;
  }
  
  Serial.println("Sunucuya veri gönderiliyor...");
  
  // HTTP istemcisi oluştur
  HTTPClient http;
  
  // HTTP POST isteği başlat
  http.begin(serverName);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000); // 10 saniye timeout
  
  // JSON veri belgesini oluştur
  StaticJsonDocument<256> jsonDoc;
  jsonDoc["sera_id"] = seraID;
  jsonDoc["sensor_data"] = JsonObject();
  
  // Sensör verilerini JSON'a ekle
  JsonObject sensorData = jsonDoc["sensor_data"];
  sensorData["temperature"] = temperature;
  sensorData["humidity"] = humidity;
  sensorData["light_level"] = lightPercentage;
  sensorData["soil_moisture"] = soilMoisturePercentage;
  sensorData["water_level"] = waterPercentage;
  
  // JSON verisini çıkar
  String httpRequestData;
  serializeJson(jsonDoc, httpRequestData);
  
  // POST isteğini gönder
  int httpResponseCode = http.POST(httpRequestData);
  
  // Yanıtı kontrol et
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.print("HTTP Yanıt Kodu: ");
    Serial.println(httpResponseCode);
    Serial.print("Yanıt: ");
    Serial.println(response);
    
    lastSendSuccess = true;
    failedAttempts = 0;
  } else {
    Serial.print("Hata kodu: ");
    Serial.println(httpResponseCode);
    Serial.println("Sunucuya veri gönderme başarısız oldu!");
    
    lastSendSuccess = false;
    failedAttempts++;
    
    // Başarısız gönderimden sonra, 3 veya daha fazla başarısız deneme varsa WiFi yeniden bağlanmayı dene
    if (failedAttempts >= 3) {
      Serial.println("Çok sayıda başarısız gönderim. WiFi yeniden başlatılıyor...");
      WiFi.disconnect();
      delay(1000);
      connectToWifi();
      failedAttempts = 0;
    }
  }
  
  // Bağlantıyı kapat
  http.end();
}