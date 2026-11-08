import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../theme/colors';

const guides = [
  {
    number: '01',
    title: 'Add your accounts',
    body: 'Add each loan and everyday account. Enter its current balance, start date, interest rate and scheduled repayment where relevant. Accurate account details are the foundation for every projection.',
  },
  {
    number: '02',
    title: 'Record income and transfers',
    body: 'On Save, add income to the account that receives it. Add savings as a transfer by choosing both the account it leaves and the account it enters.',
  },
  {
    number: '03',
    title: 'Track bills and expenses',
    body: 'On Spend, record bills and expenses against the account used. Credit card and Buy Now Pay Later charges increase that loan balance and affect interest and repayments. Set a repeat frequency and end date for regular costs.',
  },
  {
    number: '04',
    title: 'Set up loan management',
    body: 'Add additional loan payments and link each payment to its source account and destination loan. Link eligible cash accounts to loans to estimate interest savings from offsets.',
  },
  {
    number: '05',
    title: 'Compare your projections',
    body: 'Choose a financial year or projection length. Compare scheduled repayments with projections that include additional payments and offsets.',
  },
];

export default function HelpScreen({ compact }: { compact: boolean }) {
  return (
    <ScrollView contentContainerStyle={[styles.container, compact && styles.compactContainer]}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>GUIDES</Text>
        <Text style={styles.pageTitle}>Make your plan more useful</Text>
        <Text style={styles.intro}>
          Add complete, up-to-date information to get clearer cash-flow and loan projections.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>A simple setup flow</Text>
        <Text style={styles.cardIntro}>Work through these steps in order.</Text>
        <View style={styles.flow}>
          {[
            ['1', 'Accounts'],
            ['2', 'Income'],
            ['3', 'Spending'],
            ['4', 'Loans & offsets'],
            ['5', 'Review'],
          ].map(([number, label], index) => (
            <React.Fragment key={number}>
              <View style={styles.flowStep}>
                <View style={styles.flowNumber}>
                  <Text style={styles.flowNumberText}>{number}</Text>
                </View>
                <Text style={styles.flowLabel}>{label}</Text>
              </View>
              {index < 4 && <Text style={styles.flowArrow}>›</Text>}
            </React.Fragment>
          ))}
        </View>
      </View>

      {guides.map(guide => (
        <View key={guide.number} style={styles.guideCard}>
          <View style={styles.guideNumber}>
            <Text style={styles.guideNumberText}>{guide.number}</Text>
          </View>
          <View style={styles.guideCopy}>
            <Text style={styles.guideTitle}>{guide.title}</Text>
            <Text style={styles.body}>{guide.body}</Text>
          </View>
        </View>
      ))}

      <View style={styles.noteCard}>
        <Text style={styles.noteTitle}>About projections</Text>
        <Text style={styles.body}>
          Projections are estimates based on the balances, rates and activity you enter. Review your details regularly; actual rates, payments and account activity may change.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, paddingBottom: 36, gap: 12 },
  compactContainer: { padding: 16, paddingBottom: 24 },
  header: { marginBottom: 4 },
  eyebrow: { color: Colors.primary, fontSize: 10, fontWeight: '700', letterSpacing: 1.1 },
  pageTitle: { color: Colors.textPrimary, fontSize: 24, fontWeight: '700', marginTop: 4 },
  intro: { color: Colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 6 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: Colors.border },
  cardTitle: { color: Colors.textPrimary, fontSize: 15, fontWeight: '700' },
  cardIntro: { color: Colors.textSecondary, fontSize: 12, marginTop: 3 },
  flow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 7, marginTop: 14 },
  flowStep: { alignItems: 'center', gap: 5, minWidth: 52 },
  flowNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  flowNumberText: { color: Colors.primary, fontSize: 12, fontWeight: '700' },
  flowLabel: { color: Colors.textSecondary, fontSize: 10, fontWeight: '600', textAlign: 'center' },
  flowArrow: { color: Colors.textMuted, fontSize: 20, fontWeight: '600' },
  guideCard: { flexDirection: 'row', gap: 12, padding: 16, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: Colors.border },
  guideNumber: { width: 32, height: 32, borderRadius: 10, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  guideNumberText: { color: Colors.primary, fontSize: 11, fontWeight: '700' },
  guideCopy: { flex: 1 },
  guideTitle: { color: Colors.textPrimary, fontSize: 14, fontWeight: '700', marginBottom: 4 },
  body: { color: Colors.textSecondary, fontSize: 12, lineHeight: 18 },
  noteCard: { padding: 16, borderRadius: 14, backgroundColor: '#f1f3f5' },
  noteTitle: { color: Colors.textPrimary, fontSize: 13, fontWeight: '700', marginBottom: 4 },
});
