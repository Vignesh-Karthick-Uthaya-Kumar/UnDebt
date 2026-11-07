// screens/HelpScreen.tsx
import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';

export default function HelpScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionHeaderTitle}>Help Center & User Guide</Text>
      <View style={styles.card}>
        <Text style={styles.itemTitle}>Welcome to Undebt Me</Text>
        <Text style={styles.helpBody}>
          1. <Text style={{fontWeight: 'bold'}}>Loans Tab:</Text> Manage your home loans, personal loans, car loans, and credit cards. Configure interest rates and repayment schedules.{'\n\n'}
          2. <Text style={{fontWeight: 'bold'}}>Transactions Tab:</Text> Track your everyday transaction accounts, savings, and offset funds.{'\n\n'}
          3. <Text style={{fontWeight: 'bold'}}>Overview Tab:</Text> Review your net financial position and debt-free projections.{'\n\n'}
          4. <Text style={{fontWeight: 'bold'}}>Profile Management:</Text> Click your email badge in the top right to manage your session or sign out.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, paddingBottom: 30 },
  sectionHeaderTitle: { fontSize: 22, fontWeight: 'bold', color: '#111', marginBottom: 16 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 10, borderWidth: 1, borderColor: '#eee' },
  itemTitle: { fontSize: 17, fontWeight: 'bold', color: '#222', marginBottom: 8 },
  helpBody: { fontSize: 14, color: '#444', lineHeight: 22 },
});
