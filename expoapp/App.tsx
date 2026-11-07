import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ActivityIndicator, useWindowDimensions } from 'react-native';
import { User } from '@supabase/supabase-js';
import { supabase, LOAN_TYPES, TRANSACTION_TYPES } from './lib/supabase';

import AuthScreen from './components/AuthScreen';
import ProfileModal from './components/ProfileModal';
import AccountModal from './components/AccountModal';
import Sidebar from './components/Sidebar';
import DataTable from './components/DataTable';
import ScreenHeader from './components/common/ScreenHeader';
import MetricCard from './components/common/MetricCard';

import OverviewScreen from './screens/OverviewScreen';
import HelpScreen from './screens/HelpScreen';
import SettingsScreen from './screens/SettingsScreen';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('loans');
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const { width } = useWindowDimensions();

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
        <ActivityIndicator size="large" color="#5d55f7" />
      </View>
    );
  }

  if (!user) return <AuthScreen />;

  const loanAccounts = data.filter(item => LOAN_TYPES.includes(item.account_type));
  const transactionAccounts = data.filter(item => TRANSACTION_TYPES.includes(item.account_type));

  const totalDebt = loanAccounts.reduce((sum, item) => sum + Number(item.balance || 0), 0);
  const totalAssets = transactionAccounts.reduce((sum, item) => sum + Number(item.balance || 0), 0);
  const totalRepayments = loanAccounts.reduce((sum, item) => sum + Number(item.payments?.[0]?.amount || 0), 0);

  return (
    <View style={styles.appContainer}>
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        userEmail={user.email} 
        onOpenProfile={() => setProfileModalVisible(true)} 
        loanCount={loanAccounts.length}
      />

      <View style={styles.contentArea}>
        {activeTab === 'overview' && <OverviewScreen totalDebt={totalDebt} totalAssets={totalAssets} />}

        {activeTab === 'loans' && (
          <View style={styles.screenWrapper}>
            <ScreenHeader 
              category="FINANCE" 
              title="Loans" 
              subtitle="Keep track of what you've borrowed and what's left to repay." 
              buttonLabel="+ Add loan"
              onPressButton={() => { resetForm('HomeLoan'); setModalVisible(true); }}
            />

            <View style={styles.metricsRow}>
              <MetricCard title="Total outstanding" value={`$${totalDebt.toLocaleString()}`} subtitle={`Across ${loanAccounts.length} active loans`} />
              <MetricCard title="Monthly repayments" value={`$${totalRepayments.toLocaleString()}`} subtitle="Estimated monthly total" />
              <MetricCard title="Paid down" value="$0" subtitle="0% of principal" />
            </View>

            <DataTable 
              sectionTitle="All loans" 
              itemCountText={`${loanAccounts.length} active accounts`} 
              data={loanAccounts} 
              onEdit={startEdit} 
              onDelete={handleDelete} 
            />
          </View>
        )}

        {activeTab === 'transactions' && (
          <View style={styles.screenWrapper}>
            <ScreenHeader 
              category="FINANCE" 
              title="Transactions" 
              subtitle="Everyday accounts, checking, and offset savings." 
              buttonLabel="+ Add account"
              onPressButton={() => { resetForm('Savings'); setModalVisible(true); }}
            />

            <DataTable 
              sectionTitle="Transaction Accounts" 
              itemCountText={`${transactionAccounts.length} accounts`} 
              data={transactionAccounts} 
              onEdit={startEdit} 
              onDelete={handleDelete} 
            />
          </View>
        )}

        {activeTab === 'help' && <HelpScreen />}
        {activeTab === 'settings' && <SettingsScreen />}
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
  appContainer: { flex: 1, flexDirection: 'row', backgroundColor: '#f8f9fa', height: '100%' },
  contentArea: { flex: 1, overflowY: 'auto' },
  screenWrapper: { padding: 32 },
  metricsRow: { flexDirection: 'row', gap: 16, marginBottom: 24, flexWrap: 'wrap' },
  center: { justifyContent: 'center', alignItems: 'center' },
});