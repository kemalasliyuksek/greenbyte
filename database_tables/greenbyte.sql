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