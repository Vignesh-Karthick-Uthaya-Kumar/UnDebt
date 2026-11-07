// App.tsx
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { User } from '@supabase/supabase-js';
import { supabase, LOAN_TYPES, TRANSACTION_TYPES } from './lib/supabase';

import AuthScreen from './components/AuthScreen';
import ProfileModal from './components/ProfileModal';
import AccountModal from './components/AccountModal';

import OverviewScreen from './screens/OverviewScreen';
import LoansScreen from './screens/LoansScreen';
import TransactionsScreen from './screens/TransactionsScreen';
import HelpScreen from './screens/HelpScreen';
import SettingsScreen from './screens/SettingsScreen';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('loans');
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [data, setData] = useState<any[]>([]);

  // Form States
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [accountType, setAccountType] = useState('HomeLoan');
  const [balance, setBalance] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  
  const [offsetType, setOffsetType] = useState('Full Offset');
  const [offsetPercentage, setOffsetPercentage] = useState('');
  const [interestRateVal, setInterestRateVal] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentFrequency, setPaymentFrequency] = useState('Monthly');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) fetchAccounts();
  }, [user]);

  async function fetchAccounts() {
    try {
      const { data: records, error } = await supabase
        .from('accounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setData(records || []);
    } catch (err: any) {
      console.error('Fetch error:', err.message);
    }
  }

  async function handleSaveAccount() {
    if (!balance.trim()) {
      alert('Please enter a balance.');
      return;
    }

    try {
      const offset_config = { offsetType, percentage: offsetPercentage ? parseFloat(offsetPercentage) : null };
      const interest_rates = interestRateVal ? [{ rate: parseFloat(interestRateVal), date: startDate, endDate: endDate || null }] : [];
      const payments = paymentAmount ? [{ amount: parseFloat(paymentAmount), type: 'Principal and Interest', frequency: paymentFrequency, startDate, endDate: endDate || null }] : [];

      const payload = {
        user_id: user?.id,
        title: title.trim() || `Account ${data.length + 1}`,
        account_type: accountType,
        balance: parseFloat(balance),
        start_date: startDate || null,
        end_date: endDate || null,
        offset_config,
        interest_rates,
        payments
      };

      if (editingId !== null) {
        const { error } = await supabase.from('accounts').update(payload).eq('account_id', editingId);
        if (error) throw error;
        setEditingId(null);
      } else {
        const { error } = await supabase.from('accounts').insert([payload]);
        if (error) throw error;
      }

      resetForm();
      setModalVisible(false);
      fetchAccounts();
    } catch (err: any) {
      alert('Error saving record: ' + err.message);
    }
  }

  function resetForm(defaultType = 'HomeLoan') {
    setTitle('');
    setAccountType(defaultType);
    setBalance('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate('');
    setOffsetType('Full Offset');
    setOffsetPercentage('');
    setInterestRateVal('');
    setPaymentAmount('');
    setPaymentFrequency('Monthly');
    setEditingId(null);
  }

  function startEdit(item: any) {
    setEditingId(item.account_id);
    setTitle(item.title || '');
    setAccountType(item.account_type || 'HomeLoan');
    setBalance(item.balance !== undefined ? String(item.balance) : '0');
    setStartDate(item.start_date || new Date().toISOString().split('T')[0]);
    setEndDate(item.end_date || '');
    
    if (item.offset_config) {
      setOffsetType(item.offset_config.offsetType || 'Full Offset');
      setOffsetPercentage(item.offset_config.percentage ? String(item.offset_config.percentage) : '');
    }
    if (item.interest_rates?.[0]) setInterestRateVal(String(item.interest_rates[0].rate || ''));
    if (item.payments?.[0]) {
      setPaymentAmount(String(item.payments[0].amount || ''));
      setPaymentFrequency(item.payments[0].frequency || 'Monthly');
    }

    setModalVisible(true);
  }

  async function handleDelete(id: string) {
    try {
      const { error } = await supabase.from('accounts').delete().eq('account_id', id);
      if (error) throw error;
      fetchAccounts();
    } catch (err: any) {
      alert('Error deleting: ' + err.message);
    }
  }

  if (authLoading) {
    return (
      <View style={[styles.appContainer, styles.center]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!user) return <AuthScreen />;

  const loanAccounts = data.filter(item => LOAN_TYPES.includes(item.account_type));
  const transactionAccounts = data.filter(item => TRANSACTION_TYPES.includes(item.account_type));

  const totalDebt = loanAccounts.reduce((sum, item) => sum + Number(item.balance || 0), 0);
  const totalAssets = transactionAccounts.reduce((sum, item) => sum + Number(item.balance || 0), 0);

  return (
    <View style={styles.appContainer}>
      {/* Top Header Bar */}
      <View style={styles.headerBar}>
        <Text style={styles.brandTitle}>Undebt Me</Text>
        <TouchableOpacity style={styles.userBadge} onPress={() => setProfileModalVisible(true)}>
          <Text style={styles.userBadgeText}>{user.email?.[0].toUpperCase()}</Text>
          <Text style={styles.userEmailText}>{user.email}</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content Area */}
      <View style={styles.contentArea}>
        {activeTab === 'overview' && <OverviewScreen totalDebt={totalDebt} totalAssets={totalAssets} />}
        {activeTab === 'loans' && (
          <LoansScreen 
            loans={loanAccounts} 
            onAdd={() => { resetForm('HomeLoan'); setModalVisible(true); }} 
            onEdit={startEdit} 
            onDelete={handleDelete} 
          />
        )}
        {activeTab === 'transactions' && (
          <TransactionsScreen 
            transactions={transactionAccounts} 
            onAdd={() => { resetForm('Savings'); setModalVisible(true); }} 
            onEdit={startEdit} 
            onDelete={handleDelete} 
          />
        )}
        {activeTab === 'help' && <HelpScreen />}
        {activeTab === 'settings' && <SettingsScreen />}
      </View>

      {/* Bottom Navigation Tabs */}
      <View style={styles.tabBar}>
        {[
          { key: 'overview', label: '📊 Overview' },
          { key: 'loans', label: '💳 Loans' },
          { key: 'transactions', label: '💰 Transactions' },
          { key: 'help', label: '📖 Help' },
          { key: 'settings', label: '⚙️ Settings' },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity 
              key={tab.key} 
              style={[styles.tabItem, isActive && styles.tabItemActive]} 
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ProfileModal 
        visible={profileModalVisible} 
        userEmail={user.email} 
        onClose={() => setProfileModalVisible(false)} 
        onSignOut={() => setProfileModalVisible(false)} 
      />

      <AccountModal 
        visible={modalVisible}
        editingId={editingId}
        title={title} setTitle={setTitle}
        accountType={accountType} setAccountType={setAccountType}
        balance={balance} setBalance={setBalance}
        startDate={startDate} setStartDate={setStartDate}
        endDate={endDate} setEndDate={setEndDate}
        interestRateVal={interestRateVal} setInterestRateVal={setInterestRateVal}
        paymentAmount={paymentAmount} setPaymentAmount={setPaymentAmount}
        paymentFrequency={paymentFrequency} setPaymentFrequency={setPaymentFrequency}
        onSave={handleSaveAccount}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  appContainer: { flex: 1, backgroundColor: '#f4f6f8', height: '100%', justifyContent: 'space-between' },
  headerBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 24, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#e1e4e8' },
  brandTitle: { fontSize: 20, fontWeight: 'bold', color: '#007AFF' },
  userBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f4ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 8, borderWidth: 1, borderColor: '#d0e0ff' },
  userBadgeText: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#007AFF', color: '#fff', textAlign: 'center', lineHeight: 24, fontWeight: 'bold', fontSize: 12 },
  userEmailText: { fontSize: 13, fontWeight: '600', color: '#333' },
  contentArea: { flex: 1 },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e1e4e8', paddingVertical: 8, paddingHorizontal: 12, justifyContent: 'space-around' },
  tabItem: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  tabItemActive: { backgroundColor: '#f0f4ff' },
  tabText: { fontSize: 13, fontWeight: '500', color: '#555' },
  tabTextActive: { color: '#007AFF', fontWeight: 'bold' },
  center: { justifyContent: 'center', alignItems: 'center' },
});