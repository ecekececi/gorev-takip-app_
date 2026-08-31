import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import QRCode from 'react-native-qrcode-svg';
import { colors, spacing, radius } from './colors';

// Bu ekran, giriş noktasına yerleştirilen bir tablet/telefonda açık
// tutulmak için tasarlandı. kullanıcı bu ekrandaki QR kodu okutarak
// giriş yapar / görev bitirir. DEVICE_ID, QRScanScreen'deki
// EXPECTED_DEVICE_ID ile birebir aynı olmalı.
const DEVICE_ID = 'cihaz1';
const REFRESH_SECONDS = 60;

function buildQrValue() {
  return JSON.stringify({ deviceId: DEVICE_ID, ts: Date.now() });
}

export default function DeviceQRScreen() {
  const [qrValue, setQrValue] = useState(buildQrValue());
  const [secondsLeft, setSecondsLeft] = useState(REFRESH_SECONDS);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setQrValue(buildQrValue());
          return REFRESH_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.flex}>
      <StatusBar style="light" />
      <View style={styles.center}>
        <Text style={styles.title}>Giriş / Görev QR Kodu</Text>
        <Text style={styles.subtitle}>Cihaz Kimliği: {DEVICE_ID}</Text>

        <View style={styles.qrWrap}>
          <QRCode value={qrValue} size={240} backgroundColor="#ffffff" color="#000000" />
        </View>

        <Text style={styles.timerText}>{secondsLeft} sn sonra yenilenecek</Text>
        <Text style={styles.hintText}>
          Bu ekranı kapatma — kullanıcı bu kodu okutarak giriş yapıyor.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 19,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: spacing.xl,
  },
  qrWrap: {
    backgroundColor: '#ffffff',
    padding: spacing.lg,
    borderRadius: radius.lg,
  },
  timerText: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: spacing.lg,
    fontVariant: ['tabular-nums'],
  },
  hintText: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
