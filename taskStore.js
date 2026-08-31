// Görevler: bellekte tutulan basit depo (Firebase'e taşınana kadar).
// Kullanıcılar (kullanıcı/yönetici): Firestore'daki "kullanicilar" koleksiyonu
// (doküman ID = Firebase Authentication User UID).

import { db } from './firebaseConfig';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';

/**
 * Firestore'daki "kullanicilar" koleksiyonundan, verilen Auth UID'sine
 * ait kullanıcı dokümanını getirir. Doküman: { email, isim, rol }.
 * Giriş yapan kişinin adını/rolünü bulmak için LoginScreen ve App.js
 * bu fonksiyonu kullanır.
 */
export async function getStaffByUid(uid) {
  if (!uid) return null;
  const snap = await getDoc(doc(db, 'kullanicilar', uid));
  return snap.exists() ? snap.data() : null;
}

/**
 * Sadece "staff" (kullanıcı) rolündeki kullanıcıların isim listesini getirir.
 * NewTaskScreen'deki "kullanıcı" seçim listesi için kullanılır.
 */
export async function getStaffList() {
  const q = query(collection(db, 'kullanicilar'), where('rol', '==', 'staff'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data().isim);
}

/**
 * Tüm kullanıcıları (kullanıcı + yönetici) getirir.
 * Yönetici panelindeki "Kullanıcılar" listesi için kullanılabilir.
 */
export async function getAllStaff() {
  const snap = await getDocs(collection(db, 'kullanicilar'));
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
}

/**
 * Sadece "staff" (kullanıcı) rolündeki kullanıcıları, uid'leriyle birlikte
 * getirir (yöneticiler dahil edilmez). CheckInsScreen'deki kullanıcı
 * filtresi gibi, sadece kullanıcıların seçilebilmesi gereken yerlerde
 * kullanılır. getStaffList()'ten farkı: sadece isim değil, tam kullanıcı
 * nesnesini (uid + isim) döndürmesidir.
 */
export async function getStaffUsers() {
  const q = query(collection(db, 'kullanicilar'), where('rol', '==', 'staff'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
}

/**
 * Verilen UID için Firestore'a kullanıcı dokümanı yazar.
 * NewUserScreen, Authentication'da hesabı oluşturduktan SONRA
 * bu fonksiyonu çağırarak isim/email/rol bilgisini kaydeder.
 */
export async function saveStaffDocument(uid, { email, isim, rol }) {
  await setDoc(doc(db, 'kullanicilar', uid), { email, isim, rol });
}

// ---------------------------------------------------------------------
// Görevler — artık Firestore'daki "gorevler" koleksiyonunda tutuluyor.
// Not: Tüm fonksiyonlar artık ASENKRON (Promise döner). Bu yüzden bu
// fonksiyonları çağıran ekranlarda `await` / `.then()` kullanılmalı.
// ---------------------------------------------------------------------

const TASKS_COLLECTION = 'gorevler';

/** Tüm görevleri Firestore'dan getirir (Admin paneli için). */
export async function getAllTasks() {
  const snap = await getDocs(
    collection(db, TASKS_COLLECTION)
  );

  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
}

/**
 * Belirli bir kullanıcıe ait görevleri döndürür.
 * kullanıcı ekranı sadece kendi adına atanmış görevleri görsün diye
 * StaffHomeScreen bu fonksiyonu, giriş yapan kullanıcının Firestore'dan
 * çözümlenen ismiyle çağırır.
 */
export async function getTasksForStaff(staffName) {
  if (!staffName) return [];
  const q = query(
    collection(db, TASKS_COLLECTION),
    where('assignee', '==', staffName)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => a.time.localeCompare(b.time));
}

/**
 * Bir kullanıcının "aktif" (henüz tamamlanmamış) TÜM görevlerini döndürür:
 * durumu "bekliyor" VEYA "kacirildi" olan görevler. "kacirildi" olanlar da
 * dahil ediliyor ki süresi dolan bir görev listeden kaybolmasın; kullanıcı
 * yine de QR okutup görevi tamamlayabilsin (Yönetici panelinde bu görev
 * "kaçırılmış ama tamamlanmış" olarak görünecek).
 *
 * Görev ilk kez aktif olduğunda ve başlangıç/bitiş zamanı (startAt/endAt)
 * kaydedilmemişse (eski görevler için geriye dönük uyumluluk), bu an
 * "activatedAt" olarak Firestore'a yazılır.
 */
export async function getActiveTasks(staffName) {
  if (!staffName) return [];
  const myTasks = await getTasksForStaff(staffName);
  const active = myTasks.filter(
    (t) => t.status === 'bekliyor' || t.status === 'kacirildi'
  );

  for (const t of active) {
    if (t.status === 'bekliyor' && !t.endAt && !t.activatedAt) {
      const activatedAt = Date.now();
      try {
        await updateDoc(doc(db, TASKS_COLLECTION, t.id), { activatedAt });
      
      } catch (e) {
        console.warn('Görev aktifleşme zamanı kaydedilemedi:', e);
      }
      t.activatedAt = activatedAt;
    }
  }

  // Zamanlanmış başlangıca göre sırala (varsa startAt, yoksa "time" metni).
  return active.sort((a, b) => {
    if (a.startAt && b.startAt) return a.startAt - b.startAt;
    return (a.time || '').localeCompare(b.time || '');
  });
}
export async function completeTask(
  taskId,
  {
    deviceTimestamp,
    qrToken,
    qrDeviceId,
  } = {}
) {
  if (!taskId) {
    throw new Error('missing-task-id');
  }

  if (!deviceTimestamp) {
    throw new Error('missing-device-timestamp');
  }

  if (!qrToken) {
    throw new Error('missing-qr-token');
  }

  if (!qrDeviceId) {
    throw new Error('missing-device-id');
  }
  console.log("TASK TAMAMLANIYOR...");
  await updateDoc(doc(db, TASKS_COLLECTION, taskId), {
    status: 'tamamlandi',

    // QR cihazının oluşturduğu zaman
    completedAt: deviceTimestamp,

    // QR doğrulama kayıtları
    completionDeviceId: qrDeviceId,
    completionQrToken: qrToken,
    completionQrTimestamp: deviceTimestamp,

    // Firestore'un işlemi aldığı zaman
    completionServerAt: serverTimestamp(),
  });
  console.log("TASK TAMAMLANDI");
}

/**
 * Görevi kaçırıldı olarak işaretler (süre dolduğunda kullanılır).
 * "wasMissed: true" kalıcı olarak set edilir; görev daha sonra QR ile
 * tamamlansa bile (completeTask sadece "status" alanını değiştirir,
 * diğer alanlara dokunmaz) bu bayrak kalır. Böylece Yönetici panelinde
 * "Tamamlananlar" listesinde bu görevin aslında süresi dolduktan sonra
 * tamamlandığı görülebilir.
 */
export async function missTask(taskId) {
  if (!taskId) return;
  await updateDoc(doc(db, TASKS_COLLECTION, taskId), {
    status: 'kacirildi',
    wasMissed: true,
  });
}

/** Yeni görev ekler (NewTaskScreen için). */
export async function addTask(task) {
  await addDoc(
    collection(db, TASKS_COLLECTION),
    {
      status: 'bekliyor',
      createdAt: Date.now(),
      ...task,
    }
  );
}

// ---------------------------------------------------------------------
// Girişler (QR check-in kayıtları) — "girisler" koleksiyonu
// ---------------------------------------------------------------------

const CHECKINS_COLLECTION = 'girisler';

/**
 * kullanıcıin QR kod ile giriş (check-in) yaptığı anı Firestore'a kaydeder.
 * QRScanScreen'de doğru cihazın QR'ı okutulup ResultScreen'e "başarılı"
 * olarak düşüldüğünde, eğer bu bir görev bitirme değil de giriş taraması
 * ise (taskId yok) çağrılır.
 */
/**
 * kullanıcının QR kod ile giriş (check-in) yaptığı anı Firestore'a kaydeder.
 * QRScanScreen'de doğru cihazın QR'ı okutulup ResultScreen'e "başarılı"
 * olarak düşüldüğünde, eğer bu bir görev bitirme değil de giriş taraması
 * ise (taskId yok) çağrılır.
 *
 * uid eksikse artık SESSİZCE çıkmıyor, hata fırlatıyor — böylece
 * ResultScreen bu durumu yakalayıp ekranda gösterebiliyor. Önceden bu
 * sessizce başarısız oluyordu ve hiçbir yerde iz bırakmıyordu.
 */
export async function recordCheckIn(uid, staffName) {
  if (!uid) {
    console.warn('recordCheckIn: uid eksik, giriş kaydı YAZILAMADI.', { uid, staffName });
    throw new Error('missing-uid');
  }
  await addDoc(collection(db, CHECKINS_COLLECTION), {
    uid,
    isim: staffName || '',
    zaman: serverTimestamp(),
  });
}

/**
 * Tüm QR check-in (giriş) kayıtlarını, en yeniden en eskiye sıralı
 * getirir. Yönetici panelindeki "Girişler" ekranı için kullanılır.
 *
 * Kullanıcı ve tarih filtreleri şimdilik Firestore sorgusunda değil,
 * CheckInsScreen içinde (istemci tarafında) uygulanıyor. Kayıt sayısı
 * çok büyürse ileride buraya `where('uid', '==', uid)` ve tarih
 * aralığı filtreleri eklenebilir.
 */
export async function getCheckIns() {
  const q = query(collection(db, CHECKINS_COLLECTION), orderBy('zaman', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      uid: data.uid,
      isim: data.isim,
      zaman: data.zaman?.toDate ? data.zaman.toDate() : null,
    };
  });
}

// ---------------------------------------------------------------------
// Kalan süre yardımcıları — aktif görevlerin bitişine ne kadar kaldığını
// gün/saat/dakika cinsinden hesaplamak için. StaffHomeScreen (veya aktif
// görevlerin listelendiği herhangi bir ekran) bu fonksiyonları kullanarak
// "3 gün kaldı" gibi bir metin gösterebilir.
// ---------------------------------------------------------------------

/**
 * Bir görevin bitişine (task.endAt, epoch ms) kalan süreyi hesaplar.
 * endAt yoksa null döner (örn. eski görevler / henüz aktifleşmemiş görevler).
 */
export function getRemainingTime(task) {
  if (!task || !task.endAt) return null;
  const diffMs = task.endAt - Date.now();
  if (diffMs <= 0) {
    return { expired: true, days: 0, hours: 0, minutes: 0 };
  }
  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  return { expired: false, days, hours, minutes };
}

/**
 * Kalan süreyi okunaklı bir metne çevirir.
 * - 1 günden uzun süreler: "3 gün kaldı" (gün cinsinden geri sayım)
 * - 1 günden kısa süreler: "4 sa 12 dk kaldı"
 * - Süresi dolmuşsa: "Süre doldu"
 */
export function formatRemainingTime(task) {
  const r = getRemainingTime(task);
  if (!r) return '';
  if (r.expired) return 'Süre doldu';
  if (r.days > 0) {
    return r.hours > 0 ? `${r.days} gün ${r.hours} sa kaldı` : `${r.days} gün kaldı`;
  }
  if (r.hours > 0) return `${r.hours} sa ${r.minutes} dk kaldı`;
  return `${r.minutes} dk kaldı`;
}