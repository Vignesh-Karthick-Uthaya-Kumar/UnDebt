// theme/typography.ts
import { TextStyle } from 'react-native';
import { Colors } from './colors';

export const Typography: Record<string, TextStyle> = {
  categoryLabel: { fontSize: 11, fontWeight: '700', color: Colors.primary, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  screenTitle: { fontSize: 26, fontWeight: 'bold', color: Colors.textPrimary },
  screenSubtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.textPrimary },
  bodyText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  metricValue: { fontSize: 26, fontWeight: 'bold', color: Colors.textPrimary },
  metricLabel: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  th: { fontSize: 11, fontWeight: 'bold', color: Colors.textSecondary, letterSpacing: 0.5 },
};