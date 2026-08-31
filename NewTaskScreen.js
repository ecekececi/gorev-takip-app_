import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, spacing, radius } from './colors';
import { getStaffList, addTask } from './taskStore';

export default function NewTaskScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [assignee, setAssignee] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [staffList, setStaffList] = useState([]);

  // kullanıcı listesi artık sabit değil; Firestore'daki "kullanicilar"
  // koleksiyonundan (rol == 'staff' olanlar) çekiliyor.
  useEffect(() => {
    getStaffList().then(setStaffList).catch(() => setStaffList([]));
  }, []);

  // Başlangıç: tarih ve saat seçilir
  const [startDate, setStartDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);

  // Bitiş: hem tarih hem saat seçilir
  const [endDate, setEndDate] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  const formattedStartDate = startDate.toLocaleDateString('tr-TR');
  const formattedStartTime = startTime.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const formattedEndDate = endDate.toLocaleDateString('tr-TR');
  const formattedEndTime = endTime.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const onChangeStartDate = (event, selected) => {
    setShowStartDatePicker(Platform.OS === 'ios');
    if (selected) setStartDate(selected);
  };

  const onChangeStartTime = (event, selected) => {
    setShowStartTimePicker(Platform.OS === 'ios');
    if (selected) setStartTime(selected);
  };

  const onChangeEndDate = (event, selected) => {
    setShowEndDatePicker(Platform.OS === 'ios');
    if (selected) setEndDate(selected);
  };

  const onChangeEndTime = (event, selected) => {
    setShowEndTimePicker(Platform.OS === 'ios');
    if (selected) setEndTime(selected);
  };

  const handleSave = async () => {
    if (!title || !assignee) return;

    // Başlangıç tarih + saatini birleştir
    const startDateTime = new Date(startDate);
    startDateTime.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);

    // Bitiş tarih + saatini birleştir
    const endDateTime = new Date(endDate);
    endDateTime.setHours(endTime.getHours(), endTime.getMinutes(), 0, 0);

    // Süreyi (dk) otomatik hesapla
    const durationMinutes = Math.max(
      0,
      Math.round((endDateTime - startDateTime) / 60000)
    );

    try {
      await addTask({
        title,
        detail,
        assignee,
        time: formattedStartTime,
        duration: durationMinutes,
        // Sayacın gerçek başlangıç/bitiş saatine göre hesaplanabilmesi için
        // tam tarih+saat bilgisini de (timestamp olarak) kaydediyoruz.
        startAt: startDateTime.getTime(),
        endAt: endDateTime.getTime(),
      });
      navigation.goBack();
    } catch (e) {
      console.warn('Görev kaydedilemedi:', e);
    }
  };

  return (
    <View style={styles.flex}>
      <StatusBar style="light" />
      <View style={styles.appBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹ Geri</Text>
        </TouchableOpacity>
        <Text style={styles.appBarTitle}>Yeni Görev</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Görev başlığı */}
        <View style={styles.fieldCard}>
          <Text style={styles.label}>Görev Başlığı</Text>
          <TextInput
            style={styles.input}
            placeholder=""
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* Görev detayı */}
        <View style={styles.fieldCard}>
          <Text style={styles.label}>Görev Detayı</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Görevle ilgili açıklama, talimat veya notlar…"
            placeholderTextColor={colors.textMuted}
            value={detail}
            onChangeText={setDetail}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* kullanıcı seçimi */}
        <View style={styles.fieldCard}>
          <Text style={styles.label}>kullanıcı</Text>
          <TouchableOpacity
            style={styles.dropdownTrigger}
            onPress={() => setDropdownOpen(true)}
          >
            <Text
              style={[
                styles.dropdownText,
                !assignee && { color: colors.textMuted },
              ]}
            >
              {assignee || 'kullanıcı seçin'}
            </Text>
            <Text style={styles.dropdownChevron}>⌄</Text>
          </TouchableOpacity>
        </View>

        {/* Başlangıç tarihi ve saati */}
        <View style={styles.fieldCard}>
          <Text style={styles.label}>Başlangıç Tarihi ve Saati</Text>
          <View style={styles.row}>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowStartDatePicker(true)}
            >
              <Text style={styles.pickerButtonText}>📅 {formattedStartDate}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowStartTimePicker(true)}
            >
              <Text style={styles.pickerButtonText}>🕒 {formattedStartTime}</Text>
            </TouchableOpacity>
          </View>

          {showStartDatePicker && (
            <DateTimePicker
              value={startDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={onChangeStartDate}
            />
          )}
          {showStartTimePicker && (
            <DateTimePicker
              value={startTime}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onChangeStartTime}
            />
          )}
        </View>

        {/* Bitiş tarihi ve saati */}
        <View style={styles.fieldCard}>
          <Text style={styles.label}>Bitiş Tarihi ve Saati</Text>
          <View style={styles.row}>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowEndDatePicker(true)}
            >
              <Text style={styles.pickerButtonText}>📅 {formattedEndDate}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowEndTimePicker(true)}
            >
              <Text style={styles.pickerButtonText}>🕒 {formattedEndTime}</Text>
            </TouchableOpacity>
          </View>

          {showEndDatePicker && (
            <DateTimePicker
              value={endDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={onChangeEndDate}
            />
          )}
          {showEndTimePicker && (
            <DateTimePicker
              value={endTime}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onChangeEndTime}
            />
          )}
        </View>

        <TouchableOpacity
          style={styles.saveButton}
          activeOpacity={0.85}
          onPress={handleSave}
        >
          <Text style={styles.saveButtonText}>Görevi Kaydet</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* kullanıcı dropdown modal */}
      <Modal
        visible={dropdownOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDropdownOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDropdownOpen(false)}
        >
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>kullanıcı Seçin</Text>
            {staffList.map((name) => (
              <TouchableOpacity
                key={name}
                style={styles.modalOption}
                onPress={() => {
                  setAssignee(name);
                  setDropdownOpen(false);
                }}
              >
                <Text style={styles.modalOptionText}>{name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
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
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  fieldCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontSize: 15,
  },
  textArea: {
    minHeight: 90,
  },
  dropdownTrigger: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: { color: colors.textPrimary, fontSize: 15 },
  dropdownChevron: { color: colors.textSecondary, fontSize: 16 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  pickerButton: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    alignItems: 'center',
  },
  pickerButtonText: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  saveButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  modalOption: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalOptionText: { color: colors.textPrimary, fontSize: 15 },
})