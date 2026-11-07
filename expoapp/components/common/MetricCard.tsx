// components/common/MetricCard.tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';

interface MetricCardProps {
  title: string;
  value: string;
  subtitle: string;
  accentColor?: string;
}

export default function MetricCard({ title, value, subtitle, accentColor = Colors.textPrimary }: MetricCardProps) {
  return (
    <View style={styles.card}>
      <Text style={Typography.metricLabel}>{title}</Text>
      <Text style={[Typography.metricValue, { color: accentColor }]}>{value}</Text>
      <Text style={styles.subText}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 220,
  },
  subText: { fontSize: 12, color: Colors.textMuted, marginTop: 6 },
});