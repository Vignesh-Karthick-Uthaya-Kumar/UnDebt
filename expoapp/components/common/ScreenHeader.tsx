import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';

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
        <Text style={styles.categoryLabel}>{category}</Text>
        <Text style={styles.screenTitle}>{title}</Text>
        <Text style={styles.screenSubtitle}>{subtitle}</Text>
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
  categoryLabel: { fontSize: 11, fontWeight: '700', color: '#5d55f7', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  screenTitle: { fontSize: 26, fontWeight: 'bold', color: '#1a1d20' },
  screenSubtitle: { fontSize: 13, color: '#6c757d', marginTop: 2 },
  button: { backgroundColor: '#5d55f7', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});