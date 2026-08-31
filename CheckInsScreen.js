import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius } from './colors';
import { getCheckIns, getStaffUsers } from './taskStore';

function formatDateTime(date) {
  if (!date) return 'Zaman bilgisi yok';
  return date.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateShort(date) {
  if (!date) return '';
  return date.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

const MONTH_NAMES = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];
const WEEKDAY_LETTERS = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'];

/** Basit, harici pakete ihtiyaç duymayan aylık takvim ızgarası. */
function MiniCalendar({ visibleMonth, onChangeMonth, selectedDate, onSelectDate }) {
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  // Pazartesi = 0 olacak şekilde kaydır (JS'te Pazar = 0'dır).
  const firstWeekday = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(day);

  const today = startOfDay(new Date());

  return (
    <View>
      <View style={styles.calHeader}>
        <TouchableOpacity
          style={styles.calNavBtn}
          onPress={() => onChangeMonth(new Date(year, month - 1, 1))}
        >
          <Text style={styles.calNavText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.calTitle}>{MONTH_NAMES[month]} {year}</Text>
        <TouchableOpacity
          style={styles.calNavBtn}
          onPress={() => onChangeMonth(new Date(year, month + 1, 1))}
        >
          <Text style={styles.calNavText}>›</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.calWeekRow}>
        {WEEKDAY_LETTERS.map((w) => (
          <Text key={w} style={styles.calWeekLabel}>{w}</Text>
        ))}
      </View>
      <View style={styles.calGrid}>
        {cells.map((day, idx) => {
          if (day === null) return <View key={`e${idx}`} style={styles.calCell} />;
          const cellDate = new Date(year, month, day);
          const isSelected =
            selectedDate && startOfDay(selectedDate).getTime() === startOfDay(cellDate).getTime();
          const isToday = startOfDay(cellDate).getTime() === today.getTime();
          return (
            <TouchableOpacity
              key={day}
              style={[
                styles.calCell,
                styles.calDayCell,
                isSelected && styles.calDaySelected,
                isToday && !isSelected && styles.calDayToday,
              ]}
              onPress={() => onSelectDate(cellDate)}
            >
              <Text style={[styles.calDayText, isSelected && styles.calDayTextSelected]}>
                {day}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function CheckInCard({ item }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardName}>{item.isim || 'Bilinmeyen kullanıcı'}</Text>
      <Text style={styles.cardTime}>{formatDateTime(item.zaman)}</Text>
    </View>
  );
}

export default function CheckInsScreen({ navigation }) {
  const [checkIns, setCheckIns] = useState([]);
  const [staffList, setStaffList] = useState([]);

  // Kullanıcı filtresi
  const [selectedUser, setSelectedUser] = useState(null); // null = Tümü
  const [userModalVisible, setUserModalVisible] = useState(false);

  // Tarih filtresi
  const [filterDate, setFilterDate] = useState(null); // null = Tümü, Date = seçili gün
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(new Date());

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      getCheckIns()
        .then((data) => {
          if (isActive) setCheckIns(data);
        })
        .catch((e) => console.warn('Girişler alınamadı:', e));
      getStaffUsers()
        .then((data) => {
          if (isActive) setStaffList(data);
        })
        .catch((e) => console.warn('Kullanıcılar alınamadı:', e));
      return () => {
        isActive = false;
      };
    }, [])
  );

  const filteredCheckIns = useMemo(() => {
    return checkIns.filter((item) => {
      if (selectedUser && item.isim !== selectedUser.isim) return false;
      if (filterDate) {
        if (!item.zaman) return false;
        const from = startOfDay(filterDate).getTime();
        const to = endOfDay(filterDate).getTime();
        const t = item.zaman.getTime();
        if (t < from || t > to) return false;
      }
      return true;
    });
  }, [checkIns, selectedUser, filterDate]);

  return (
    <View style={styles.flex}>
      <StatusBar style="light" />
      <View style={styles.appBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹ Geri</Text>
        </TouchableOpacity>
        <Text style={styles.appBarTitle}>Giriş Kayıtları</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.filterBar}>
        <TouchableOpacity
          style={styles.filterChip}
          onPress={() => setUserModalVisible(true)}
        >
          <Text style={styles.filterChipText} numberOfLines={1}>
            👤 {selectedUser ? selectedUser.isim : 'Tüm kullanıcılar'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.filterChip}
          onPress={() => {
            setVisibleMonth(filterDate || new Date());
            setCalendarVisible(true);
          }}
        >
          <Text style={styles.filterChipText} numberOfLines={1}>
            📅 {filterDate ? formatDateShort(filterDate) : 'Tüm tarihler'}
          </Text>
        </TouchableOpacity>
        {(selectedUser || filterDate) && (
          <TouchableOpacity
            style={styles.clearChip}
            onPress={() => {
              setSelectedUser(null);
              setFilterDate(null);
            }}
          >
            <Text style={styles.clearChipText}>Temizle</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredCheckIns}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <CheckInCard item={item} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              {checkIns.length === 0 ? 'Henüz giriş kaydı yok' : 'Filtreye uyan giriş kaydı yok'}
            </Text>
          </View>
        }
      />

      {/* Kullanıcı seçim modalı */}
      <Modal visible={userModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Kullanıcı Seç</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => {
                  setSelectedUser(null);
                  setUserModalVisible(false);
                }}
              >
                <Text style={styles.modalOptionText}>Tüm kullanıcılar</Text>
              </TouchableOpacity>
              {staffList.map((s) => (
                <TouchableOpacity
                  key={s.uid}
                  style={styles.modalOption}
                  onPress={() => {
                    setSelectedUser(s);
                    setUserModalVisible(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>{s.isim}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalClose} onPress={() => setUserModalVisible(false)}>
              <Text style={styles.modalCloseText}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Takvim modalı */}
      <Modal visible={calendarVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Tarih Seç</Text>
            <MiniCalendar
              visibleMonth={visibleMonth}
              onChangeMonth={setVisibleMonth}
              selectedDate={filterDate}
              onSelectDate={(d) => {
                setFilterDate(d);
                setCalendarVisible(false);
              }}
            />
            <View style={styles.modalRow}>
              <TouchableOpacity
                style={styles.modalSecondaryBtn}
                onPress={() => {
                  setFilterDate(null);
                  setCalendarVisible(false);
                }}
              >
                <Text style={styles.modalSecondaryText}>Tüm tarihler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalClose} onPress={() => setCalendarVisible(false)}>
                <Text style={styles.modalCloseText}>Kapat</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  appBar: {
    backgroundColor: colors.backgroundAlt,
    paddingTop: 54,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backText: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  appBarTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: '700' },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  filterChip: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
  },
  filterChipText: { color: colors.textPrimary, fontSize: 12, fontWeight: '600' },
  clearChip: {
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  clearChipText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  list: { padding: spacing.lg, paddingBottom: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardName: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
  cardTime: { color: colors.textSecondary, fontSize: 13 },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyText: { color: colors.textSecondary, fontSize: 14 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: spacing.sm },
  modalOption: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalOptionText: { color: colors.textPrimary, fontSize: 14 },
  modalClose: {
    marginTop: spacing.md,
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
  },
  modalCloseText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  modalSecondaryBtn: {
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
  },
  modalSecondaryText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  calHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  calNavBtn: { paddingHorizontal: spacing.sm, paddingVertical: 4 },
  calNavText: { color: colors.primary, fontSize: 20, fontWeight: '700' },
  calTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
  calWeekRow: { flexDirection: 'row', marginBottom: 4 },
  calWeekLabel: {
    flex: 1,
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  calDayCell: { borderRadius: radius.md },
  calDaySelected: { backgroundColor: colors.primary },
  calDayToday: { borderWidth: 1, borderColor: colors.primary },
  calDayText: { color: colors.textPrimary, fontSize: 13 },
  calDayTextSelected: { color: '#fff', fontWeight: '700' },
});