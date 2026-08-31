import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from 'react-native';

import { StatusBar } from 'expo-status-bar';
import { colors, spacing, radius } from './colors';
import { completeTask } from './taskStore';

export default function ResultScreen({ navigation, route }) {
  const qrIsSuccess = route?.params?.isSuccess ?? false;

  const taskId = route?.params?.taskId ?? null;
  const staffName = route?.params?.staffName ?? '';
  const uid = route?.params?.uid ?? null;

  const deviceTimestamp =
    route?.params?.deviceTimestamp ?? null;

  const qrToken =
    route?.params?.qrToken ?? null;

  const qrDeviceId =
    route?.params?.qrDeviceId ?? null;

  const scaleAnim = useRef(new Animated.Value(0)).current;

  const [processing, setProcessing] = useState(qrIsSuccess);
  const [finalSuccess, setFinalSuccess] = useState(
    qrIsSuccess ? null : false
  );

  useEffect(() => {
    let mounted = true;
    let redirectTimer = null;

    const animateResult = () => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 60,
        useNativeDriver: true,
      }).start();
    };

    async function finishTask() {
      // QR zaten geçersiz geldiyse Firestore'a hiçbir şey yazma.
      if (!qrIsSuccess) {
        if (!mounted) return;

        setProcessing(false);
        setFinalSuccess(false);

        animateResult();
        return;
      }

      try {
        console.log('RESULT -> completeTask', {
          taskId,
          deviceTimestamp,
          qrToken,
          qrDeviceId,
        });

        await completeTask(taskId, {
          deviceTimestamp,
          qrToken,
          qrDeviceId,
        });

        if (!mounted) return;

        console.log('RESULT -> görev başarıyla kaydedildi');

        setFinalSuccess(true);
        setProcessing(false);

        animateResult();

        // Kısa süre başarı ekranını göster,
        // sonra görev listesini yeniden aç.
        redirectTimer = setTimeout(() => {
          navigation.replace('StaffHome', {
            staffName,
            uid,
          });
        }, 1800);
      } catch (error) {
        console.warn(
          'Görev güncellenemedi:',
          error
        );

        if (!mounted) return;

        setFinalSuccess(false);
        setProcessing(false);

        animateResult();
      }
    }

    finishTask();

    return () => {
      mounted = false;

      if (redirectTimer) {
        clearTimeout(redirectTimer);
      }
    };
  }, []);

  // Firestore güncellemesi sürerken
  if (processing) {
    return (
      <View style={styles.flex}>
        <StatusBar style="light" />

        <View style={styles.center}>
          <ActivityIndicator
            size="large"
            color={colors.primary}
          />

          <Text style={styles.processingText}>
            QR doğrulandı, görev kaydediliyor…
          </Text>
        </View>
      </View>
    );
  }

  const resultColor =
    finalSuccess
      ? colors.success
      : colors.danger;

  return (
    <View style={styles.flex}>
      <StatusBar style="light" />

      <View style={styles.center}>
        <Animated.View
          style={[
            styles.iconCircle,
            {
              borderColor: resultColor,
              transform: [
                {
                  scale: scaleAnim,
                },
              ],
            },
          ]}
        >
          <Text
            style={[
              styles.icon,
              {
                color: resultColor,
              },
            ]}
          >
            {finalSuccess ? '✓' : '✕'}
          </Text>
        </Animated.View>

        <Text style={styles.title}>
          {finalSuccess
            ? 'Görev Başarıyla Tamamlandı'
            : qrIsSuccess
              ? 'Görev Kaydedilemedi'
              : 'Süre Doldu veya Hatalı Kod'}
        </Text>

        {finalSuccess ? (
          <Text style={styles.subtitle}>
            Görevleriniz güncelleniyor…
          </Text>
        ) : (
          <TouchableOpacity
            style={styles.retryButton}
            activeOpacity={0.85}
            onPress={() =>
              navigation.replace('QRScan', {
                taskId,
                staffName,
                uid,
              })
            }
          >
            <Text style={styles.retryButtonText}>
              Tekrar Dene
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },

  processingText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: spacing.lg,
    textAlign: 'center',
  },

  iconCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },

  icon: {
    fontSize: 52,
    fontWeight: '800',
  },

  title: {
    color: colors.textPrimary,
    fontSize: 19,
    fontWeight: '700',
    textAlign: 'center',
  },

  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: spacing.sm,
    textAlign: 'center',
  },

  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
    marginTop: spacing.lg,
  },

  retryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});