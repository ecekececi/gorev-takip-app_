// Firebase yapılandırması
//
// ÖNEMLİ: Aşağıdaki değerleri KENDİ Firebase projenizin bilgileriyle doldurun.
// Firebase Console > Project Settings (Proje Ayarları) > "Your apps" (Uygulamalarınız)
// bölümünden Web App (</>) ekleyerek bu bilgileri kopyalayabilirsiniz.
//
// Ayrıca:
// - Firebase Console > Authentication > Sign-in method kısmından
//   "Email/Password" (E-posta/Şifre) yöntemini AÇIK hale getirin.
// - Firebase Console > Firestore Database kısmından veritabanını oluşturun.
//   Kayıt ekranı (RegisterScreen), kullanıcıyı otomatik olarak
//   "kullanicilar" koleksiyonuna (doküman ID = Auth User UID) yazacaktır.
import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyB6xyFAr7PZ0FCvng6ZykvCodkY0KzxcPE",
  authDomain: "qrkod-96dc7.firebaseapp.com",
  projectId: "qrkod-96dc7",
  storageBucket: "qrkod-96dc7.firebasestorage.app",
  messagingSenderId: "1013463637645",
  appId: "1:1013463637645:web:68d0c3df04edd51e45ccc4",
  measurementId: "G-7V8T8QKFFJ"
};
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
 
// React Native'de oturumun cihazda kalıcı olması (Beni Hatırla mantığının
// çalışabilmesi) için AsyncStorage tabanlı persistence kullanılır.
// initializeAuth de aynı sebeple ikinci kez çağrılırsa hata verebildiğinden
// zaten bir auth örneği varsa getAuth ile onu alıyoruz.
let authInstance;
try {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (e) {
  authInstance = getAuth(app);
}
export const auth = authInstance;
 
export const db = getFirestore(app);
 
export default app;