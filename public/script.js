// Global değişkenler
let tempHumidityChart;
let waterLevelHistoryChart;
let historyChart;

// Aktivite log verisi - varsayılan olarak boş
let activityLogs = [];

// API URL'leri
const API_BASE_URL = window.location.protocol + "//" + window.location.hostname + "/greenbyte/api";
// veya mutlak yolu kullanabilirsiniz:
// const API_BASE_URL = "http://kemalasliyuksek.com/greenbyte/api";
const LATEST_DATA_URL = `${API_BASE_URL}/get_latest_data.php`;
const HISTORICAL_DATA_URL = `${API_BASE_URL}/get_historical_data.php`;

// Zaman etiketleri - API'den alınacak
let timeLabels = [];

/**
 * Sensör değerlerini manuel olarak güncellemek için kullanılabilecek fonksiyon
 * @param {string} sensorType - Sensör tipi (temperature, humidity, vs.)
 * @param {number|array} value - Sensör değeri
 */
function updateSensorValue(sensorType, value) {
    // Ayarları güncellemek için kullanılan bir fonksiyon
    
    showNotification(`${sensorType} ayarı ${value} olarak güncellendi`, 'success');
    
    // Aktivite log'a ekle
    addActivityLog(`${capitalizeFirstLetter(sensorType)} ayarı değiştirildi`, 'Tamamlandı');
}

/**
 * Sensör verilerini API'den alan fonksiyon
 */
async function fetchSensorData() {
    try {
        // Sera ID'si
        const seraID = 1;
        
        console.log(`Veri alınıyor: ${LATEST_DATA_URL}?seraID=${seraID}`);
        
        // En son sensör verilerini al
        const response = await fetch(`${LATEST_DATA_URL}?seraID=${seraID}`);
        
        if (!response.ok) {
            console.error(`HTTP hata kodu: ${response.status}`);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Alınan veri:", data);
        
        // Eğer verilerde hata varsa, bir hata fırlat
        if (!data.success && data.message) {
            throw new Error(data.message);
        }
        
        // Verileri döndür
        return {
            temperature: data.temperature ? data.temperature.value : null,
            humidity: data.humidity ? data.humidity.value : null,
            soilMoisture: data.soilMoisture ? data.soilMoisture.value : null,
            lightLevel: data.lightLevel ? data.lightLevel.value : null,
            waterLevel: data.waterLevel ? data.waterLevel.value : null,
            lastUpdated: data.temperature ? new Date(data.temperature.timestamp) : new Date()
        };
    } catch (error) {
        console.error('Sensör verilerini alma hatası:', error);
        showNotification(`Veri alma hatası: ${error.message}`, 'danger');
        
        // Hata durumunda null döndür (veriler mevcut değil)
        return {
            temperature: null,
            humidity: null,
            soilMoisture: null,
            lightLevel: null,
            waterLevel: null,
            lastUpdated: new Date()
        };
    }
}

/**
 * Geçmiş sensör verilerini API'den alan fonksiyon
 */
async function fetchHistoricalData() {
    try {
        // Sera ID'si
        const seraID = 1;
        
        // Son 24 saatin verilerini al
        const hours = 24;
        console.log(`Geçmiş veriler alınıyor: ${HISTORICAL_DATA_URL}?seraID=${seraID}&hours=${hours}&type=all`);
        
        const response = await fetch(`${HISTORICAL_DATA_URL}?seraID=${seraID}&hours=${hours}&type=all`);
        
        if (!response.ok) {
            console.error(`HTTP hata kodu: ${response.status}`);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Alınan geçmiş veriler:", data);
        
        // Boş diziler oluştur - varsayılan olarak boş olsun
        let tempHistory = [];
        let humidityHistory = [];
        let waterLevelHistory = [];
        let lightLevelHistory = [];
        let soilMoistureHistory = [];
        
        // Eğer veri varsa, sıcaklık geçmişini güncelle
        if (data.temperature && data.temperature.length > 0) {
            tempHistory = data.temperature.map(item => item.value);
        }
        
        // Eğer API'den gelen humidity verisi varsa işle
        if (data.humidity && data.humidity.length > 0) {
            humidityHistory = data.humidity.map(item => item.value);
        }
        
        if (data.waterLevel && data.waterLevel.length > 0) {
            waterLevelHistory = data.waterLevel.map(item => item.value);
        }
        
        if (data.lightLevel && data.lightLevel.length > 0) {
            lightLevelHistory = data.lightLevel.map(item => item.value);
        }
        
        if (data.soilMoisture && data.soilMoisture.length > 0) {
            soilMoistureHistory = data.soilMoisture.map(item => item.value);
        }
        
        // Zaman etiketlerini güncelle
        if (data.temperature && data.temperature.length > 0) {
            // Zaman etiketlerini güncelle
            timeLabels = [];
            
            data.temperature.forEach(item => {
                const date = new Date(item.timestamp);
                const hours = date.getHours().toString().padStart(2, '0');
                const minutes = date.getMinutes().toString().padStart(2, '0');
                timeLabels.push(`${hours}:${minutes}`);
            });
        } else {
            // Varsayılan zaman etiketleri
            timeLabels = ['00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];
        }
        
        console.log("İşlenmiş veriler:", {
            tempHistory: tempHistory.length,
            humidityHistory: humidityHistory.length,
            timeLabels: timeLabels.length
        });
        
        // Veri dizilerinin boyutlarını kontrol et ve eşitle
        const maxLength = Math.max(tempHistory.length, humidityHistory.length);
        if (maxLength > 0) {
            // Zaman etiketlerini veri sayısıyla eşleştir
            while (timeLabels.length < maxLength) {
                // Eksik zaman etiketlerini varsayılan değerlerle doldur
                timeLabels.push("");
            }
            // Fazla zaman etiketlerini kırp
            if (timeLabels.length > maxLength) {
                timeLabels = timeLabels.slice(0, maxLength);
            }
        }
        
        // Veri olmadığında boş diziler döndür
        return {
            tempHistory: tempHistory,
            humidityHistory: humidityHistory,
            waterLevelHistory: waterLevelHistory,
            lightLevelHistory: lightLevelHistory,
            soilMoistureHistory: soilMoistureHistory
        };
    } catch (error) {
        console.error('Geçmiş verileri alma hatası:', error);
        showNotification(`Geçmiş verileri alma hatası: ${error.message}`, 'danger');
        
        // Hata durumunda boş diziler döndür
        return {
            tempHistory: [],
            humidityHistory: [],
            waterLevelHistory: [],
            lightLevelHistory: [],
            soilMoistureHistory: []
        };
    }
}

/**
 * Seçilen periyoda göre geçmiş verileri getiren fonksiyon
 */
async function fetchHistoricalDataByPeriod() {
    const period = document.getElementById('historyPeriod').value;
    const type = document.getElementById('historyType').value;
    
    try {
        // Sera ID'si
        const seraID = 1;
        
        console.log(`Geçmiş veriler alınıyor: ${HISTORICAL_DATA_URL}?seraID=${seraID}&hours=${period}&type=${type}`);
        
        const response = await fetch(`${HISTORICAL_DATA_URL}?seraID=${seraID}&hours=${period}&type=${type}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Verileri işle ve grafiği güncelle
        updateHistoryChart(data, type);
        
        showNotification('Geçmiş veriler başarıyla alındı', 'success');
    } catch (error) {
        console.error('Geçmiş verileri alma hatası:', error);
        showNotification(`Geçmiş verileri alma hatası: ${error.message}`, 'danger');
    }
}

/**
 * Geçmiş veri grafiğini güncelleyen fonksiyon
 * @param {Object} data - Geçmiş veriler
 * @param {string} type - Veri tipi
 */
function updateHistoryChart(data, type) {
    const canvas = document.getElementById('historyChart');
    if (!canvas) return;
    
    // Canvas kontekstini al
    const ctx = canvas.getContext('2d');
    
    // Eski grafiği temizle
    if (historyChart) {
        historyChart.destroy();
    }
    
    // Veri setlerini oluştur
    const datasets = [];
    const labels = [];
    
    // Zaman etiketlerini oluştur
    if (data.temperature && data.temperature.length > 0) {
        data.temperature.forEach(item => {
            const date = new Date(item.timestamp);
            labels.push(formatDateTime(date));
        });
    }
    
    // Veri tipi "all" ise tüm verileri ekle
    if (type === 'all' || type === 'temperature') {
        if (data.temperature && data.temperature.length > 0) {
            datasets.push({
                label: 'Sıcaklık (°C)',
                data: data.temperature.map(item => item.value),
                borderColor: '#F44336',
                backgroundColor: 'rgba(244, 67, 54, 0.1)',
                tension: 0.4,
                fill: false
            });
        }
    }
    
    if (type === 'all' || type === 'humidity') {
        if (data.humidity && data.humidity.length > 0) {
            datasets.push({
                label: 'Nem (%)',
                data: data.humidity.map(item => item.value),
                borderColor: '#2196F3',
                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                tension: 0.4,
                fill: false
            });
        }
    }
    
    if (type === 'all' || type === 'light') {
        if (data.lightLevel && data.lightLevel.length > 0) {
            datasets.push({
                label: 'Işık Seviyesi (%)',
                data: data.lightLevel.map(item => item.value),
                borderColor: '#FFC107',
                backgroundColor: 'rgba(255, 193, 7, 0.1)',
                tension: 0.4,
                fill: false
            });
        }
    }
    
    if (type === 'all' || type === 'soil') {
        if (data.soilMoisture && data.soilMoisture.length > 0) {
            datasets.push({
                label: 'Toprak Nemi (%)',
                data: data.soilMoisture.map(item => item.value),
                borderColor: '#4CAF50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                tension: 0.4,
                fill: false
            });
        }
    }
    
    if (type === 'all' || type === 'water') {
        if (data.waterLevel && data.waterLevel.length > 0) {
            datasets.push({
                label: 'Su Seviyesi (%)',
                data: data.waterLevel.map(item => item.value),
                borderColor: '#00BCD4',
                backgroundColor: 'rgba(0, 188, 212, 0.1)',
                tension: 0.4,
                fill: false
            });
        }
    }
    
    // Eğer veri yoksa, bir mesaj göster
    if (datasets.length === 0) {
        showNotification('Seçilen periyod için veri bulunamadı', 'warning');
        return;
    }
    
    // Grafiği oluştur
    historyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    position: 'top',
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        stepSize: 10
                    }
                }
            }
        }
    });
}

/**
 * Bitki bilgilerini veritabanından alan fonksiyon
 */
async function fetchPlantData() {
    try {
        // Sera ID'si
        const seraID = 1;
        
        // API endpoint (örnek)
        const PLANT_URL = `${API_BASE_URL}/get_plant_data.php?seraID=${seraID}`;
        
        // Bu işlev gerçekte veritabanından veri alacak, ancak şu anda örnek veri döndürüyoruz
        // Gerçek implementasyonda bu kısmı API isteği ile değiştirin
        return [
            {
                id: 1,
                tur: "Domates",
                bolge: "Bölge A",
                ekim_tarihi: "2025-01-15",
                gelisim_yuzdesi: 75,
                tahmini_hasat: "2025-04-02"
            },
            {
                id: 2,
                tur: "Salatalık",
                bolge: "Bölge B",
                ekim_tarihi: "2025-02-05",
                gelisim_yuzdesi: 65,
                tahmini_hasat: "2025-04-10"
            },
            {
                id: 3,
                tur: "Biber",
                bolge: "Bölge C",
                ekim_tarihi: "2025-01-01",
                gelisim_yuzdesi: 90,
                tahmini_hasat: "2025-03-22"
            }
        ];
    } catch (error) {
        console.error('Bitki verilerini alma hatası:', error);
        showNotification(`Bitki verilerini alma hatası: ${error.message}`, 'danger');
        
        // Hata durumunda boş dizi döndür
        return [];
    }
}

/**
 * Bitki durumu sayfasını güncelleyen fonksiyon
 */
async function updatePlantStatusPage() {
    const container = document.getElementById('bitki-durum-container');
    if (!container) return;
    
    // Bitki verilerini al
    const bitkiler = await fetchPlantData();
    
    if (bitkiler.length === 0) {
        container.innerHTML = `
            <div class="col-12">
                <div class="dashboard-card">
                    <h5>Bitki Bilgisi Bulunamadı</h5>
                    <p>Sisteme kayıtlı bitki bulunmamaktadır.</p>
                </div>
            </div>
        `;
        return;
    }
    
    // Her bitki türü için içerik oluştur
    let html = '';
    
    bitkiler.forEach(bitki => {
        const gunSayisi = Math.ceil((new Date(bitki.tahmini_hasat) - new Date()) / (1000 * 60 * 60 * 24));
        
        html += `
            <div class="col-lg-4">
                <div class="dashboard-card">
                    <h5>${bitki.tur} Durumu (${bitki.bolge})</h5>
                    <div class="mt-4">
                        <div class="row align-items-center mb-4">
                            <div class="col-md-4 text-center">
                                <i class="fas fa-seedling fa-4x text-success mb-3"></i>
                            </div>
                            <div class="col-md-8">
                                <ul class="list-unstyled">
                                    <li><i class="fas fa-calendar me-2"></i> Ekim: ${formatDate(bitki.ekim_tarihi)}</li>
                                    <li><i class="fas fa-percentage me-2"></i> Gelişim: %${bitki.gelisim_yuzdesi}</li>
                                    <li><i class="fas fa-harvest me-2"></i> Tahmini Hasat: ${formatDate(bitki.tahmini_hasat)}</li>
                                    <li><i class="fas fa-clock me-2"></i> Kalan: ${gunSayisi} gün</li>
                                </ul>
                            </div>
                        </div>
                        <div class="progress">
                            <div class="progress-bar" role="progressbar" style="width: ${bitki.gelisim_yuzdesi}%" 
                                aria-valuenow="${bitki.gelisim_yuzdesi}" aria-valuemin="0" aria-valuemax="100"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

/**
 * Dashboard'daki bitki gelişim durumu kartını güncelleyen fonksiyon
 */
async function updatePlantGrowthCard() {
    const container = document.getElementById('bitki-gelistirme-container');
    if (!container) return;
    
    // Bitki verilerini al
    const bitkiler = await fetchPlantData();
    
    if (bitkiler.length === 0) {
        container.innerHTML = `<div class="mb-3"><small>Kayıtlı bitki bulunamadı</small></div>`;
        return;
    }
    
    let html = '';
    
    bitkiler.forEach(bitki => {
        const gunSayisi = Math.ceil((new Date(bitki.tahmini_hasat) - new Date()) / (1000 * 60 * 60 * 24));
        
        html += `
            <div class="mb-3">
                <small>${bitki.tur} (${bitki.bolge})</small>
                <div class="progress">
                    <div class="progress-bar" role="progressbar" style="width: ${bitki.gelisim_yuzdesi}%" 
                        aria-valuenow="${bitki.gelisim_yuzdesi}" aria-valuemin="0" aria-valuemax="100"></div>
                </div>
                <div class="d-flex justify-content-between">
                    <small>Büyüme: %${bitki.gelisim_yuzdesi}</small>
                    <small>Est. Hasat: ${gunSayisi} gün</small>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

/**
 * Dashboard'u sensör verileriyle güncelleyen fonksiyon
 * @param {Object} data - Sensör verileri
 */
function updateDashboard(data) {
    if (!data) return;
    
    // Temel sensör kartlarını güncelle
    updateSensorCard('temp', data.temperature, '°C');
    updateSensorCard('humidity', data.humidity, '%');
    updateSensorCard('light', data.lightLevel, ' lux');
    updateSensorCard('soil', data.soilMoisture, '%');
    
    // Su seviyesi göstergesini güncelle
    updateWaterLevelGauge(data.waterLevel);
    
    // CO2 seviyesini güncelle (ESP32 kodundan gelen değer - simüle edilmiş)
    updateCO2Gauge(data.lightLevel ? (data.lightLevel * 10) + 400 : null);
    
    // Sıcaklık ve Nem sayfalarındaki mevcut değerleri güncelle
    updateSensorDisplayPage('temperature', data.temperature, '°C', data.lastUpdated);
    updateSensorDisplayPage('humidity', data.humidity, '%', data.lastUpdated);
    updateSensorDisplayPage('water-level', data.waterLevel, '%', data.lastUpdated);
    updateSensorDisplayPage('light-level', data.lightLevel, ' lux', data.lastUpdated);
    
    // Sistem durumunu güncelle
    updateSystemStatus(data);
    
    // Uyarıları güncelle
    updateAlerts(data);
}

/**
 * Sensör kartını güncelleyen yardımcı fonksiyon
 * @param {string} sensorId - Sensör ID'si (HTML ID'si)
 * @param {number} value - Sensör değeri
 * @param {string} unit - Birim (°C, %, lux, vb.)
 */
function updateSensorCard(sensorId, value, unit) {
    const valueElement = document.getElementById(`${sensorId}-value`);
    const changeElement = document.getElementById(`${sensorId}-change`);
    
    if (!valueElement) return;
    
    if (value !== null && value !== undefined) {
        // Sayısal değer göster
        valueElement.textContent = typeof value === 'number' ? 
            value.toFixed(1) + unit : 
            value + unit;
            
        // Değişim bilgisini gizle/göster
        if (changeElement) {
            changeElement.innerHTML = `<i class="fas fa-sync-alt"></i> <span>Güncel</span>`;
        }
    } else {
        // Veri yoksa belirsiz göster
        valueElement.textContent = `--${unit}`;
        
        if (changeElement) {
            changeElement.innerHTML = `<i class="fas fa-exclamation-circle"></i> <span>Veri yok</span>`;
        }
    }
}

/**
 * Sayfa sensör değerlerini güncelleyen yardımcı fonksiyon
 * @param {string} sensorId - Sensör ID'si (HTML ID'si)
 * @param {number} value - Sensör değeri
 * @param {string} unit - Birim (°C, %, lux, vb.)
 * @param {Date} lastUpdated - Son güncelleme zamanı
 */
function updateSensorDisplayPage(sensorId, value, unit, lastUpdated) {
    const displayElement = document.getElementById(`${sensorId}-display`);
    const lastUpdateElement = document.getElementById(`${sensorId}-last-update`);
    
    if (!displayElement || !lastUpdateElement) return;
    
    if (value !== null && value !== undefined) {
        // Sayısal değer göster
        displayElement.textContent = typeof value === 'number' ? 
            value.toFixed(1) + unit : 
            value + unit;
        
        // Son güncelleme zamanını göster
        lastUpdateElement.textContent = `Son Güncelleme: ${formatDateTime(lastUpdated)}`;
    } else {
        // Veri yoksa belirsiz göster
        displayElement.textContent = `--${unit}`;
        lastUpdateElement.textContent = `Son Güncelleme: Veri yok`;
    }
}

/**
 * CO2 seviyesi göstergesini güncelleyen fonksiyon
 * @param {number} co2Level - CO2 seviyesi (ppm)
 */
function updateCO2Gauge(co2Level) {
    const co2Fill = document.getElementById('co2Fill');
    const co2Indicator = document.getElementById('co2Indicator');
    const co2Value = document.getElementById('co2-value');
    
    if (!co2Fill || !co2Indicator || !co2Value) return;
    
    if (co2Level !== null && co2Level !== undefined) {
        // CO2 seviyesi değerini ayarla (400-2000 ppm aralığında)
        const co2Percentage = Math.min(Math.max((co2Level - 400) / 1600, 0), 1) * 100;
        const co2Angle = (co2Percentage / 100) * 180;
        
        co2Fill.style.height = `${co2Percentage}%`;
        co2Indicator.style.transform = `rotate(${co2Angle}deg)`;
        co2Value.textContent = `${Math.round(co2Level)} ppm`;
    } else {
        // Veri yoksa belirsiz göster
        co2Fill.style.height = '0%';
        co2Indicator.style.transform = 'rotate(0deg)';
        co2Value.textContent = `-- ppm`;
    }
}

/**
 * Su seviyesi göstergesini güncelleyen fonksiyon
 * @param {number} waterLevel - Su seviyesi (%)
 */
function updateWaterLevelGauge(waterLevel) {
    const waterLevelFill = document.getElementById('waterLevelFill');
    const waterLevelIndicator = document.getElementById('waterLevelIndicator');
    const waterLevelValue = document.getElementById('water-level-value');
    const waterLevelStatus = document.getElementById('water-level-status');
    const waterLevelAlert = document.getElementById('water-level-alert');
    
    if (!waterLevelFill || !waterLevelIndicator || !waterLevelValue || !waterLevelStatus) return;
    
    if (waterLevel !== null && waterLevel !== undefined) {
        // Su seviyesi değerini ayarla
        const waterLevelPercentage = Math.min(Math.max(waterLevel, 0), 100);
        const waterLevelAngle = (waterLevelPercentage / 100) * 180;
        
        waterLevelFill.style.height = `${waterLevelPercentage}%`;
        waterLevelIndicator.style.transform = `rotate(${waterLevelAngle}deg)`;
        waterLevelValue.textContent = `${waterLevelPercentage.toFixed(0)}%`;
        
        // Su seviyesi durumunu belirle
        let status = getWaterLevelStatus(waterLevelPercentage);
        let statusClass = '';
        
        if (waterLevelPercentage < 20) {
            statusClass = 'text-danger';
        } else if (waterLevelPercentage < 40) {
            statusClass = 'text-warning';
        } else {
            statusClass = 'text-success';
        }
        
        waterLevelStatus.innerHTML = `Durum: <span class="${statusClass}">${status}</span>`;
        
        // Su seviyesi uyarısını güncelle
        if (waterLevelAlert) {
            if (waterLevelPercentage < 20) {
                waterLevelAlert.className = 'alert alert-danger';
                waterLevelAlert.innerHTML = `<strong>Kritik:</strong> Su seviyesi çok düşük (%${waterLevelPercentage.toFixed(0)}). Acilen doldurun!`;
            } else if (waterLevelPercentage < 40) {
                waterLevelAlert.className = 'alert alert-warning';
                waterLevelAlert.innerHTML = `<strong>Uyarı:</strong> Su seviyesi düşük (%${waterLevelPercentage.toFixed(0)}). Yakında doldurulması gerekebilir.`;
            } else {
                waterLevelAlert.className = 'alert alert-success';
                waterLevelAlert.innerHTML = `<strong>Normal:</strong> Su seviyesi yeterli (%${waterLevelPercentage.toFixed(0)}).`;
            }
        }
        
        // Su sistemi durumunu güncelle
        const waterSystemStatus = document.getElementById('water-system-status');
        if (waterSystemStatus) {
            waterSystemStatus.className = `status-indicator ${waterLevelPercentage < 30 ? 'status-warning' : 'status-active'}`;
        }
    } else {
        // Veri yoksa belirsiz göster
        waterLevelFill.style.height = '0%';
        waterLevelIndicator.style.transform = 'rotate(0deg)';
        waterLevelValue.textContent = `--%`;
        waterLevelStatus.textContent = `Durum: Veri alınamıyor`;
        
        if (waterLevelAlert) {
            waterLevelAlert.className = 'alert alert-info';
            waterLevelAlert.innerHTML = 'Su seviyesi bilgisi yükleniyor...';
        }
    }
}

/**
 * Su seviyesi durumunu döndüren fonksiyon
 * @param {number} percentage - Su seviyesi (%)
 * @returns {string} - Su seviyesi durumu
 */
function getWaterLevelStatus(percentage) {
    if (percentage < 10) {
        return "Çok Düşük";
    } else if (percentage < 30) {
        return "Düşük";
    } else if (percentage < 60) {
        return "Orta";
    } else if (percentage < 80) {
        return "Yüksek";
    } else {
        return "Çok Yüksek";
    }
}

/**
 * Sistem durumunu sensör verilerine göre güncelleyen fonksiyon
 * @param {Object} data - Sensör verileri
 */
function updateSystemStatus(data) {
    // Sulama sistemi durumunu güncelle
    if (data.waterLevel !== null && data.waterLevel !== undefined) {
        const waterSystemStatus = document.getElementById('water-system-status');
        if (waterSystemStatus) {
            if (data.waterLevel < 20) {
                waterSystemStatus.className = 'status-indicator status-danger';
            } else if (data.waterLevel < 40) {
                waterSystemStatus.className = 'status-indicator status-warning';
            } else {
                waterSystemStatus.className = 'status-indicator status-active';
            }
        }
    }
}

/**
 * Uyarıları sensör verilerine göre güncelleyen fonksiyon
 * @param {Object} data - Sensör verileri
 */
function updateAlerts(data) {
    const alertsContainer = document.getElementById('alerts-container');
    if (!alertsContainer) return;
    
    // Uyarıları temizle
    alertsContainer.innerHTML = '';
    
    // Su seviyesi uyarısı
    if (data.waterLevel !== null && data.waterLevel !== undefined) {
        if (data.waterLevel < 20) {
            addAlert('warning', 'Düşük Su Seviyesi', `Su deposu seviyesi %${data.waterLevel.toFixed(0)}'e düştü. Lütfen depoyu doldurun.`);
        }
    }
    
    // Toprak nemi uyarısı
    if (data.soilMoisture !== null && data.soilMoisture !== undefined) {
        if (data.soilMoisture < 30) {
            addAlert('warning', 'Düşük Toprak Nemi', `Toprak nem seviyesi %${data.soilMoisture.toFixed(0)}. Sulama gerekli olabilir.`);
        }
    }
    
    // Sıcaklık uyarısı
    if (data.temperature !== null && data.temperature !== undefined) {
        if (data.temperature > 30) {
            addAlert('danger', 'Yüksek Sıcaklık', `Sera sıcaklığı ${data.temperature.toFixed(1)}°C. Havalandırma gerekli olabilir.`);
        } else if (data.temperature < 15) {
            addAlert('warning', 'Düşük Sıcaklık', `Sera sıcaklığı ${data.temperature.toFixed(1)}°C. Isıtma gerekli olabilir.`);
        }
    }
    
    // Nem uyarısı
    if (data.humidity !== null && data.humidity !== undefined) {
        if (data.humidity > 80) {
            addAlert('warning', 'Yüksek Nem', `Sera nem seviyesi %${data.humidity.toFixed(0)}. Havalandırma gerekli olabilir.`);
        } else if (data.humidity < 40) {
            addAlert('warning', 'Düşük Nem', `Sera nem seviyesi %${data.humidity.toFixed(0)}. Nemlendirme gerekli olabilir.`);
        }
    }
    
    // Hiç uyarı yoksa ve veriler geliyorsa
    if (alertsContainer.innerHTML === '' && data.temperature !== null) {
        addAlert('success', 'Sistem Normal', 'Tüm sensör verileri normal aralıkta. Sistemde herhangi bir sorun tespit edilmedi.');
    }
    
    // Hiç veri yoksa
    if (data.temperature === null && data.humidity === null && data.soilMoisture === null && 
        data.lightLevel === null && data.waterLevel === null) {
        addAlert('info', 'Veri Alınamıyor', 'Sensör verileri alınamıyor. Lütfen bağlantıları kontrol edin.');
    }
}

/**
 * Uyarı ekleyen yardımcı fonksiyon
 * @param {string} type - Uyarı tipi (success, info, warning, danger)
 * @param {string} title - Uyarı başlığı
 * @param {string} message - Uyarı mesajı
 */
function addAlert(type, title, message) {
    const alertsContainer = document.getElementById('alerts-container');
    if (!alertsContainer) return;
    
    const icon = getAlertIcon(type);
    
    const alertHTML = `
        <div class="alert alert-${type} d-flex align-items-center">
            <i class="${icon} me-2"></i>
            <div>
                <strong>${title}:</strong> ${message}
            </div>
        </div>
    `;
    
    alertsContainer.innerHTML += alertHTML;
}

/**
 * Uyarı tipine göre ikon döndüren yardımcı fonksiyon
 * @param {string} type - Uyarı tipi
 * @returns {string} - İkon sınıf adı
 */
function getAlertIcon(type) {
    switch (type) {
        case 'success':
            return 'fas fa-check-circle';
        case 'info':
            return 'fas fa-info-circle';
        case 'warning':
            return 'fas fa-exclamation-triangle';
        case 'danger':
            return 'fas fa-exclamation-circle';
        default:
            return 'fas fa-info-circle';
    }
}

/**
 * Aktivite log'a yeni bir kayıt ekleyen fonksiyon
 * @param {string} action - İşlem
 * @param {string} status - Durum
 */
function addActivityLog(action, status = 'Tamamlandı') {
    const now = new Date();
    const formattedDate = formatDateTime(now);
    
    const newLog = {
        date: formattedDate,
        action: action,
        status: status
    };
    
    // Log'a ekle (en fazla 10 kayıt)
    activityLogs.unshift(newLog);
    if (activityLogs.length > 10) {
        activityLogs.pop();
    }
    
    // Log tablosunu güncelle
    updateActivityLogTable();
}

/**
 * Aktivite log tablosunu güncelleyen fonksiyon
 */
function updateActivityLogTable() {
    const activityLogTable = document.getElementById('activity-log');
    if (!activityLogTable) return;
    
    if (activityLogs.length === 0) {
        activityLogTable.innerHTML = '<tr><td colspan="3" class="text-center">Henüz aktivite kaydı yok</td></tr>';
        return;
    }
    
    let html = '';
    activityLogs.forEach(log => {
        let statusBadge = '';
        
        switch (log.status.toLowerCase()) {
            case 'tamamlandı':
                statusBadge = '<span class="badge bg-success">Tamamlandı</span>';
                break;
            case 'bekliyor':
                statusBadge = '<span class="badge bg-warning">Bekliyor</span>';
                break;
            case 'hata':
                statusBadge = '<span class="badge bg-danger">Hata</span>';
                break;
            default:
                statusBadge = `<span class="badge bg-secondary">${log.status}</span>`;
        }
        
        html += `
            <tr>
                <td>${log.date}</td>
                <td>${log.action}</td>
                <td>${statusBadge}</td>
            </tr>
        `;
    });
    
    activityLogTable.innerHTML = html;
}

/**
 * Grafikleri güncelleyen fonksiyon
 * @param {Object} historicalData - Geçmiş veriler
 */
function updateCharts(historicalData) {
    if (!historicalData) return;
    
    // Sıcaklık ve Nem grafiğini güncelle
    if (tempHumidityChart) {
        tempHumidityChart.data.labels = timeLabels;
        tempHumidityChart.data.datasets[0].data = historicalData.tempHistory;
        tempHumidityChart.data.datasets[1].data = historicalData.humidityHistory;
        tempHumidityChart.update();
    }
    
    // Su seviyesi geçmiş grafiğini güncelle
    if (waterLevelHistoryChart) {
        waterLevelHistoryChart.data.labels = timeLabels;
        waterLevelHistoryChart.data.datasets[0].data = historicalData.waterLevelHistory;
        waterLevelHistoryChart.update();
    }
}

/**
 * Ekran boyutuna göre sidebar'ı otomatik ayarlama fonksiyonu
 */
function checkScreenSize() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    const topbar = document.querySelector('.topbar');
    
    if (!sidebar || !mainContent || !topbar) return;
    
    if (window.innerWidth < 992) {
        // Küçük ekranlarda sidebar'ı daralt
        if (sidebar.style.width === '250px' || sidebar.style.width === '') {
            sidebar.style.width = '70px';
            mainContent.style.marginLeft = '70px';
            topbar.style.width = 'calc(100% - 70px)';
            topbar.style.left = '70px';
            
            // Metin elemanlarını gizle
            document.querySelectorAll('.sidebar-brand h2, .sidebar-item span').forEach(item => {
                item.style.display = 'none';
            });
            
            // Sidebar içeriğini ortala
            document.querySelectorAll('.sidebar-item').forEach(item => {
                item.style.justifyContent = 'center';
                item.style.padding = '0.7rem';
            });
            
            // İkonları düzenle
            document.querySelectorAll('.sidebar-item i').forEach(icon => {
                icon.style.marginRight = '0';
            });
            
            // Marka alanını düzenle
            const brand = document.querySelector('.sidebar-brand');
            if (brand) {
                brand.style.justifyContent = 'center';
            }
        }
    } else {
        // Büyük ekranlarda sidebar'ı genişlet
        if (sidebar.style.width === '70px') {
            sidebar.style.width = '250px';
            mainContent.style.marginLeft = '250px';
            topbar.style.width = 'calc(100% - 250px)';
            topbar.style.left = '250px';
            
            // Metin elemanlarını göster
            document.querySelectorAll('.sidebar-brand h2, .sidebar-item span').forEach(item => {
                item.style.display = 'block';
            });
            
            // Sidebar içeriğini düzenle
            document.querySelectorAll('.sidebar-item').forEach(item => {
                item.style.justifyContent = 'flex-start';
                item.style.padding = '0.7rem 1.5rem';
            });
            
            // İkonları düzenle
            document.querySelectorAll('.sidebar-item i').forEach(icon => {
                icon.style.marginRight = '10px';
            });
            
            // Marka alanını düzenle
            const brand = document.querySelector('.sidebar-brand');
            if (brand) {
                brand.style.justifyContent = 'flex-start';
            }
        }
    }
}

/**
 * Navbar toggle fonksiyonu
 */
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    const topbar = document.querySelector('.topbar');
    
    if (!sidebar || !mainContent || !topbar) return;
    
    if (sidebar.style.width === '250px' || sidebar.style.width === '') {
        sidebar.style.width = '70px';
        mainContent.style.marginLeft = '70px';
        topbar.style.width = 'calc(100% - 70px)';
        topbar.style.left = '70px';
        
        // Metin elemanlarını gizle
        document.querySelectorAll('.sidebar-brand h2, .sidebar-item span').forEach(item => {
            item.style.display = 'none';
        });
        
        // Sidebar içeriğini ortala
        document.querySelectorAll('.sidebar-item').forEach(item => {
            item.style.justifyContent = 'center';
            item.style.padding = '0.7rem';
        });
        
        // İkonları düzenle
        document.querySelectorAll('.sidebar-item i').forEach(icon => {
            icon.style.marginRight = '0';
        });
        
        // Marka alanını düzenle
        const brand = document.querySelector('.sidebar-brand');
        if (brand) {
            brand.style.justifyContent = 'center';
        }
    } else {
        sidebar.style.width = '250px';
        mainContent.style.marginLeft = '250px';
        topbar.style.width = 'calc(100% - 250px)';
        topbar.style.left = '250px';
        
        // Metin elemanlarını göster
        document.querySelectorAll('.sidebar-brand h2, .sidebar-item span').forEach(item => {
            item.style.display = 'block';
        });
        
        // Sidebar içeriğini düzenle
        document.querySelectorAll('.sidebar-item').forEach(item => {
            item.style.justifyContent = 'flex-start';
            item.style.padding = '0.7rem 1.5rem';
        });
        
        // İkonları düzenle
        document.querySelectorAll('.sidebar-item i').forEach(icon => {
            icon.style.marginRight = '10px';
        });
        
        // Marka alanını düzenle
        const brand = document.querySelector('.sidebar-brand');
        if (brand) {
            brand.style.justifyContent = 'flex-start';
        }
    }
}

/**
 * Başlangıç setup fonksiyonu
 */
function initDashboard() {
    // Sidebar toggle
    const toggleMenuButton = document.querySelector('.toggle-menu');
    if (toggleMenuButton) {
        toggleMenuButton.addEventListener('click', function() {
            toggleSidebar();
        });
    }
    
    // Topbar'ın genişliğini ayarla
    const sidebar = document.querySelector('.sidebar');
    const topbar = document.querySelector('.topbar');
    if (sidebar && topbar) {
        topbar.style.width = `calc(100% - ${sidebar.offsetWidth}px)`;
        topbar.style.left = `${sidebar.offsetWidth}px`;
    }
    
    // Manuel su doldurma butonuna tıklama olayı ekle
    const manualWaterFillButton = document.getElementById('manual-water-fill');
    if (manualWaterFillButton) {
        manualWaterFillButton.addEventListener('click', function() {
            showNotification('Manuel su doldurma işlemi başlatıldı', 'success');
            addActivityLog('Manuel Su Doldurma Başlatıldı', 'Bekliyor');
            
            // 5 saniye sonra tamamlandığını bildir
            setTimeout(() => {
                addActivityLog('Manuel Su Doldurma', 'Tamamlandı');
                showNotification('Su doldurma işlemi tamamlandı', 'success');
            }, 5000);
        });
    }
    
    // Sıcaklık ve Nem Grafiği
    const tempHumidityCtx = document.getElementById('tempHumidityChart');
    if (tempHumidityCtx) {
        const ctx = tempHumidityCtx.getContext('2d');
        tempHumidityChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: timeLabels,
                datasets: [
                    {
                        label: 'Sıcaklık (°C)',
                        data: [],
                        borderColor: '#F44336',
                        backgroundColor: 'rgba(244, 67, 54, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Nem (%)',
                        data: [],
                        borderColor: '#2196F3',
                        backgroundColor: 'rgba(33, 150, 243, 0.1)',
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        position: 'top',
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        min: 0,
                        max: 100,
                        ticks: {
                            stepSize: 20
                        }
                    }
                }
            }
        });
    }
    
    // Su Seviyesi Geçmiş Grafiği
    const waterLevelHistoryCtx = document.getElementById('waterLevelHistoryChart');
    if (waterLevelHistoryCtx) {
        const ctx = waterLevelHistoryCtx.getContext('2d');
        waterLevelHistoryChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: timeLabels,
                datasets: [{
                    label: 'Su Seviyesi (%)',
                    data: [],
                    borderColor: '#2196F3',
                    backgroundColor: 'rgba(33, 150, 243, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            stepSize: 20
                        }
                    }
                }
            }
        });
    }
    
    // Geçmiş Veriler Grafiği
    const historyChartCtx = document.getElementById('historyChart');
    if (historyChartCtx) {
        const ctx = historyChartCtx.getContext('2d');
        historyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Veriler',
                        data: [],
                        borderColor: '#4CAF50',
                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                        tension: 0.4,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        ticks: {
                            stepSize: 10
                        }
                    }
                }
            }
        });
    }
    
    // Başlangıç verilerini al ve güncelleme döngüsünü başlat
    updateRealTimeData();
    
    // Bitki durumlarını güncelle
    updatePlantStatusPage();
    updatePlantGrowthCard();
    
    // İlk aktivite günlüğü oluştur
    addActivityLog('Sistem Başlatıldı', 'Tamamlandı');
}

/**
 * Gerçek zamanlı veri güncelleme fonksiyonu
 */
async function updateRealTimeData() {
    try {
        // En son sensör verilerini al
        const latestData = await fetchSensorData();
        
        // Geçmiş verileri al
        const historicalData = await fetchHistoricalData();
        
        // Dashboard'u güncelle
        updateDashboard(latestData);
        
        // Grafikleri güncelle
        updateCharts(historicalData);
        
        // 10 saniyede bir güncelle
        setTimeout(updateRealTimeData, 10000);
    } catch (error) {
        console.error('Veri güncelleme hatası:', error);
        showNotification('Veri güncelleme hatası. Tekrar deneniyor...', 'danger');
        
        // Hata durumunda 30 saniye sonra tekrar dene
        setTimeout(updateRealTimeData, 30000);
    }
}

/**
 * Aktif sayfayı değiştirmek için fonksiyon
 * @param {string} page - Sayfa id'si
 */
function navigateTo(page) {
    // Tüm sidebar elemanlarından aktif sınıfını kaldır
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Tıklanan elemana aktif sınıfını ekle
    const activeItem = document.querySelector(`.sidebar-item[data-page="${page}"]`);
    if (activeItem) {
        activeItem.classList.add('active');
    }
    
    // Sayfa içeriğini göster/gizle
    document.querySelectorAll('.page-content').forEach(content => {
        content.style.display = 'none';
    });
    
    const targetContent = document.getElementById(`${page}-content`);
    if (targetContent) {
        targetContent.style.display = 'block';
    } else {
        console.log(`${page} sayfası henüz uygulanmadı.`);
        // Henüz oluşturulmamış sayfalar için uyarı mesajı gösterilebilir
        showNotification(`${page} sayfası yakında eklenecek`, 'info');
    }
}

/**
 * Bildirim gösterme fonksiyonu
 * @param {string} message - Gösterilecek mesaj
 * @param {string} type - Bildirim tipi (success, info, warning, danger)
 */
function showNotification(message, type = 'info') {
    // Bildirim container'ı yoksa oluştur
    let notificationContainer = document.getElementById('notification-container');
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        notificationContainer.style.position = 'fixed';
        notificationContainer.style.top = '20px';
        notificationContainer.style.right = '20px';
        notificationContainer.style.zIndex = '9999';
        document.body.appendChild(notificationContainer);
    }
    
    // Yeni bildirim oluştur
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} animate-fadein`;
    notification.style.minWidth = '250px';
    notification.style.marginBottom = '10px';
    notification.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
    
    notification.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="${getAlertIcon(type)} me-2"></i>
            <div>${message}</div>
            <button type="button" class="btn-close ms-auto" aria-label="Close"></button>
        </div>
    `;
    
    // Kapat butonuna tıklama işlemi
    notification.querySelector('.btn-close').addEventListener('click', () => {
        notification.remove();
    });
    
    // Bildirimi ekle
    notificationContainer.appendChild(notification);
    
    // 5 saniye sonra otomatik kapat
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

/**
 * Ayarları kaydetmek için kullanılan fonksiyon
 * @param {string} settingType - Ayar tipi (temperature, humidity, vs.)
 */
function saveSettings(settingType) {
    showNotification(`${settingType} ayarları başarıyla kaydedildi!`, 'success');
    addActivityLog(`${capitalizeFirstLetter(settingType)} Ayarları Güncellendi`, 'Tamamlandı');
}

/**
 * İlk harf büyük yapma yardımcı fonksiyonu
 * @param {string} str - Metin
 * @returns {string} - İlk harfi büyük metin
 */
function capitalizeFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Tarih saat formatı yardımcı fonksiyonu
 * @param {Date} date - Tarih
 * @returns {string} - Formatlanmış tarih saat
 */
function formatDateTime(date) {
    if (!(date instanceof Date)) {
        date = new Date(date);
    }
    
    return date.toLocaleString('tr-TR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Tarih formatı yardımcı fonksiyonu
 * @param {Date|string} date - Tarih
 * @returns {string} - Formatlanmış tarih
 */
function formatDate(date) {
    if (!(date instanceof Date)) {
        date = new Date(date);
    }
    
    return date.toLocaleString('tr-TR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

// Sayfa yüklendiğinde dashboard'u başlat
window.addEventListener('load', () => {
    initDashboard();
    
    // Menü öğelerine tıklama olaylarını ekle
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.getAttribute('data-page');
            navigateTo(page);
        });
    });
    
    // Varsayılan olarak dashboard sayfasını göster
    navigateTo('dashboard');
    
    // Ekran boyutunu kontrol et ve sidebar'ı ayarla
    checkScreenSize();
    
    // Ekran boyutu değiştiğinde tekrar kontrol et
    window.addEventListener('resize', checkScreenSize);
});