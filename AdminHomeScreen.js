import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar as RNStatusBar,
} from 'react-native';

import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { signOut } from 'firebase/auth';

import { auth } from './firebaseConfig';
import { colors, spacing, radius, statusMeta } from './colors';
import { getAllTasks } from './taskStore';

function formatDateTime(ms) {
  if (!ms) return null;

  const d = new Date(ms);
  const pad = (n) => n.toString().padStart(2, '0');

  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function formatDuration(totalMinutes) {
  if (typeof totalMinutes !== 'number' || totalMinutes <= 0) return null;

  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = Math.floor(totalMinutes % 60);

  const parts = [];

  if (days > 0) parts.push(`${days} gün`);
  if (hours > 0) parts.push(`${hours} sa`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes} dk`);

  return parts.join(' ');
}

function TaskCard({ task }) {
  const meta =
    statusMeta[task.status] || statusMeta.bekliyor;

  const startText =
    formatDateTime(task.startAt || task.activatedAt);

  const endText =
    formatDateTime(task.endAt);

  const completedText =
    formatDateTime(task.completedAt);

  const durationText =
    formatDuration(task.duration);

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle}>
          {task.title}
        </Text>

        <View
          style={[
            styles.badge,
            { backgroundColor: meta.bg },
          ]}
        >
          <View
            style={[
              styles.dot,
              { backgroundColor: meta.color },
            ]}
          />

          <Text
            style={[
              styles.badgeText,
              { color: meta.color },
            ]}
          >
            {meta.label}
          </Text>
        </View>
      </View>

      {!!task.detail && (
        <Text style={styles.cardDetail}>
          {task.detail}
        </Text>
      )}

      <Text style={styles.cardMeta}>
        👤 {task.assignee}
      </Text>

      <Text style={styles.cardMeta}>
        {task.time}
        {durationText
          ? ` · ${durationText}`
          : ''}
      </Text>

      {(startText || endText) && (
        <Text style={styles.cardDates}>
          {startText
            ? `Başlangıç: ${startText}`
            : ''}

          {startText && endText
            ? '\n'
            : ''}

          {endText
            ? `Bitiş: ${endText}`
            : ''}
        </Text>
      )}

      {task.status === 'tamamlandi' &&
        completedText && (
          <Text style={styles.completedDate}>
            Tamamlanma: {completedText}
          </Text>
        )}

      {task.wasMissed && (
        <Text style={styles.missedText}>
          ⚠ Süresi geçtikten sonra tamamlandı
        </Text>
      )}
    </View>
  );
}

export default function AdminHomeScreen({
  navigation,
}) {
  const [tasks, setTasks] = useState([]);
  const [selectedTab, setSelectedTab] =
    useState('active');

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      getAllTasks()
        .then((data) => {
          if (isActive) {
            setTasks(data);
          }
        })
        .catch((e) =>
          console.warn(
            'Görevler alınamadı:',
            e
          )
        );

      return () => {
        isActive = false;
      };
    }, [])
  );

  // Tamamlanmamış görevler
  const activeTasks = tasks
  .filter(
    (task) =>
      task.status === 'bekliyor' ||
      task.status === 'kacirildi'
  )
  .sort((a, b) => {
    const aTime =
      a.createdAt ||
      a.startAt ||
      a.activatedAt ||
      0;

    const bTime =
      b.createdAt ||
      b.startAt ||
      b.activatedAt ||
      0;

    return bTime - aTime;
  });

  const completedTasks = tasks.filter(
    (task) =>
      task.status === 'tamamlandi'
  );

  const visibleTasks =
    selectedTab === 'active'
      ? activeTasks
      : completedTasks;

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {}

    navigation.replace('Login');
  };

  return (
    <View style={styles.flex}>
      <StatusBar style="light" />

      {/* ÜST BAR */}
      <View style={styles.appBar}>
        <View style={styles.titleArea}>
          <Text style={styles.appBarTitle}>
            Görev Takip Paneli
          </Text>

          <Text
            style={styles.appBarSubtitle}
          >
            {activeTasks.length} aktif görev
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleLogout}
          style={styles.logoutButton}
        >
          <Text style={styles.logoutText}>
            Çıkış
          </Text>
        </TouchableOpacity>
      </View>

      {/* SEKMELER */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[
            styles.tab,
            selectedTab === 'active' &&
              styles.activeTab,
          ]}
          onPress={() =>
            setSelectedTab('active')
          }
        >
          <Text
            style={[
              styles.tabText,
              selectedTab === 'active' &&
                styles.activeTabText,
            ]}
          >
            Aktif Görevler
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            selectedTab === 'completed' &&
              styles.activeTab,
          ]}
          onPress={() =>
            setSelectedTab('completed')
          }
        >
          <Text
            style={[
              styles.tabText,
              selectedTab === 'completed' &&
                styles.activeTabText,
            ]}
          >
            Tamamlananlar
          </Text>
        </TouchableOpacity>
      </View>

      {/* GÖREVLER */}
      <FlatList
        data={visibleTasks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TaskCard task={item} />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Text style={styles.sectionTitle}>
            {selectedTab === 'active'
              ? `Aktif Görevler (${activeTasks.length})`
              : `Tamamlanan Görevler (${completedTasks.length})`}
          </Text>
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              {selectedTab === 'active'
                ? 'Aktif görev bulunmuyor 🎉'
                : 'Henüz tamamlanan görev yok'}
            </Text>
          </View>
        }
      />

      {/* YENİ GÖREV */}
      {selectedTab === 'active' && (
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.85}
          onPress={() =>
            navigation.navigate('NewTask')
          }
        >
          <Text style={styles.fabIcon}>
            +
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },

  appBar: {
    backgroundColor: colors.backgroundAlt,
    paddingTop:
      (RNStatusBar.currentHeight || 24) +
      spacing.md,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,

    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',

    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  titleArea: {
    flex: 1,
    marginRight: spacing.md,
  },

  appBarTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
  },

  appBarSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 3,
  },

  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  logoutText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },

  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundAlt,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },

  activeTab: {
    borderBottomColor: colors.primary,
  },

  tabText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },

  activeTabText: {
    color: colors.primary,
    fontWeight: '800',
  },

  list: {
    padding: spacing.lg,
    paddingBottom: 110,
  },

  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: spacing.md,
  },

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
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: spacing.sm,
  },

  cardDetail: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 8,
    lineHeight: 18,
  },

  cardMeta: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 7,
  },

  cardDates: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 7,
    lineHeight: 18,
  },

  completedDate: {
    color: colors.success,
    fontSize: 12,
    marginTop: 8,
    fontWeight: '600',
  },

  missedText: {
    color: colors.danger,
    fontSize: 12,
    marginTop: 7,
  },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },

  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },

  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },

  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
  },

  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl,

    width: 58,
    height: 58,
    borderRadius: 29,

    backgroundColor: colors.primary,

    alignItems: 'center',
    justifyContent: 'center',

    elevation: 8,
  },

  fabIcon: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '400',
  },
});