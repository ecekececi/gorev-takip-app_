import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, statusMeta } from './colors';
import { getAllTasks, getStaffList } from './taskStore';

const ALL_STAFF = 'Tümü';

function TaskCard({ task }) {
  const meta = statusMeta[task.status];
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle}>{task.title}</Text>
        <View style={[styles.badge, { backgroundColor: meta.bg }]}>
          <View style={[styles.dot, { backgroundColor: meta.color }]} />
          <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
        </View>
      </View>
      {task.wasMissed && (
        <Text style={styles.missedNote}>
          ⚠️ Kaçırılmış görev — süresi dolduktan sonra tamamlandı
        </Text>
      )}
      {!!task.detail && <Text style={styles.cardDetail}>{task.detail}</Text>}
      <Text style={styles.cardMeta}>{task.assignee}</Text>
      <Text style={styles.cardMeta}>
        {task.time} · {task.duration} dk
      </Text>
    </View>
  );
}

export default function CompletedTasksScreen({ navigation }) {
  const [tasks, setTasks] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(ALL_STAFF);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      getAllTasks()
        .then((data) => {
          if (isActive) {
            setTasks(data.filter((t) => t.status === 'tamamlandi'));
          }
        })
        .catch((e) => console.warn('Görevler alınamadı:', e));

      getStaffList()
        .then((list) => {
          if (isActive) setStaffList(list);
        })
        .catch(() => setStaffList([]));

      return () => {
        isActive = false;
      };
    }, [])
  );

  const filteredTasks =
    selectedStaff === ALL_STAFF
      ? tasks
      : tasks.filter((t) => t.assignee === selectedStaff);

  return (
    <View style={styles.flex}>
      <StatusBar style="light" />
      <View style={styles.appBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹ Geri</Text>
        </TouchableOpacity>
        <Text style={styles.appBarTitle}>Tamamlanan Görevler</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>Kullanıcı</Text>
        <TouchableOpacity
          style={styles.filterTrigger}
          onPress={() => setDropdownOpen(true)}
        >
          <Text style={styles.filterTriggerText}>{selectedStaff}</Text>
          <Text style={styles.filterChevron}>⌄</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TaskCard task={item} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Tamamlanmış görev bulunamadı</Text>
          </View>
        }
      />

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
            <Text style={styles.modalTitle}>Kullanıcı Seçin</Text>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                setSelectedStaff(ALL_STAFF);
                setDropdownOpen(false);
              }}
            >
              <Text style={styles.modalOptionText}>{ALL_STAFF}</Text>
            </TouchableOpacity>
            {staffList.map((name) => (
              <TouchableOpacity
                key={name}
                style={styles.modalOption}
                onPress={() => {
                  setSelectedStaff(name);
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

  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  filterLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  filterTrigger: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterTriggerText: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  filterChevron: { color: colors.textSecondary, fontSize: 14 },

  list: { padding: spacing.lg, paddingBottom: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 1,
    marginRight: spacing.sm,
  },
  cardMeta: { color: colors.textSecondary, fontSize: 13, marginTop: 6 },
  cardDetail: { color: colors.textSecondary, fontSize: 13, marginTop: 6, lineHeight: 18 },
  missedNote: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },

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
});