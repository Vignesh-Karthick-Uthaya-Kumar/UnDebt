// components/ProfileModal.tsx
import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal } from 'react-native';
import { supabase } from '../lib/supabase';

interface ProfileModalProps {
  visible: boolean;
  userEmail?: string;
  onClose: () => void;
  onSignOut: () => void;
}

export default function ProfileModal({ visible, userEmail, onClose, onSignOut }: ProfileModalProps) {
  async function handleSignOut() {
    await supabase.auth.signOut();
    onSignOut();
  }

  return (
    <Modal visible={visible} animationType="fade" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.profileModalContent}>
          <Text style={styles.modalHeader}>Profile Management</Text>
          <Text style={styles.label}>Signed in as:</Text>
          <Text style={styles.emailText}>{userEmail}</Text>

          <TouchableOpacity style={[styles.saveButton, { backgroundColor: '#dc3545', marginBottom: 10 }]} onPress={handleSignOut}>
            <Text style={styles.saveButtonText}>Sign Out</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelModalButton} onPress={onClose}>
            <Text style={styles.cancelModalButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  profileModalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 360, alignSelf: 'center' },
  modalHeader: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, color: '#111' },
  label: { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 6 },
  emailText: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 20 },
  saveButton: { backgroundColor: '#007AFF', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  cancelModalButton: { backgroundColor: '#6c757d', padding: 10, borderRadius: 8, alignItems: 'center' },
  cancelModalButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
