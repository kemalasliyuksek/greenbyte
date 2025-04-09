// Global değişkenler
let tempHumidityChart;
let waterUsageChart;
let sensorData = {
    temperature: 24.5,
    humidity: 68,
    lightLevel: 856,
    soilMoisture: 72,
    co2Level: 750,
    waterUsage: [45, 59, 40, 35, 48, 42, 38],
    tempHistory: [22, 21.5, 21, 20.8, 21.2, 22.5, 24, 25, 25.5, 26, 25, 24.5],
    humidityHistory: [65, 67, 70, 72, 71, 69, 65, 62, 60, 59, 62, 68]
};

// API URL'leri
const API_BASE_URL = "http://kemalasliyuksek.com/greenbyte/api";
const LATEST_DATA_URL = `${API_BASE_URL}/get_latest_data.php`;
const HISTORICAL_DATA_URL = `${API_BASE_URL}/get_historical_data.php`;

// Zaman etiketleri
const timeLabels = ['00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];

/**
 * Sensör değerlerini manuel olarak güncellemek için kullanılabilecek fonksiyon
 * @param {string} sensorType - Sensör tipi (temperature, humidity, vs.)
 * @param {number|array} value - Sensör değeri
 */
function updateSensorValue(sensorType, value) {
    if (sensorData.hasOwnProperty(sensorType)) {
        sensorData[sensorType] = value;
        // Dashboard'u güncelle
        updateDashboard(sensorData);
        console.log(`${sensorType} sensör değeri güncellendi: ${value}`);
    } else {
        console.error(`Geçersiz sensör tipi: ${sensorType}`);
    }
}

/**
 * Sensör verilerini API'den alan fonksiyon
 */
async function fetchSensorData() {
    try {
        // Sera ID'si. Gerçek uygulamada bu dinamik olabilir
        const seraID = 1;
        
        // En son sensör verilerini al
        const response = await fetch(`${LATEST_DATA_URL}?seraID=${seraID}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Veri formatını düzenle
        return {
            temperature: data.temperature.value,
            humidity: data.humidity.value,
            soilMoisture: data.soilMoisture.value,
            lightLevel: data.lightLevel.value,
            // Diğer sensörler eklenebilir
            lastUpdated: new Date(data.temperature.timestamp)
        };
    } catch (error) {
        console.error('Sensör verilerini alma hatası:', error);
        // Hata durumunda mevcut verileri kullan
        return sensorData;
    }
}

/**
 * Geçmiş sensör verilerini API'den alan fonksiyon
 */
async function fetchHistoricalData() {
    try {
        // Sera ID'si. Gerçek uygulamada bu dinamik olabilir
        const seraID = 1;
        
        // Son 24 saatin verilerini al
        const hours = 24;
        const response = await fetch(`${HISTORICAL_DATA_URL}?seraID=${seraID}&hours=${hours}&type=all`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Eğer veri varsa, sıcaklık ve nem geçmişini güncelle
        if (data.temperature && data.temperature.length > 0) {
            sensorData.tempHistory = data.temperature.map(item => item.value);
        }
        
        if (data.humidity && data.humidity.length > 0) {
            sensorData.humidityHistory = data.humidity.map(item => item.value);
        }
        
        // Zaman etiketlerini güncelle
        if (data.temperature && data.temperature.length > 0) {
            // Zaman etiketlerini güncelle
            timeLabels.length = 0; // Mevcut etiketleri temizle
            
            data.temperature.forEach(item => {
                const date = new Date(item.timestamp);
                const hours = date.getHours().toString().padStart(2, '0');
                const minutes = date.getMinutes().toString().padStart(2, '0');
                timeLabels.push(`${hours}:${minutes}`);
            });
        }
        
        // Grafikleri güncelle
        updateCharts();
        
    } catch (error) {
        console.error('Geçmiş verileri alma hatası:', error);
    }
}

/**
 * Dashboard'u sensör verileriyle güncelleyen fonksiyon
 * @param {Object} data - Sensör verileri
 */
function updateDashboard(data) {
    if (!data) return;
    
    // Sensör verilerini güncelle
    sensorData = { ...sensorData, ...data };
    
    // Temel sensör kartlarını güncelle
    document.querySelector('.col-md-3:nth-child(1) .card-value').textContent = `${sensorData.temperature.toFixed(1)}°C`;
    document.querySelector('.col-md-3:nth-child(2) .card-value').textContent = `${sensorData.humidity.toFixed(0)}%`;
    document.querySelector('.col-md-3:nth-child(3) .card-value').textContent = `${sensorData.lightLevel} lux`;
    document.querySelector('.col-md-3:nth-child(4) .card-value').textContent = `${sensorData.soilMoisture.toFixed(0)}%`;
    
    // Sıcaklık ve Nem sayfalarındaki mevcut değerleri güncelle
    const tempDisplay = document.querySelector('#temperature-content .sensor-display h2');
    if (tempDisplay) {
        tempDisplay.textContent = `${sensorData.temperature.toFixed(1)}°C`;
    }
    
    const humidityDisplay = document.querySelector('#humidity-content .sensor-display h2');
    if (humidityDisplay) {
        humidityDisplay.textContent = `${sensorData.humidity.toFixed(0)}%`;
    }
    
    // Son güncelleme zamanını ayarla
    const lastUpdateTime = sensorData.lastUpdated ? 
        sensorData.lastUpdated.toLocaleString('tr-TR') : 
        new Date().toLocaleString('tr-TR');
    
    const tempUpdateTime = document.querySelector('#temperature-content .sensor-display p');
    if (tempUpdateTime) {
        tempUpdateTime.textContent = `Son Güncelleme: ${lastUpdateTime}`;
    }
    
    const humUpdateTime = document.querySelector('#humidity-content .sensor-display p');
    if (humUpdateTime) {
        humUpdateTime.textContent = `Son Güncelleme: ${lastUpdateTime}`;
    }
    
    // CO2 göstergesini güncelle
    const co2Percentage = Math.min(Math.max((sensorData.co2Level / 1500) * 100, 0), 100); // 0-1500 ppm arasını 0-100% olarak ölçekle
    const co2Angle = (co2Percentage / 100) * 180;
    document.getElementById('co2Fill').style.height = `${co2Percentage}%`;
    document.getElementById('co2Indicator').style.transform = `rotate(${co2Angle}deg)`;
    document.querySelector('.gauge-value').textContent = `${sensorData.co2Level} ppm`;
    
    // Grafikleri güncelle
    updateCharts();
}

/**
 * Grafikleri güncelleyen fonksiyon
 */
function updateCharts() {
    // Sıcaklık ve Nem grafiğini güncelle
    if (tempHumidityChart) {
        tempHumidityChart.data.labels = timeLabels;
        tempHumidityChart.data.datasets[0].data = sensorData.tempHistory;
        tempHumidityChart.data.datasets[1].data = sensorData.humidityHistory;
        tempHumidityChart.update();
    }
    
    // Su kullanım grafiğini güncelle
    if (waterUsageChart) {
        waterUsageChart.data.datasets[0].data = sensorData.waterUsage;
        waterUsageChart.update();
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
    document.querySelector('.toggle-menu').addEventListener('click', function() {
        toggleSidebar();
    });
    
    // Topbar'ın genişliğini ayarla
    const sidebar = document.querySelector('.sidebar');
    const topbar = document.querySelector('.topbar');
    if (sidebar && topbar) {
        topbar.style.width = `calc(100% - ${sidebar.offsetWidth}px)`;
        topbar.style.left = `${sidebar.offsetWidth}px`;
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
                        data: sensorData.tempHistory,
                        borderColor: '#F44336',
                        backgroundColor: 'rgba(244, 67, 54, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Nem (%)',
                        data: sensorData.humidityHistory,
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
    
    // Su Kullanım Grafiği
    const waterUsageCtx = document.getElementById('waterUsageChart');
    if (waterUsageCtx) {
        const ctx = waterUsageCtx.getContext('2d');
        waterUsageChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'],
                datasets: [{
                    label: 'Su Tüketimi (lt)',
                    data: sensorData.waterUsage,
                    backgroundColor: 'rgba(76, 175, 80, 0.6)',
                    borderColor: 'rgba(76, 175, 80, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
    
    // Başlangıç verilerini al ve güncelleme döngüsünü başlat
    updateRealTimeData();
}

/**
 * Gerçek zamanlı veri güncelleme fonksiyonu
 */
async function updateRealTimeData() {
    try {
        // En son sensör verilerini al
        const latestData = await fetchSensorData();
        updateDashboard(latestData);
        
        // Geçmiş verileri al
        await fetchHistoricalData();
        
        // 10 saniyede bir güncelle (bu değeri değiştirebilirsiniz)
        setTimeout(updateRealTimeData, 10000);
    } catch (error) {
        console.error('Veri güncelleme hatası:', error);
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
            <i class="fas fa-info-circle me-2"></i>
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
    // Burada gerçek bir kaydetme işlemi yapılabilir
    // Örnek olarak sadece bir bildirim gösteriyoruz
    showNotification(`${settingType} ayarları başarıyla kaydedildi!`, 'success');
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