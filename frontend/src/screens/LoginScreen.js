import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { login, setToken } from '../api';
import { showMessage } from '../dialogs';
import { colors, font, tierBg } from '../theme';
import { Button, Field } from '../ui';

// Three bars = the three salary tiers the app produces
function TierMotif({ compact }) {
  const widths = ['38%', '64%', '92%'];
  return (
    <View style={[styles.motif, compact && styles.motifCompact]} accessible={false}>
      {widths.map((w, i) => (
        <View
          key={w}
          style={[styles.motifBar, compact && styles.motifBarCompact, { width: w, backgroundColor: tierBg[i] }]}
        />
      ))}
    </View>
  );
}

export default function LoginScreen({ onLoginSuccess }) {
  const { width } = useWindowDimensions();
  const wide = width >= 860;

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      showMessage('Login failed', 'Please enter username and password.');
      return;
    }
    setLoading(true);
    try {
      const data = await login(username.trim(), password);
      setToken(data.token);
      onLoginSuccess();
    } catch (e) {
      showMessage('Login failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  const form = (
    <View style={styles.formWrap}>
      <Text style={styles.formTitle}>Sign in</Text>
      <Text style={styles.formHint}>Use your HR administrator account.</Text>

      <Field
        label="Username"
        autoCapitalize="none"
        autoCorrect={false}
        value={username}
        onChangeText={setUsername}
      />
      <Field
        label="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        onSubmitEditing={handleLogin}
      />
      <Button title="Login" onPress={handleLogin} loading={loading} style={{ marginTop: 4 }} />
    </View>
  );

  if (!wide) {
    return (
      <View style={{ flex: 1 }}>
        <View style={styles.mobileBrand}>
          <Text style={styles.mobileTitle}>HR Manager</Text>
          <Text style={styles.mobileSub}>Employee records and salary tiers in one place.</Text>
          <TierMotif compact />
        </View>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.mobileForm}
          keyboardShouldPersistTaps="handled"
        >
          {form}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.split}>
      <View style={styles.brandPanel}>
        <Text style={styles.brandTitle}>HR Manager</Text>
        <Text style={styles.brandSub}>Employee records and salary tiers in one place.</Text>
        <TierMotif />
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.formPanel}
        keyboardShouldPersistTaps="handled"
      >
        {form}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  split: { flex: 1, flexDirection: 'row' },
  brandPanel: {
    flex: 1,
    backgroundColor: colors.ink,
    padding: 56,
    justifyContent: 'center',
  },
  brandTitle: { color: '#FFFFFF', fontSize: 40, fontFamily: font.black, letterSpacing: -0.8 },
  brandSub: { fontFamily: font.medium, color: '#B7C6CB', fontSize: 18, lineHeight: 26, marginTop: 12, maxWidth: 380 },
  motif: { marginTop: 48, gap: 12 },
  motifBar: { height: 14, borderRadius: 7 },
  motifCompact: { marginTop: 22, gap: 8 },
  motifBarCompact: { height: 9, borderRadius: 5 },
  mobileBrand: {
    backgroundColor: colors.ink,
    paddingHorizontal: 24,
    paddingTop: 44,
    paddingBottom: 30,
  },
  mobileTitle: { fontFamily: font.black, fontSize: 36, letterSpacing: -0.8, color: '#FFFFFF' },
  mobileSub: { fontFamily: font.medium, fontSize: 15, lineHeight: 22, color: '#B7C6CB', marginTop: 8 },
  mobileForm: { padding: 24, paddingTop: 28, paddingBottom: 40 },
  formPanel: { flexGrow: 1, justifyContent: 'center', padding: 48 },
  narrow: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  formWrap: { width: '100%', maxWidth: 380, alignSelf: 'center' },
  compactTitle: { fontSize: 22, fontFamily: font.black, color: colors.ink, marginBottom: 28 },
  formTitle: { fontSize: 28, fontFamily: font.black, color: colors.ink, letterSpacing: -0.4 },
  formHint: { fontFamily: font.medium, fontSize: 15, color: colors.inkSoft, marginTop: 6, marginBottom: 24 },
});
