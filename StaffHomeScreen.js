import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { signOut } from 'firebase/auth';

import { auth } from './firebaseConfig';

import {
  colors,
  spacing,
  radius,
  statusMeta,
} from './colors';

import {
  getTasksForStaff,
  getActiveTasks,
  missTask,
} from './taskStore';


const DEFAULT_ACTIVE_DURATION_SECONDS =
  15 * 60;


// ------------------------------------------------------
// SÜRE FORMATLAMA
// ------------------------------------------------------

function formatTime(totalSeconds) {
  const m = Math
    .floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');

  const s = Math
    .floor(totalSeconds % 60)
    .toString()
    .padStart(2, '0');

  return `${m}:${s}`;
}


function formatCountdown(totalSeconds) {
  const days =
    Math.floor(totalSeconds / 86400);

  const hours =
    Math.floor(
      (totalSeconds % 86400) / 3600
    );

  const minutes =
    Math.floor(
      (totalSeconds % 3600) / 60
    );

  if (days > 0) {
    return hours > 0
      ? `${days} gün ${hours} sa`
      : `${days} gün`;
  }

  if (hours > 0) {
    return `${hours} sa ${minutes} dk`;
  }

  return formatTime(totalSeconds);
}


// ------------------------------------------------------
// TARİH FORMATLAMA
// ------------------------------------------------------

function formatDateTime(ms) {
  if (!ms) return null;

  const d = new Date(ms);

  const pad = (n) =>
    n.toString().padStart(2, '0');

  return (
    `${pad(d.getDate())}.` +
    `${pad(d.getMonth() + 1)}.` +
    `${d.getFullYear()} ` +
    `${pad(d.getHours())}:` +
    `${pad(d.getMinutes())}`
  );
}


// ------------------------------------------------------
// KALAN SÜRE
// ------------------------------------------------------

function computeSecondsLeft(task) {
  if (task.endAt) {
    return Math.max(
      0,
      Math.floor(
        (task.endAt - Date.now()) / 1000
      )
    );
  }

  const totalSeconds =
    typeof task.duration === 'number' &&
    task.duration > 0
      ? task.duration * 60
      : DEFAULT_ACTIVE_DURATION_SECONDS;

  if (!task.activatedAt) {
    return totalSeconds;
  }

  const elapsed =
    Math.floor(
      (Date.now() - task.activatedAt) /
        1000
    );

  return Math.max(
    0,
    totalSeconds - elapsed
  );
}


// ------------------------------------------------------
// TAMAMLANMIŞ GÖREV KARTI
// ------------------------------------------------------

function TaskCard({ task }) {
  const meta =
    statusMeta[task.status] ||
    statusMeta.tamamlandi;

  const startText =
    formatDateTime(
      task.startAt ||
      task.activatedAt
    );

  const endText =
    formatDateTime(task.endAt);

  const completedText =
    formatDateTime(
      task.completedAt ||
      task.completionQrTimestamp
    );

  return (
    <View style={styles.card}>

      <View style={styles.cardTop}>

        <Text style={styles.cardTitle}>
          {task.title}
        </Text>

        <View
          style={[
            styles.badge,
            {
              backgroundColor:
                meta.bg,
            },
          ]}
        >
          <View
            style={[
              styles.dot,
              {
                backgroundColor:
                  meta.color,
              },
            ]}
          />

          <Text
            style={[
              styles.badgeText,
              {
                color:
                  meta.color,
              },
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
        {task.time}
        {' · '}
        {task.duration} dk
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

      {!!completedText && (
        <Text style={styles.completedText}>
          Tamamlandı: {completedText}
        </Text>
      )}

      {task.wasMissed && (
        <Text style={styles.missedText}>
          ⚠ Süresi dolduktan sonra
          tamamlandı
        </Text>
      )}

    </View>
  );
}


// ------------------------------------------------------
// AKTİF GÖREV KARTI
// ------------------------------------------------------

function ActiveTaskCard({
  task,
  navigation,
  staffName,
  uid,
  onExpire,
}) {

  const [
    secondsLeft,
    setSecondsLeft,
  ] = useState(
    () =>
      computeSecondsLeft(task)
  );

  const notifiedMiss =
    useRef(
      task.status === 'kacirildi'
    );


  useEffect(() => {

    notifiedMiss.current =
      task.status === 'kacirildi';

    setSecondsLeft(
      computeSecondsLeft(task)
    );

  }, [
    task.id,
    task.activatedAt,
    task.duration,
    task.endAt,
    task.status,
  ]);


  useEffect(() => {

    const interval =
      setInterval(() => {

        setSecondsLeft(
          computeSecondsLeft(task)
        );

      }, 1000);

    return () =>
      clearInterval(interval);

  }, [
    task.activatedAt,
    task.duration,
    task.endAt,
  ]);


  useEffect(() => {

    if (
      secondsLeft <= 0 &&
      !notifiedMiss.current
    ) {

      notifiedMiss.current =
        true;

      missTask(task.id)
        .catch((e) =>
          console.warn(
            'Görev güncellenemedi:',
            e
          )
        );

      onExpire(task.id);
    }

  }, [secondsLeft]);


  const isExpired =
    task.status === 'kacirildi' ||
    secondsLeft <= 0;

  const isUrgent =
    !isExpired &&
    secondsLeft <= 60;


  return (
    <View
      style={[
        styles.activeCard,
        isExpired &&
          styles.activeCardExpired,
      ]}
    >

      <View
        style={
          styles.activeBadgeRow
        }
      >

        <View
          style={[
            styles.activeTag,
            isExpired &&
              styles.activeTagExpired,
          ]}
        >
          <Text
            style={[
              styles.activeTagText,
              isExpired &&
                styles.activeTagTextExpired,
            ]}
          >
            {isExpired
              ? 'SÜRESİ DOLDU'
              : 'AKTİF GÖREV'}
          </Text>
        </View>

        <Text
          style={[
            styles.timerText,
            (isUrgent ||
              isExpired) && {
              color:
                colors.danger,
            },
          ]}
        >
          {isExpired
            ? formatTime(0)
            : formatCountdown(
                secondsLeft
              )}
        </Text>

      </View>


      <Text
        style={
          styles.activeTitle
        }
      >
        {task.title}
      </Text>


      {!!task.detail && (
        <Text
          style={
            styles.activeDetail
          }
        >
          {task.detail}
        </Text>
      )}


      <Text
        style={
          styles.activeMeta
        }
      >
        {task.time}
        {' · '}
        {task.duration} dk
      </Text>


      <Text
        style={
          styles.activeDates
        }
      >
        {formatDateTime(
          task.startAt ||
          task.activatedAt
        )
          ? `Başlangıç: ${formatDateTime(
              task.startAt ||
              task.activatedAt
            )}`
          : ''}

        {(task.startAt ||
          task.activatedAt) &&
        task.endAt
          ? '\n'
          : ''}

        {formatDateTime(task.endAt)
          ? `Bitiş: ${formatDateTime(
              task.endAt
            )}`
          : ''}
      </Text>


      <TouchableOpacity
        style={
          styles.qrButton
        }
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate(
            'QRScan',
            {
              taskId: task.id,
              staffName,
              uid,
            }
          )
        }
      >
        <Text
          style={
            styles.qrButtonText
          }
        >
          Görevi Bitir ve QR Tarat
        </Text>
      </TouchableOpacity>

    </View>
  );
}


// ------------------------------------------------------
// ANA STAFF EKRANI
// ------------------------------------------------------

export default function StaffHomeScreen({
  navigation,
  route,
}) {

  const staffName =
    route?.params?.staffName ??
    '';

  const uid =
    route?.params?.uid ??
    null;


  const [
    myTasks,
    setMyTasks,
  ] = useState([]);


  const [
    activeTasks,
    setActiveTasks,
  ] = useState([]);


  // YENİ:
  // Aktif / Tamamlanan sekmesi
  const [
    selectedTab,
    setSelectedTab,
  ] = useState('active');


  // ------------------------------------------------------
  // EKRAN AÇILDIĞINDA FIRESTORE'U YENİDEN OKU
  // ------------------------------------------------------

  useFocusEffect(
    useCallback(() => {

      let isActive = true;

      Promise.all([
        getTasksForStaff(
          staffName
        ),

        getActiveTasks(
          staffName
        ),

      ])
        .then(
          ([
            tasksData,
            active,
          ]) => {

            if (!isActive)
              return;

            setMyTasks(
              tasksData
            );

            setActiveTasks(
              active
            );
          }
        )
        .catch((e) =>
          console.warn(
            'Görevler alınamadı:',
            e
          )
        );


      return () => {
        isActive = false;
      };

    }, [staffName])
  );


  // ------------------------------------------------------
  // SÜRESİ DOLAN GÖREV
  // ------------------------------------------------------

  const handleTaskExpire =
    useCallback(
      (taskId) => {

        setActiveTasks(
          (prev) =>
            prev.map((t) =>
              t.id === taskId
                ? {
                    ...t,
                    status:
                      'kacirildi',
                  }
                : t
            )
        );

      },
      []
    );


  // ------------------------------------------------------
  // TAMAMLANAN GÖREVLER
  // ------------------------------------------------------

  const completedTasks =
    myTasks
      .filter(
        (task) =>
          task.status ===
          'tamamlandi'
      )
      .sort((a, b) => {

        const aTime =
          a.completedAt ||
          a.completionQrTimestamp ||
          0;

        const bTime =
          b.completedAt ||
          b.completionQrTimestamp ||
          0;

        // EN SON TAMAMLANAN ÜSTTE
        return bTime - aTime;
      });


  // ------------------------------------------------------
  // ÇIKIŞ
  // ------------------------------------------------------

  const handleLogout =
    async () => {

      try {
        await signOut(auth);
      } catch (e) {}

      navigation.replace(
        'Login'
      );
    };


  return (
    <View style={styles.flex}>

      <StatusBar
        style="light"
      />


      {/* ÜST BAR */}

      <View
        style={styles.appBar}
      >

        <View>

          <Text
            style={
              styles.appBarTitle
            }
          >
            Görevlerim
          </Text>

          <Text
            style={
              styles.appBarSubtitle
            }
          >
            {staffName}
          </Text>

        </View>


        <TouchableOpacity
          onPress={
            handleLogout
          }
        >
          <Text
            style={
              styles.logoutText
            }
          >
            Çıkış
          </Text>
        </TouchableOpacity>

      </View>


      {/* SEKME MENÜSÜ */}

      <View style={styles.tabs}>

        <TouchableOpacity
          style={[
            styles.tab,
            selectedTab ===
              'active' &&
              styles.activeTab,
          ]}
          onPress={() =>
            setSelectedTab(
              'active'
            )
          }
        >
          <Text
            style={[
              styles.tabText,
              selectedTab ===
                'active' &&
                styles.activeTabText,
            ]}
          >
            Aktif Görevler
          </Text>
        </TouchableOpacity>


        <TouchableOpacity
          style={[
            styles.tab,
            selectedTab ===
              'completed' &&
              styles.activeTab,
          ]}
          onPress={() =>
            setSelectedTab(
              'completed'
            )
          }
        >
          <Text
            style={[
              styles.tabText,
              selectedTab ===
                'completed' &&
                styles.activeTabText,
            ]}
          >
            Tamamlananlar
          </Text>
        </TouchableOpacity>

      </View>


      {/* AKTİF SEKME */}

      {selectedTab ===
      'active' ? (

        <FlatList
          data={activeTasks}
          keyExtractor={(item) =>
            item.id
          }
          renderItem={({
            item,
          }) => (
            <ActiveTaskCard
              task={item}
              navigation={
                navigation
              }
              staffName={
                staffName
              }
              uid={uid}
              onExpire={
                handleTaskExpire
              }
            />
          )}
          contentContainerStyle={
            styles.list
          }
          showsVerticalScrollIndicator={
            false
          }
          ListHeaderComponent={
            <Text
              style={
                styles.sectionTitle
              }
            >
              Aktif Görevler (
              {activeTasks.length})
            </Text>
          }
          ListEmptyComponent={
            <View
              style={
                styles.noActiveCard
              }
            >
              <Text
                style={
                  styles.noActiveText
                }
              >
                Şu an aktif
                göreviniz yok 🎉
              </Text>
            </View>
          }
        />

      ) : (

        // TAMAMLANANLAR SEKME

        <FlatList
          data={
            completedTasks
          }
          keyExtractor={(item) =>
            item.id
          }
          renderItem={({
            item,
          }) => (
            <TaskCard
              task={item}
            />
          )}
          contentContainerStyle={
            styles.list
          }
          showsVerticalScrollIndicator={
            false
          }
          ListHeaderComponent={
            <Text
              style={
                styles.sectionTitle
              }
            >
              Tamamlanan Görevler (
              {completedTasks.length})
            </Text>
          }
          ListEmptyComponent={
            <View
              style={
                styles.noActiveCard
              }
            >
              <Text
                style={
                  styles.noActiveText
                }
              >
                Henüz tamamlanan
                göreviniz yok
              </Text>
            </View>
          }
        />

      )}

    </View>
  );
}


// ------------------------------------------------------
// STYLES
// ------------------------------------------------------

const styles =
  StyleSheet.create({

    flex: {
      flex: 1,
      backgroundColor:
        colors.background,
    },


    // --------------------------------------------------
    // APP BAR
    // --------------------------------------------------

    appBar: {
      backgroundColor:
        colors.backgroundAlt,

      paddingTop: 54,
      paddingBottom:
        spacing.md,

      paddingHorizontal:
        spacing.lg,

      flexDirection: 'row',

      justifyContent:
        'space-between',

      alignItems: 'center',

      borderBottomWidth: 1,

      borderBottomColor:
        colors.border,
    },


    appBarTitle: {
      color:
        colors.textPrimary,

      fontSize: 18,

      fontWeight: '700',
    },


    appBarSubtitle: {
      color:
        colors.textSecondary,

      fontSize: 12,

      marginTop: 2,
    },


    logoutText: {
      color:
        colors.primary,

      fontSize: 13,

      fontWeight: '600',
    },


    // --------------------------------------------------
    // SEKME
    // --------------------------------------------------

    tabs: {
      flexDirection: 'row',

      backgroundColor:
        colors.backgroundAlt,

      borderBottomWidth: 1,

      borderBottomColor:
        colors.border,
    },


    tab: {
      flex: 1,

      alignItems: 'center',

      paddingVertical: 14,

      borderBottomWidth: 2,

      borderBottomColor:
        'transparent',
    },


    activeTab: {
      borderBottomColor:
        colors.primary,
    },


    tabText: {
      color:
        colors.textSecondary,

      fontSize: 14,

      fontWeight: '600',
    },


    activeTabText: {
      color:
        colors.primary,

      fontWeight: '800',
    },


    // --------------------------------------------------
    // LISTE
    // --------------------------------------------------

    list: {
      padding:
        spacing.lg,

      paddingBottom:
        spacing.xl,
    },


    sectionTitle: {
      color:
        colors.textPrimary,

      fontSize: 15,

      fontWeight: '800',

      marginBottom:
        spacing.md,
    },


    // --------------------------------------------------
    // TAMAMLANAN KART
    // --------------------------------------------------

    card: {
      backgroundColor:
        colors.surface,

      borderRadius:
        radius.md,

      padding:
        spacing.md,

      marginBottom:
        spacing.md,

      borderWidth: 1,

      borderColor:
        colors.border,
    },


    cardTop: {
      flexDirection: 'row',

      justifyContent:
        'space-between',

      alignItems:
        'flex-start',
    },


    cardTitle: {
      color:
        colors.textPrimary,

      fontSize: 15,

      fontWeight: '700',

      flex: 1,

      marginRight:
        spacing.sm,
    },


    cardDetail: {
      color:
        colors.textSecondary,

      fontSize: 13,

      marginTop: 6,

      lineHeight: 18,
    },


    cardMeta: {
      color:
        colors.textSecondary,

      fontSize: 13,

      marginTop: 6,
    },


    cardDates: {
      color:
        colors.textSecondary,

      fontSize: 12,

      marginTop: 6,

      lineHeight: 18,
    },


    completedText: {
      color:
        colors.success,

      fontSize: 12,

      fontWeight: '600',

      marginTop: 7,
    },


    missedText: {
      color:
        colors.danger,

      fontSize: 12,

      marginTop: 7,
    },


    badge: {
      flexDirection: 'row',

      alignItems:
        'center',

      paddingHorizontal: 10,

      paddingVertical: 5,

      borderRadius:
        radius.pill,

      gap: 6,
    },


    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },


    badgeText: {
      fontSize: 11,

      fontWeight: '700',
    },


    // --------------------------------------------------
    // AKTİF GÖREV KARTI
    // --------------------------------------------------

    activeCard: {
      backgroundColor:
        colors.surface,

      borderRadius:
        radius.lg,

      padding:
        spacing.lg,

      marginBottom:
        spacing.lg,

      borderWidth: 2,

      borderColor:
        colors.primary,

      shadowColor:
        colors.primary,

      shadowOpacity:
        0.35,

      shadowRadius: 16,

      shadowOffset: {
        width: 0,
        height: 6,
      },

      elevation: 6,
    },


    activeCardExpired: {
      borderColor:
        colors.danger,

      shadowColor:
        colors.danger,
    },


    activeBadgeRow: {
      flexDirection: 'row',

      justifyContent:
        'space-between',

      alignItems: 'center',

      marginBottom:
        spacing.sm,
    },


    activeTag: {
      backgroundColor:
        'rgba(59,130,246,0.15)',

      paddingHorizontal: 10,

      paddingVertical: 5,

      borderRadius:
        radius.pill,
    },


    activeTagExpired: {
      backgroundColor:
        'rgba(239,68,68,0.15)',
    },


    activeTagText: {
      color:
        colors.primary,

      fontSize: 11,

      fontWeight: '800',

      letterSpacing: 0.5,
    },


    activeTagTextExpired: {
      color:
        colors.danger,
    },


    timerText: {
      color:
        colors.textPrimary,

      fontSize: 22,

      fontWeight: '800',

      fontVariant: [
        'tabular-nums',
      ],
    },


    activeTitle: {
      color:
        colors.textPrimary,

      fontSize: 18,

      fontWeight: '700',
    },


    activeDetail: {
      color:
        colors.textSecondary,

      fontSize: 13,

      marginTop: 4,

      lineHeight: 18,
    },


    activeMeta: {
      color:
        colors.textSecondary,

      fontSize: 13,

      marginTop: 4,
    },


    activeDates: {
      color:
        colors.textSecondary,

      fontSize: 12,

      marginTop: 4,

      marginBottom:
        spacing.md,

      lineHeight: 18,
    },


    qrButton: {
      backgroundColor:
        colors.primary,

      borderRadius:
        radius.pill,

      paddingVertical: 14,

      alignItems:
        'center',
    },


    qrButtonText: {
      color: '#fff',

      fontSize: 15,

      fontWeight: '700',
    },


    noActiveCard: {
      backgroundColor:
        colors.surface,

      borderRadius:
        radius.lg,

      borderWidth: 1,

      borderColor:
        colors.border,

      paddingVertical:
        spacing.xl,

      paddingHorizontal:
        spacing.md,

      alignItems:
        'center',

      marginBottom:
        spacing.lg,
    },


    noActiveText: {
      color:
        colors.textSecondary,

      fontSize: 14,

      textAlign: 'center',
    },

  });