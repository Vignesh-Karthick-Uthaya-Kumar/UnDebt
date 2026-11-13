import React from 'react';
import { ScrollView, StyleSheet, Text, View, TouchableOpacity } from 'react-native';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userEmail?: string;
  onOpenProfile: () => void;
  loanCount: number;
  transactionCount: number;
  compact: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  userEmail,
  onOpenProfile,
  loanCount,
  transactionCount,
  compact,
  collapsed,
  onToggleCollapsed,
}: SidebarProps) {
  const navItems: { key: string; label: string; icon: string; badge?: number }[] = [
    { key: 'overview', label: 'Overview', icon: '📊' },
    { key: 'loans', label: 'Loans', icon: '💳', badge: loanCount },
    { key: 'transactions', label: 'Accounts', icon: '💰', badge: transactionCount },
    { key: 'offset', label: 'Loan management', icon: '↔' },
    { key: 'save', label: 'Save', icon: '🐖' },
    { key: 'spend', label: 'Spend', icon: '🧾' },
  ];

  const utilityItems: { key: string; label: string; icon: string; badge?: number }[] = [
    { key: 'help', label: 'Help & guides', icon: '❓' },
    { key: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <View style={[styles.sidebar, compact && styles.compactSidebar, collapsed && styles.collapsedSidebar]}>
      <ScrollView
        style={styles.sidebarScroll}
        contentContainerStyle={styles.sidebarContent}
        showsVerticalScrollIndicator={false}
      >
       <View>
        <View style={[styles.brandContainer, compact && styles.compactBrandContainer, collapsed && styles.collapsedBrandContainer]}>
          {!collapsed && !compact && (
            <>
              <View style={styles.brandIconBox}>
                <Text style={styles.brandIconText}>U</Text>
              </View>
              <Text style={styles.brandTitle}>Undebt Me</Text>
            </>
          )}
          <TouchableOpacity
            style={styles.collapseButton}
            onPress={onToggleCollapsed}
            accessibilityRole="button"
            accessibilityLabel={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            accessibilityState={{ expanded: !collapsed }}
          >
            <Text style={styles.collapseButtonText}>{collapsed ? '»' : '«'}</Text>
          </TouchableOpacity>
          {(collapsed || compact) && (
            <View style={styles.brandIconBox}>
              <Text style={styles.brandIconText}>U</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.profileBadge, collapsed && styles.collapsedProfileBadge]}
          onPress={onOpenProfile}
          accessibilityRole="button"
          accessibilityLabel="Open profile management"
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{userEmail?.[0]?.toUpperCase() || 'U'}</Text>
          </View>
          {!collapsed && (
            <View style={{ flex: 1, overflow: 'hidden' }}>
              <Text style={styles.profileName} numberOfLines={1}>{userEmail ? userEmail.split('@')[0] : 'User'}</Text>
              <Text style={styles.profileEmail} numberOfLines={1}>{userEmail || ''}</Text>
            </View>
          )}
        </TouchableOpacity>

        {!collapsed && <Text style={styles.sectionHeader}>YOUR PLAN</Text>}

        {navItems.map((item) => {
          const isActive = activeTab === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.navItem, (collapsed || compact) && styles.compactNavItem, collapsed && styles.collapsedNavItem, isActive && styles.navItemActive]}
              onPress={() => setActiveTab(item.key)}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: isActive }}
            >
              <View style={[styles.navItemContent, collapsed && styles.collapsedNavItemContent, compact && styles.compactNavItemContent]}>
                <Text style={styles.navIcon}>{item.icon}</Text>
                {!collapsed && <Text style={[styles.navText, isActive && styles.navTextActive]}>{item.label}</Text>}
              </View>
              {!collapsed && item.badge !== undefined && item.badge > 0 && (
                <View style={[styles.badgeContainer, isActive && styles.badgeActive]}>
                  <Text style={[styles.badgeText, isActive && styles.badgeTextActive]}>{item.badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
        </View>
        <View>
        {utilityItems.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[styles.navItem, (collapsed || compact) && styles.compactNavItem, collapsed && styles.collapsedNavItem, activeTab === item.key && styles.navItemActive, item.key === 'settings' && { marginBottom: 16 }]}
            onPress={() => setActiveTab(item.key)}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: activeTab === item.key }}
          >
            <View style={[styles.navItemContent, collapsed && styles.collapsedNavItemContent, compact && styles.compactNavItemContent]}>
              <Text style={styles.navIcon}>{item.icon}</Text>
              {!collapsed && <Text style={[styles.navText, activeTab === item.key && styles.navTextActive]}>{item.label}</Text>}
            </View>
          </TouchableOpacity>
        ))}

       </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: { width: 260, marginVertical: 12, backgroundColor: '#ffffff', borderRightWidth: 1, borderRightColor: '#e9ecef', padding: 20 },
  compactSidebar: { width: '40%', maxWidth: 180, minWidth: 128, padding: 10 },
  collapsedSidebar: { width: 76, minWidth: 0, paddingHorizontal: 10 },
  sidebarScroll: { flex: 1 },
  sidebarContent: { flexGrow: 1, justifyContent: 'space-between', paddingBottom: 12 },
  brandContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 32, gap: 10 },
  compactBrandContainer: { marginBottom: 18 },
  collapsedBrandContainer: { flexDirection: 'column-reverse', marginBottom: 24, gap: 12 },
  collapseButton: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#f1f3f5', alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' },
  collapseButtonText: { color: '#495057', fontSize: 20, fontWeight: '700', lineHeight: 24 },
  brandIconBox: { width: 32, height: 32, backgroundColor: '#5d55f7', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  brandIconText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  brandTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a1d20' },
  sectionHeader: { fontSize: 11, fontWeight: '700', color: '#adb5bd', marginBottom: 12, letterSpacing: 1 },
  navItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, marginBottom: 4 },
  collapsedNavItem: { justifyContent: 'center', paddingHorizontal: 8 },
  compactNavItem: { paddingHorizontal: 6, paddingVertical: 8 },
  navItemActive: { backgroundColor: '#f0f0ff' },
  navItemContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  collapsedNavItemContent: { justifyContent: 'center' },
  compactNavItemContent: { gap: 6 },
  navIcon: { fontSize: 16 },
  navText: { flexShrink: 1, fontSize: 14, fontWeight: '500', color: '#495057' },
  navTextActive: { color: '#5d55f7', fontWeight: '600' },
  badgeContainer: { backgroundColor: '#e9ecef', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  badgeActive: { backgroundColor: '#dfdffc' },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#6c757d' },
  badgeTextActive: { color: '#5d55f7' },
  profileBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#e9ecef', gap: 10 },
  collapsedProfileBadge: { justifyContent: 'center', paddingHorizontal: 0 },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#dfdffc', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#5d55f7', fontWeight: 'bold', fontSize: 14 },
  profileName: { fontSize: 13, fontWeight: '600', color: '#1a1d20' },
  profileEmail: { fontSize: 11, color: '#6c757d' },
});