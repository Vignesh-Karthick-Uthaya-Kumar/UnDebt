// components/AuthScreen.tsx
import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleAuth() {
    if (!email || !password) {
      alert('Enter your email and password.');
      return;
    }
    try {
      setLoading(true);
      if (isSigningUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Your account is ready.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      alert('Authentication failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.authCenter}>
      <View style={styles.authCard}>
        <Text style={styles.authTitle}>Undebt Me</Text>
        <Text style={styles.authSub}>
          {isSigningUp ? 'Create an account' : 'Sign in to your financial plan'}
        </Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          placeholderTextColor="#888"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor="#888"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity style={styles.saveButton} onPress={handleAuth} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>{isSigningUp ? 'Create account' : 'Sign in'}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.switchAuthBtn} onPress={() => setIsSigningUp(!isSigningUp)}>
          <Text style={styles.switchAuthText}>
            {isSigningUp ? 'Already registered? Sign in' : 'New here? Create an account'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  authCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#f4f6f8' },
  authCard: { backgroundColor: '#fff', padding: 24, borderRadius: 12, width: '100%', maxWidth: 400, borderWidth: 1, borderColor: '#eee' },
  authTitle: { fontSize: 24, fontWeight: 'bold', color: '#111', textAlign: 'center' },
  authSub: { fontSize: 13, color: '#666', textAlign: 'center', marginTop: 4, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 8, fontSize: 15, color: '#333' },
  saveButton: { backgroundColor: '#007AFF', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  switchAuthBtn: { marginTop: 14, alignItems: 'center' },
  switchAuthText: { color: '#007AFF', fontSize: 13, fontWeight: '600' },
});
