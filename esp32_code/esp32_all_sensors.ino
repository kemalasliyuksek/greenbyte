// ESP32 Akıllı Sera Projesi
// Gerekli kütüphaneler
#include <DHT.h>

// Sensör pinleri
#define DHT_PIN 21          // DHT11 için GPIO21 pini (WIRE_SDA olarak gösterilen pin)
#define LDR_PIN 34          // LDR için GPIO34 pini (ADC1_6)
#define MQ135_PIN 35        // MQ135 için GPIO35 pini (ADC1_7)
#define TOPRAK_NEM_PIN_ANALOG 32   // Toprak nemi analog pin (AO) - GPIO32 (ADC1_4)
#define TOPRAK_NEM_PIN_DIJITAL 25  // Toprak nemi dijital pin (DO) - GPIO25 (GPIO25/DAC1)
#define SU_SEVIYE_PIN 33    // Su seviye sensörü için GPIO33 pini (ADC1_5)

// DHT sensör tipi
#define DHT_TIP DHT11

// ADC çözünürlüğü (ESP32 için)
#define ADC_COZUNURLUK 4095  // ESP32'nin ADC çözünürlüğü (12-bit)

// MQ135 eşik değerleri - DUMAN EŞİK DEĞERİ DÜŞÜRÜLMÜŞTİR
#define DUMAN_ESIK 1500     // Duman/yangın algılama eşiği (ham değer - düşürüldü)
#define DUMAN_ARTIS_ESIK 300 // Ani artış eşiği

// DHT sensör objesi
DHT dhtSensor(DHT_PIN, DHT_TIP);

// Değişkenler
float sicaklik;         // Sıcaklık değeri (°C)
float nem;              // Nem değeri (%)
int isikSeviyesi;       // Işık seviyesi (ham ADC değeri)
int isikSeviyesiYuzde;  // Işık seviyesi (%)
int havaKalitesi;       // Hava kalitesi (ham ADC değeri)
int oncekiHavaKalitesi = 0; // Önceki ölçüm değeri
int havaKalitesiYuzde;  // Hava kalitesi (%)
float co2ppm;           // CO2 seviyesi (ppm)
bool dumanVarMi;        // Duman/yangın durumu
int toprakNemi;         // Toprak nemi (ham ADC değeri)
int toprakNemiYuzde;    // Toprak nemi (%)
bool toprakNemlimi;     // Toprak nem durumu (true=nemli, false=kuru)
int suSeviyesi;         // Su seviyesi (ham ADC değeri)
int suSeviyesiYuzde;    // Su seviyesi (%)

void setup() {
  // Serial bağlantısı başlatılıyor
  Serial.begin(115200);
  Serial.println("ESP32 Akıllı Sera Sistemi Başlatılıyor...");
  
  // DHT sensörü başlatılıyor
  dhtSensor.begin();
  
  // Toprak nemi dijital pin modu ayarlanıyor
  pinMode(TOPRAK_NEM_PIN_DIJITAL, INPUT);
  
  // ADC çözünürlüğü ayarlanıyor (ESP32 için)
  analogReadResolution(12);  // ESP32 için 12-bit çözünürlük
  
  // Kısa bir bekleme
  delay(2000);
  
  // İlk okuma
  oncekiHavaKalitesi = analogRead(MQ135_PIN);
  
  Serial.println("Sensörler hazır!");
  Serial.println("---------------------------------------------");
}

// MQ135 sensöründen CO2 PPM hesaplama (düzeltilmiş basit yaklaşım)
float hesaplaCO2PPM(int sensorDeger) {
  // Doğrudan ADC değerinden yaklaşık CO2 PPM'e dönüştürme
  // 400 ppm (temiz hava) - 2000 ppm (kirli) aralığında
  float co2ppm = map(sensorDeger, 1000, 3000, 400, 2000);
  
  // Makul aralıkta değer döndürme
  if (co2ppm < 400) co2ppm = 400; // Atmosferik minimum
  if (co2ppm > 5000) co2ppm = 5000; // Üst limit
  
  return co2ppm;
}

void loop() {
  // 1. DHT11 sensöründen sıcaklık ve nem verilerini oku
  sicaklik = dhtSensor.readTemperature();
  nem = dhtSensor.readHumidity();
  
  // DHT11 okuma hatası kontrolü
  if (isnan(sicaklik) || isnan(nem)) {
    Serial.println("DHT11 sensöründen veri okunamadı!");
  }
  
  // 2. LDR sensöründen ışık seviyesini oku (İki bacaklı LDR için)
  isikSeviyesi = analogRead(LDR_PIN);
  isikSeviyesiYuzde = map(isikSeviyesi, 0, ADC_COZUNURLUK, 0, 100);
  
  // 3. MQ135 sensöründen hava kalitesini oku
  havaKalitesi = analogRead(MQ135_PIN);
  havaKalitesiYuzde = map(havaKalitesi, 0, ADC_COZUNURLUK, 0, 100);
  
  // MQ135 CO2 PPM hesaplama
  co2ppm = hesaplaCO2PPM(havaKalitesi);
  
  // Duman/yangın kontrolü - iki koşulu kontrol ediyoruz:
  // 1. Eşik değerini geçmiş mi?
  // 2. Önceki ölçüme göre ani bir artış var mı?
  int havaKalitesiArtisi = havaKalitesi - oncekiHavaKalitesi;
  dumanVarMi = (havaKalitesi > DUMAN_ESIK || havaKalitesiArtisi > DUMAN_ARTIS_ESIK);
  
  // Önceki değeri güncelle
  oncekiHavaKalitesi = havaKalitesi;
  
  // 4. Toprak nemi sensöründen toprak nemini oku (4 pinli modül)
  // a. Analog değer okuma
  toprakNemi = analogRead(TOPRAK_NEM_PIN_ANALOG);
  toprakNemiYuzde = map(toprakNemi, ADC_COZUNURLUK, 0, 0, 100);  // Değer ters çevriliyor
  
  // b. Dijital değer okuma (eşik değerini aşıp aşmadığı)
  toprakNemlimi = !digitalRead(TOPRAK_NEM_PIN_DIJITAL); // NOT operatörü ile tersini alıyoruz (LOW=nemli, HIGH=kuru)
  
  // 5. Su seviye sensöründen su seviyesini oku
  suSeviyesi = analogRead(SU_SEVIYE_PIN);
  suSeviyesiYuzde = map(suSeviyesi, 0, ADC_COZUNURLUK, 0, 100);
  
  // Tüm verileri ekrana yazdır
  Serial.println("============ SERA DURUM BİLGİLERİ ============");
  
  // Sıcaklık ve Nem Bilgisi
  Serial.print("Sıcaklık: ");
  Serial.print(sicaklik);
  Serial.println(" °C");
  
  Serial.print("Nem: ");
  Serial.print(nem);
  Serial.println(" %");
  
  // Işık Seviyesi
  Serial.print("Işık Seviyesi: ");
  Serial.print(isikSeviyesiYuzde);
  Serial.print(" % (Ham Değer: ");
  Serial.print(isikSeviyesi);
  Serial.println(")");
  
  // Hava Kalitesi ve CO2
  Serial.print("Hava Kalitesi: ");
  Serial.print(havaKalitesiYuzde);
  Serial.print(" % (Ham Değer: ");
  Serial.print(havaKalitesi);
  Serial.println(")");
  
  Serial.print("Hava Kalitesi Değişimi: ");
  Serial.println(havaKalitesiArtisi);
  
  Serial.print("CO2 Seviyesi: ");
  Serial.print(co2ppm, 0);  // Ondalık basamak olmadan
  Serial.println(" ppm");
  
  Serial.print("Duman/Yangın Durumu: ");
  if (dumanVarMi) {
    Serial.println("DİKKAT! DUMAN ALGILANDI!");
  } else {
    Serial.println("Normal");
  }
  
  // Toprak Nemi (Analog ve Dijital)
  Serial.print("Toprak Nemi: ");
  Serial.print(toprakNemiYuzde);
  Serial.print(" % (Ham Değer: ");
  Serial.print(toprakNemi);
  Serial.println(")");
  
  Serial.print("Toprak Durum: ");
  if (toprakNemlimi) {
    Serial.println("NEMLİ (Sulama Gerekmiyor)");
  } else {
    Serial.println("KURU (Sulama Gerekiyor)");
  }
  
  // Su Seviyesi
  Serial.print("Su Seviyesi: ");
  Serial.print(suSeviyesiYuzde);
  Serial.print(" % (Ham Değer: ");
  Serial.print(suSeviyesi);
  Serial.println(")");
  
  Serial.println("=============================================");
  Serial.println();
  
  // 5 saniye bekle
  delay(5000);
}