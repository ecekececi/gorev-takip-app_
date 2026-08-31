# Görev Takip — Frontend (Expo / React Native)

Koyu Mavi–Gri tasarım dilinde, sadece frontend'e odaklı 6 ekranlık test uygulaması.
Firebase yok; sahte (mock) veriler `mockData.js` içinde.
Tüm dosyalar tek klasörde, alt klasör yok.

## VS Code'da Kurulum

1. Bu klasörü VS Code'da açın.
2. Terminalde bağımlılıkları kurun:
   ```
   npm install
   ```
3. Expo sunucusunu başlatın:
   ```
   npx expo start
   ```
4. Telefonunuzda **Expo Go** uygulamasını açıp terminaldeki QR kodu okutun
   (iOS: Kamera uygulamasıyla; Android: Expo Go içindeki "Scan QR code" ile).

> Not: Fiziksel cihaz ve bilgisayar aynı Wi-Fi ağında olmalı. Farklı ağdaysanız
> `npx expo start --tunnel` kullanın.

## Ekranlar ve Akış

```
Login
 ├─ "Yönetici Olarak Gir" → AdminHome ──(+)──▶ NewTask
 └─ "Personel Olarak Gir" → StaffHome ──(Bitir & QR Tarat)──▶ QRScan ──▶ Result
                                                                          │
                                                        (başarılı: 2 sn sonra StaffHome'a döner)
                                                        (başarısız: "Tekrar Dene" → QRScan)
```

## Klasör Yapısı (tek klasör, düz)

```
gorev-takip-app/
├── App.js                 # Navigasyon (Stack Navigator)
├── app.json                # Expo yapılandırması + kamera izinleri
├── babel.config.js
├── package.json
├── colors.js                # Renk paleti + spacing/radius sabitleri
├── mockData.js               # Sahte personel/görev listesi
├── LoginScreen.js
├── AdminHomeScreen.js
├── NewTaskScreen.js
├── StaffHomeScreen.js
├── QRScanScreen.js
└── ResultScreen.js
```

## Kullanılan Paketler

- `@react-navigation/native` + `native-stack` — ekran geçişleri
- `expo-camera` (`CameraView`) — QR tarama (yeni Expo SDK 51+ API'si)
- `@react-native-community/datetimepicker` — tarih/saat seçimi
- `@react-native-community/slider` — süre kaydırıcısı

## Sırada Ne Var? (Backend bağlanınca)

- `LoginScreen`: gerçek kimlik doğrulama (Firebase Auth vb.) ile test butonlarının değiştirilmesi
- `AdminHomeScreen` / `NewTaskScreen`: mock veriler yerine gerçek API/DB bağlantısı
- `StaffHomeScreen`: sayacın backend'den gelen gerçek görev süresine bağlanması
- `QRScanScreen`: taranan QR içeriğinin backend'de doğrulanması (şu an her kod başarılı sayılıyor)
