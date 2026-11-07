// screens/SettingsScreen.tsx
import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput } from 'react-native';

export default function SettingsScreen() {
  const [currency, setCurrency] = useState('AUD ($)');

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionHeaderTitle}>Global Settings</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Base Currency</Text>
        <TextInput
          style={styles.input}
          value={currency}
          onChangeText={setCurrency}
        />
        <Text style={styles.helpBody}>
          More global preferences such as notification schedules and regional formatting will be configurable here.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, paddingBottom: 30 },
  sectionHeaderTitle: { fontSize: 22, fontWeight: 'bold', color: '#111', marginBottom: 16 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 10, borderWidth: 1, borderColor: '#eee' },
  label: { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 6 },
  input: { backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 8, fontSize: 15, color: '#333', marginBottom: 12 },
  helpBody: { fontSize: 14, color: '#666', lineHeight: 20 },
});
