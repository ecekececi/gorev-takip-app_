import React, {
  useState,
  useRef,
} from 'react';

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';

import { StatusBar } from 'expo-status-bar';

import {
  CameraView,
  useCameraPermissions,
} from 'expo-camera';

import {
  colors,
  spacing,
  radius,
} from './colors';

// ESP32 AYARLARIYLA AYNI
const EXPECTED_DEVICE_ID = 'cihaz1';

const SECRET_KEY =
  'ornek_gizli_anahtar_123';

const QR_UPDATE_SEC = 5;

// QR 5 saniyede yenileniyor.
// Tarama gecikmesi için biraz tolerans bırakıyoruz.
const QR_MAX_AGE_MS = 12 * 1000;

// RTC/telefon arasında küçük fark olabilir.
const QR_FUTURE_TOLERANCE_MS =
  5 * 1000;


// ------------------------------------------------
// DJB2
// ------------------------------------------------

function djb2Token(str) {
  let hash = 5381;

  for (
    let i = 0;
    i < str.length;
    i++
  ) {
    hash =
      (
        (hash << 5) +
        hash +
        str.charCodeAt(i)
      ) >>> 0;
  }

  return hash
    .toString(16)
    .toUpperCase()
    .padStart(8, '0');
}


// ------------------------------------------------
// PAYLOAD OKUMA
// DEVICE:cihaz1;GEN:...;TOKEN:...
// ------------------------------------------------

function parsePayload(rawData) {
  const result = {};

  rawData
    .trim()
    .split(';')
    .forEach((part) => {

      const idx =
        part.indexOf(':');

      if (idx === -1) return;

      const key =
        part
          .slice(0, idx)
          .trim();

      const value =
        part
          .slice(idx + 1)
          .trim();

      result[key] = value;
    });

  return result;
}


// ------------------------------------------------
// QR DOĞRULAMA
// ------------------------------------------------

function validateDeviceQr(rawData) {
  try {
    console.log(
      '--------------------------'
    );

    console.log(
      'OKUNAN QR:',
      rawData
    );

    const {
      DEVICE,
      GEN,
      TOKEN,
    } = parsePayload(rawData);

    console.log(
      'DEVICE:',
      DEVICE
    );

    console.log(
      'GEN:',
      GEN
    );

    console.log(
      'TOKEN:',
      TOKEN
    );

    // DEVICE
    if (
      DEVICE !==
      EXPECTED_DEVICE_ID
    ) {
      console.warn(
        'QR REDDEDİLDİ: DEVICE yanlış'
      );

      return {
        isValid: false,
        reason: 'wrong-device',
      };
    }

    if (!GEN) {
      console.warn(
        'QR REDDEDİLDİ: GEN yok'
      );

      return {
        isValid: false,
        reason: 'missing-gen',
      };
    }

    if (!TOKEN) {
      console.warn(
        'QR REDDEDİLDİ: TOKEN yok'
      );

      return {
        isValid: false,
        reason: 'missing-token',
      };
    }

    const unixTime =
      Number(GEN);

    if (
      !Number.isFinite(unixTime)
    ) {
      console.warn(
        'QR REDDEDİLDİ: GEN sayı değil'
      );

      return {
        isValid: false,
        reason: 'invalid-time',
      };
    }

    const deviceTimestamp =
      unixTime * 1000;

    const phoneTimestamp =
      Date.now();

    const age =
      phoneTimestamp -
      deviceTimestamp;

    console.log(
      'Telefon zamanı:',
      new Date(
        phoneTimestamp
      ).toISOString()
    );

    console.log(
      'Cihaz zamanı:',
      new Date(
        deviceTimestamp
      ).toISOString()
    );

    console.log(
      'Saat farkı:',
      age / 1000,
      'sn'
    );

    // ÇOK ESKİ QR
    if (
      age >
      QR_MAX_AGE_MS
    ) {
      console.warn(
        'QR REDDEDİLDİ: QR eski'
      );

      return {
        isValid: false,
        reason: 'expired',
      };
    }

    // RTC TELEFONDAN ÇOK İLERİ
    if (
      age <
      -QR_FUTURE_TOLERANCE_MS
    ) {
      console.warn(
        'QR REDDEDİLDİ: RTC zamanı ileride'
      );

      return {
        isValid: false,
        reason: 'future-time',
      };
    }

    const timeSlot =
      Math.floor(
        unixTime /
        QR_UPDATE_SEC
      );

    const expectedToken =
      djb2Token(
        DEVICE +
        String(timeSlot) +
        SECRET_KEY
      );

    console.log(
      'Time slot:',
      timeSlot
    );

    console.log(
      'Beklenen token:',
      expectedToken
    );

    console.log(
      'Okunan token:',
      TOKEN.toUpperCase()
    );

    if (
      TOKEN.toUpperCase() !==
      expectedToken
    ) {
      console.warn(
        'QR REDDEDİLDİ: TOKEN yanlış'
      );

      return {
        isValid: false,
        reason: 'wrong-token',
      };
    }

    console.log(
      '✅ QR GEÇERLİ'
    );

    return {
      isValid: true,

      deviceId:
        DEVICE,

      deviceTimestamp,

      token:
        TOKEN.toUpperCase(),
    };

  } catch (error) {

    console.warn(
      'QR doğrulama hatası:',
      error
    );

    return {
      isValid: false,
      reason: 'parse-error',
    };
  }
}


// ------------------------------------------------
// SCREEN
// ------------------------------------------------

export default function QRScanScreen({
  navigation,
  route,
}) {

  const [
    permission,
    requestPermission,
  ] = useCameraPermissions();

  const scannedRef =
    useRef(false);

  const taskId =
    route?.params?.taskId ??
    null;

  const staffName =
    route?.params?.staffName ??
    '';

  const uid =
    route?.params?.uid ??
    null;


  const handleBarcodeScanned = ({ data }) => {
  if (scannedRef.current) {
    return;
  }

  scannedRef.current = true;

  const result = validateDeviceQr(data);

  // QR geçerli değilse doğrudan hata ekranına git.
  if (!result.isValid) {
    navigation.replace('Result', {
      isSuccess: false,
      taskId,
      staffName,
      uid,

      deviceTimestamp: null,
      qrToken: null,
      qrDeviceId: null,

      qrErrorReason:
        result.reason ?? null,
    });

    return;
  }

  // QR geçerliyse önce kullanıcıdan onay al.
  Alert.alert(
    'Görevi Tamamla',
    'Bu görevi tamamlamak istediğinize emin misiniz?',
    [
      {
        text: 'İptal',
        style: 'cancel',
        onPress: () => {
          // Aynı ekranda tekrar QR okutulabilsin.
          scannedRef.current = false;
        },
      },
      {
        text: 'Evet, Tamamla',
        style: 'default',
        onPress: () => {
          navigation.replace('Result', {
            isSuccess: true,

            taskId,
            staffName,
            uid,

            deviceTimestamp:
              result.deviceTimestamp,

            qrToken:
              result.token,

            qrDeviceId:
              result.deviceId,

            qrErrorReason: null,
          });
        },
      },
    ],
    {
      cancelable: false,
    }
  );
};


  if (!permission) {
    return (
      <View
        style={styles.flex}
      />
    );
  }


  if (!permission.granted) {
    return (
      <View
        style={[
          styles.flex,
          styles.center,
        ]}
      >
        <StatusBar
          style="light"
        />

        <Text
          style={
            styles.permissionTitle
          }
        >
          Kamera İzni Gerekli
        </Text>

        <Text
          style={
            styles.permissionText
          }
        >
          Görevi tamamlamak için
          cihazdaki QR kodunu
          okutmanız gerekiyor.
        </Text>

        <TouchableOpacity
          style={
            styles.permissionButton
          }
          onPress={
            requestPermission
          }
        >
          <Text
            style={
              styles.permissionButtonText
            }
          >
            İzin Ver
          </Text>
        </TouchableOpacity>
      </View>
    );
  }


  return (
    <View style={styles.flex}>

      <StatusBar
        style="light"
      />

      <CameraView
        style={
          StyleSheet.absoluteFillObject
        }
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={
          handleBarcodeScanned
        }
      />

      <View
        style={styles.overlay}
        pointerEvents="box-none"
      >

        <TouchableOpacity
          style={
            styles.closeButton
          }
          onPress={() =>
            navigation.goBack()
          }
        >
          <Text
            style={
              styles.closeButtonText
            }
          >
            ✕
          </Text>
        </TouchableOpacity>

        <View
          style={
            styles.frameWrap
          }
        >
          <View
            style={
              styles.frame
            }
          />

          <Text
            style={
              styles.hintText
            }
          >
            Cihazdaki QR kodunu
            kare içine hizalayın
          </Text>

        </View>
      </View>

    </View>
  );
}


const FRAME_SIZE = 240;


const styles =
  StyleSheet.create({

    flex: {
      flex: 1,
      backgroundColor:
        colors.background,
    },

    center: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
    },

    overlay: {
      flex: 1,
      backgroundColor:
        'rgba(18,24,36,0.35)',
      alignItems: 'center',
      justifyContent: 'center',
    },

    closeButton: {
      position: 'absolute',
      top: 54,
      left: spacing.lg,

      width: 40,
      height: 40,

      borderRadius: 20,

      backgroundColor:
        'rgba(31,41,61,0.8)',

      alignItems: 'center',
      justifyContent: 'center',
    },

    closeButtonText: {
      color: colors.textPrimary,
      fontSize: 18,
      fontWeight: '700',
    },

    frameWrap: {
      alignItems: 'center',
    },

    frame: {
      width: FRAME_SIZE,
      height: FRAME_SIZE,

      borderRadius: radius.lg,

      borderWidth: 3,
      borderColor:
        colors.primary,

      backgroundColor:
        'rgba(59,130,246,0.08)',
    },

    hintText: {
      color:
        colors.textPrimary,

      fontSize: 13,

      marginTop:
        spacing.lg,

      backgroundColor:
        'rgba(18,24,36,0.7)',

      paddingHorizontal:
        spacing.md,

      paddingVertical: 8,

      borderRadius:
        radius.pill,

      textAlign: 'center',
    },

    permissionTitle: {
      color:
        colors.textPrimary,

      fontSize: 18,

      fontWeight: '700',

      marginBottom:
        spacing.sm,
    },

    permissionText: {
      color:
        colors.textSecondary,

      fontSize: 14,

      textAlign: 'center',

      marginBottom:
        spacing.lg,
    },

    permissionButton: {
      backgroundColor:
        colors.primary,

      borderRadius:
        radius.pill,

      paddingHorizontal:
        spacing.xl,

      paddingVertical: 12,
    },

    permissionButtonText: {
      color: '#fff',
      fontWeight: '700',
    },

  });