import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from './firebaseConfig';
import { colors, spacing, radius } from './colors';
import { getStaffByUid } from './taskStore';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('E-posta ve şifre gereklidir.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // 1) Firebase Authentication ile giriş yap.
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      // 2) Giriş yapan kullanıcının UID'siyle Firestore'daki
      //    "kullanicilar" koleksiyonundan isim/rol bilgisini çek.
      const staffInfo = await getStaffByUid(userCredential.user.uid);

      if (!staffInfo) {
        await signOut(auth);
        setError('Bu hesap sisteme tanımlı değil. Lütfen yöneticinizle iletişime geçin.');
        setLoading(false);
        return;
      }

      // "Beni Hatırla" tercihini kaydet.
      await AsyncStorage.setItem('rememberMe', rememberMe ? 'true' : 'false');

     
     /* if (staffInfo.rol === 'admin') {
        navigation.replace('AdminHome', {
          staffName: staffInfo.isim,
           uid: userCredential.user.uid,
        });
      } else {
         navigation.replace('StaffHome', {
           staffName: staffInfo.isim,
           uid: userCredential.user.uid,
        });
}*/
        if (staffInfo.rol === 'admin') {

         console.log('🟦 LOGIN -> ADMINHOME', {
          isim: staffInfo.isim,
          uid: userCredential.user.uid,
          rol: staffInfo.rol,
         });

          navigation.replace('AdminHome', {
           staffName: staffInfo.isim,
           uid: userCredential.user.uid,
         });

        } else {

         console.log('🟩 LOGIN -> STAFFHOME', {
          isim: staffInfo.isim,
          uid: userCredential.user.uid,
          rol: staffInfo.rol,
       });

       navigation.replace('StaffHome', {
         staffName: staffInfo.isim,
         uid: userCredential.user.uid,
       });
      }
      //*********** */
    } catch (err) {
      setError('E-posta veya şifre hatalı.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Amblem */}
        <View style={styles.logoWrap}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>GT</Text>
          </View>
          <Text style={styles.appName}>Görev Takip</Text>
          <Text style={styles.appSubtitle}>Ekip performansını anlık izleyin</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.label}>E-posta</Text>
          <TextInput
            style={styles.input}
            placeholder="ornek@sirket.com"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
          />

          <Text style={styles.label}>Şifre</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
          />

          {/* Beni Hatırla */}
          <TouchableOpacity
            style={styles.rememberRow}
            activeOpacity={0.7}
            onPress={() => setRememberMe((prev) => !prev)}
          >
            <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
              {rememberMe && <Text style={styles.checkboxMark}>✓</Text>}
            </View>
            <Text style={styles.rememberText}>Beni Hatırla</Text>
          </TouchableOpacity>

          {!!error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
            activeOpacity={0.85}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Giriş Yap</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.registerLink}
            onPress={() => navigation.navigate('Register')}
            disabled={loading}
          >
            <Text style={styles.registerLinkText}>
              Hesabın yok mu? <Text style={styles.registerLinkTextBold}>Kayıt Ol</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: {
    flexGrow: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  logoText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
  },
  appName: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '700',
  },
  appSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  form: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: 'rgba(148,163,184,0.08)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontSize: 15,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxMark: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  rememberText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    marginTop: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  registerLink: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  registerLinkText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  registerLinkTextBold: {
    color: colors.primary,
    fontWeight: '700',
  },
});