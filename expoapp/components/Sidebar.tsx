import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userEmail?: string;
  onOpenProfile: () => void;
  loanCount: number;
}

export default function Sidebar({ activeTab, setActiveTab, userEmail, onOpenProfile, loanCount }: SidebarProps) {
  const navItems = [
    { key: 'overview', label: 'Overview', icon: '📊' },
    { key: 'loans', label: 'Loans', icon: '💳', badge: loanCount },
    { key: 'transactions', label: 'Transactions', icon: '💰' },
  ];

  return (
    <View style={styles.sidebar}>
      <View>
        <View style={styles.brandContainer}>
          <View style={styles.brandIconBox}>
            <Text style={styles.brandIconText}>U</Text>
          </View>
          <Text style={styles.brandTitle}>Undebt Me</Text>
        </View>

        <Text style={styles.sectionHeader}>WORKSPACE</Text>

        {navItems.map((item) => {
          const isActive = activeTab === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.navItem, isActive && styles.navItemActive]}
              onPress={() => setActiveTab(item.key)}
            >
              <View style={styles.navItemContent}>
                <Text style={styles.navIcon}>{item.icon}</Text>
                <Text style={[styles.navText, isActive && styles.navTextActive]}>{item.label}</Text>
              </View>
              {item.badge !== undefined && item.badge > 0 && (
                <View style={[styles.badgeContainer, isActive && styles.badgeActive]}>
                  <Text style={[styles.badgeText, isActive && styles.badgeTextActive]}>{item.badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <View>
        <TouchableOpacity 
          style={[styles.navItem, activeTab === 'help' && styles.navItemActive]} 
          onPress={() => setActiveTab('help')}
        >
          <View style={styles.navItemContent}>
            <Text style={styles.navIcon}>❓</Text>
            <Text style={[styles.navText, activeTab === 'help' && styles.navTextActive]}>Help center</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.navItem, activeTab === 'settings' && styles.navItemActive, { marginBottom: 16 }]} 
          onPress={() => setActiveTab('settings')}
        >
          <View style={styles.navItemContent}>
            <Text style={styles.navIcon}>⚙️</Text>
            <Text style={[styles.navText, activeTab === 'settings' && styles.navTextActive]}>Settings</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.profileBadge} onPress={onOpenProfile}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{userEmail?.[0]?.toUpperCase() || 'U'}</Text>
          </View>
          <View style={{ flex: 1, overflow: 'hidden' }}>
            <Text style={styles.profileName} numberOfLines={1}>{userEmail ? userEmail.split('@')[0] : 'User'}</Text>
            <Text style={styles.profileEmail} numberOfLines={1}>{userEmail || ''}</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: { width: 260, backgroundColor: '#ffffff', borderRightWidth: 1, borderRightColor: '#e9ecef', padding: 20, justifyContent: 'space-between', height: '100%' },
  brandContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 32, gap: 10 },
  brandIconBox: { width: 32, height: 32, backgroundColor: '#5d55f7', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  brandIconText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  brandTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a1d20' },
  sectionHeader: { fontSize: 11, fontWeight: '700', color: '#adb5bd', marginBottom: 12, letterSpacing: 1 },
  navItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, marginBottom: 4 },
  navItemActive: { backgroundColor: '#f0f0ff' },
  navItemContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  navIcon: { fontSize: 16 },
  navText: { fontSize: 14, fontWeight: '500', color: '#495057' },
  navTextActive: { color: '#5d55f7', fontWeight: '600' },
  badgeContainer: { backgroundColor: '#e9ecef', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  badgeActive: { backgroundColor: '#dfdffc' },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#6c757d' },
  badgeTextActive: { color: '#5d55f7' },
  profileBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#e9ecef', gap: 10 },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#dfdffc', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#5d55f7', fontWeight: 'bold', fontSize: 14 },
  profileName: { fontSize: 13, fontWeight: '600', color: '#1a1d20' },
  profileEmail: { fontSize: 11, color: '#6c757d' },
});