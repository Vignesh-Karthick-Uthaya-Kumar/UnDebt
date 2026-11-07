// components/common/ScreenHeader.tsx
import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';

interface ScreenHeaderProps {
  category: string;
  title: string;
  subtitle: string;
  buttonLabel?: string;
  onPressButton?: () => void;
}

export default function ScreenHeader({ category, title, subtitle, buttonLabel, onPressButton }: ScreenHeaderProps) {
  return (
    <View style={styles.container}>
      <View>
        <Text style={Typography.categoryLabel}>{category}</Text>
        <Text style={Typography.screenTitle}>{title}</Text>
        <Text style={Typography.screenSubtitle}>{subtitle}</Text>
      </View>
      {buttonLabel && onPressButton && (
        <TouchableOpacity style={styles.button} onPress={onPressButton}>
          <Text style={styles.buttonText}>{buttonLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  button: { backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, flexDirection: 'row', alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});