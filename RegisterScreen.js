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
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebaseConfig';
import { colors, spacing, radius } from './colors';
import { saveStaffDocument } from './taskStore';

const ROLE_OPTIONS = [
  { label: 'Kullanıcı', value: 'staff' },
  { label: 'Yönetici', value: 'admin' },
];

export default function RegisterScreen({ navigation }) {
  const [isim, setIsim] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [role, setRole] = useState(null);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (!isim || !email || !password || !role) {
      setError('Lütfen tüm alanları doldurun ve rol seçin.');
      return;
    }
    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır.');
      return;
    }
    if (password !== passwordConfirm) {
      setError('Şifreler eşleşmiyor.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // 1) Firebase Authentication'da hesabı oluştur.
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      // 2) Firestore'daki "kullanicilar" koleksiyonuna isim/email/rol
      //    bilgisini, doküman ID'si Auth UID'si olacak şekilde yaz.
      await saveStaffDocument(userCredential.user.uid, {
        email: email.trim(),
        isim,
        rol: role.value,
      });

      // Kayıt olur olmaz kullanıcı otomatik giriş yapılmış sayılır.
      await AsyncStorage.setItem('rememberMe', 'true');

      navigation.replace(role.value === 'admin' ? 'AdminHome' : 'StaffHome', {
        staffName: isim,
      });
    } catch (err) {
      // Geçici: gerçek hata kodunu konsola yazdır, debug için.
      console.warn('Kayıt hatası:', err?.code, err?.message);

      if (err?.code === 'auth/email-already-in-use') {
        setError('Bu e-posta adresi zaten kayıtlı.');
      } else if (err?.code === 'auth/invalid-email') {
        setError('Geçersiz e-posta adresi.');
      } else if (err?.code === 'permission-denied') {
        setError('Veritabanı yazma izni reddedildi. Firestore kurallarını kontrol edin.');
      } else {
        setError(`Kayıt sırasında bir hata oluştu: ${err?.message || 'bilinmeyen hata'}`);
      }
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
        <View style={styles.logoWrap}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>GT</Text>
          </View>
          <Text style={styles.appName}>Hesap Oluştur</Text>
          <Text style={styles.appSubtitle}>Görev Takip'e katılmak için kaydolun</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Ad Soyad</Text>
          <TextInput
            style={styles.input}
            placeholder="Örn. Ahmet Yılmaz"
            placeholderTextColor={colors.textMuted}
            value={isim}
            onChangeText={setIsim}
            editable={!loading}
          />

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
            placeholder="En az 6 karakter"
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
          />

          <Text style={styles.label}>Şifre (Tekrar)</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={colors.textMuted}
            value={passwordConfirm}
            onChangeText={setPasswordConfirm}
            secureTextEntry
            editable={!loading}
          />

          <Text style={styles.label}>Rol</Text>
          <TouchableOpacity
            style={styles.dropdownTrigger}
            onPress={() => setRoleDropdownOpen(true)}
            disabled={loading}
          >
            <Text
              style={[
                styles.dropdownText,
                !role && { color: colors.textMuted },
              ]}
            >
              {role ? role.label : 'Rol seçin'}
            </Text>
            <Text style={styles.dropdownChevron}>⌄</Text>
          </TouchableOpacity>

          {!!error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
            activeOpacity={0.85}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Kayıt Ol</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backToLogin}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.backToLoginText}>Zaten hesabım var, giriş yap</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Rol seçim modalı */}
      <Modal
        visible={roleDropdownOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setRoleDropdownOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setRoleDropdownOpen(false)}
        >
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Rol Seçin</Text>
            {ROLE_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={styles.modalOption}
                onPress={() => {
                  setRole(option);
                  setRoleDropdownOpen(false);
                }}
              >
                <Text style={styles.modalOptionText}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
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
    fontSize: 22,
    fontWeight: '700',
  },
  appSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
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
  dropdownTrigger: {
    backgroundColor: 'rgba(148,163,184,0.08)',
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
  backToLogin: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  backToLoginText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
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