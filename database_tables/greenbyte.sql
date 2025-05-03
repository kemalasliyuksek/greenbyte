CREATE TABLE kullanicilar (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kullanici_adi VARCHAR(50) UNIQUE NOT NULL,
    sifre VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    kayit_tarihi DATETIME DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE seralar (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kullanici_id INT,
    ad VARCHAR(100),
    konum VARCHAR(255),
    olusturma_tarihi DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (kullanici_id) REFERENCES kullanicilar(id) ON DELETE CASCADE
);


CREATE TABLE cihazlar (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sera_id INT,
    ad VARCHAR(100),
    durum BOOLEAN DEFAULT FALSE,
    eklenme_tarihi DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sera_id) REFERENCES seralar(id) ON DELETE CASCADE
);



CREATE TABLE sensorler (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sera_id INT,
    ad VARCHAR(100),
    durum BOOLEAN DEFAULT FALSE,
    eklenme_tarihi DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sera_id) REFERENCES seralar(id) ON DELETE CASCADE
);


CREATE TABLE sensor_verileri (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sensor_id INT,
    deger FLOAT,
    kayit_zamani DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sensor_id) REFERENCES sensorler(id) ON DELETE CASCADE
);


CREATE TABLE cihaz_olaylari(
    id INT AUTO_INCREMENT PRIMARY KEY,
    cihaz_id INT,
    islem ENUM('ac', 'kapat'),
    tetikleyici ENUM('manuel', 'otomatik'),
    zaman DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cihaz_id) REFERENCES cihazlar(id) ON DELETE CASCADE
);


CREATE TABLE hava_durumu (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sera_id INT,
    sicaklik FLOAT,
    nem FLOAT,
    ruzgar_hizi FLOAT,
    yagis BOOLEAN,
    hava_durumu_aciklama VARCHAR(100),
    kayit_zamani DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sera_id) REFERENCES seralar(id) ON DELETE CASCADE
);


CREATE TABLE bitki_turleri (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tur_adi VARCHAR(100) NOT NULL,
    min_sicaklik FLOAT,
    max_sicaklik FLOAT,
    min_nem FLOAT,
    max_nem FLOAT,
    min_gunluk_isik_saati FLOAT,
    max_gunluk_isik_saati FLOAT,
    min_isik_yogunlugu INT,
    max_isik_yogunlugu INT,
    min_toprak_nemi FLOAT,
    max_toprak_nemi FLOAT,
    sulama_sikligi INT,
    yetistirme_suresi INT,
    notlar TEXT,
    eklenme_tarihi DATETIME DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE bitkiler (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sera_id INT NOT NULL,
    bitki_tur_id INT NOT NULL,
    bolge_kodu VARCHAR(50) NOT NULL,
    ekim_tarihi DATE NOT NULL,
    gelisim_yuzdesi FLOAT DEFAULT 0,
    tahmini_hasat_tarihi DATE,
    not TEXT,
    durum ENUM('aktif', 'hasat_edildi', 'iptal') DEFAULT 'aktif',
    son_guncelleme DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (sera_id) REFERENCES seralar(id) ON DELETE CASCADE,
    FOREIGN KEY (bitki_tur_id) REFERENCES bitki_turleri(id)
);