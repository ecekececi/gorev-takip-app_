// Koyu Mavi / Slate Gray tasarım dili
export const colors = {
  background: '#121824',      // Ana arka plan
  backgroundAlt: '#1E222B',   // Alternatif koyu arka plan (AppBar vb.)
  surface: '#1F293D',         // Kartlar / bileşenler
  surfaceAlt: '#253147',      // Kart üzeri ikincil yüzey (input, chip vb.)
  border: '#334155',          // İnce gri sınır çizgileri

  primary: '#3B82F6',         // Elektrik mavisi - ana aksiyon
  primaryDark: '#2A64EC',     // Buton basılı / gradient koyu ucu

  textPrimary: '#F8FAFC',     // Beyaza yakın ana metin
  textSecondary: '#94A3B8',   // Açık gri ikincil metin
  textMuted: '#64748B',       // Soluk yardımcı metin

  warning: '#F59E0B',         // Bekliyor
  success: '#10B981',         // Tamamlandı
  danger: '#EF4444',          // Kaçırıldı
};

export const statusMeta = {
  tamamlandi: { label: 'Tamamlandı', color: colors.success, bg: 'rgba(16,185,129,0.15)' },
  bekliyor: { label: 'Bekliyor', color: colors.warning, bg: 'rgba(245,158,11,0.15)' },
  kacirildi: { label: 'Kaçırıldı', color: colors.danger, bg: 'rgba(239,68,68,0.15)' },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  pill: 999,
};
