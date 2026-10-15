import React, { useState } from 'react';
import { ActivityIndicator, SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import {
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/manrope';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import { setToken } from './src/api';
import { colors } from './src/theme';

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });
  const [loggedIn, setLoggedIn] = useState(false);

  const handleLogout = () => {
    setToken(null);
    setLoggedIn(false);
  };

  // wait for the font; if it fails to load, carry on with the system font
  if (!fontsLoaded && !fontError) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      {loggedIn ? (
        <DashboardScreen onLogout={handleLogout} />
      ) : (
        <LoginScreen onLoginSuccess={() => setLoggedIn(true)} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ground, paddingTop: StatusBar.currentHeight || 0 },
  center: { alignItems: 'center', justifyContent: 'center' },
});
