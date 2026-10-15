import React, { useState } from 'react';
import { SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import { setToken } from './src/api';

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);

  const handleLogout = () => {
    setToken(null);
    setLoggedIn(false);
  };

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
  safe: { flex: 1, backgroundColor: '#f3f5f9', paddingTop: StatusBar.currentHeight || 0 },
});
