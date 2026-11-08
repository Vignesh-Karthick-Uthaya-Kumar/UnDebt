import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const ACCOUNT_TYPE_MARKS: Record<string, string> = {
  HomeLoan: 'HL',
  CreditCard: 'CC',
  PersonalLoan: 'PL',
  BuyNowPayLater: 'BN',
  CarLoan: 'CL',
  Savings: 'S',
  Checking: 'CK',
  Investment: 'I',
  TransactionAccount: 'TA',
};

interface AccountTypeMarkProps {
  accountType: string;
}

export default function AccountTypeMark({ accountType }: AccountTypeMarkProps) {
  const mark = ACCOUNT_TYPE_MARKS[accountType] || accountType.slice(0, 2).toUpperCase();

  return (
    <View
      style={styles.mark}
      accessible
      accessibilityLabel={`${accountType} account`}
    >
      <Text style={styles.markText}>{mark}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f0f0ff', justifyContent: 'center', alignItems: 'center' },
  markText: { color: '#5d55f7', fontWeight: '700', fontSize: 11 },
});
