// Firebase henüz bağlanmadığı için geçici sahte veri seti.
// Gerçek backend entegre edildiğinde bu dosya kaldırılabilir.

export const staffList = ['Ahmet Yılmaz', 'Mehmet Kaya', 'Selin Demir'];

export const initialTasks = [
  {
    id: '1',
    title: 'Depo Sayımı',
    assignee: 'Ahmet Yılmaz',
    time: '09:30',
    duration: 15,
    status: 'tamamlandi',
  },
  {
    id: '2',
    title: 'Makine Bakım Kontrolü',
    assignee: 'Mehmet Kaya',
    time: '11:00',
    duration: 30,
    status: 'bekliyor',
  },
  {
    id: '3',
    title: 'Kalite Kontrol Turu',
    assignee: 'Selin Demir',
    time: '13:15',
    duration: 20,
    status: 'kacirildi',
  },
  {
    id: '4',
    title: 'Sevkiyat Onayı',
    assignee: 'Ahmet Yılmaz',
    time: '15:45',
    duration: 10,
    status: 'bekliyor',
  },
];
