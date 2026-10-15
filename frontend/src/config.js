import { Platform } from 'react-native';
import Constants from 'expo-constants';

// ---- Change these if needed -------------------------------------------
const USE_CLOUD = true;  // true -> use the teacher's cloud server below
const CLOUD_URL = 'http://119.59.102.161:3063';
const LOCAL_PORT = 3000; // port of the local Express backend
// -----------------------------------------------------------------------

// Works for: Expo web, Expo Go on a phone (same Wi-Fi), Android emulator.
function guessHost() {
  if (Platform.OS === 'web') {
    return (typeof window !== 'undefined' && window.location.hostname) || 'localhost';
  }
  const hostUri =
    (Constants.expoConfig && Constants.expoConfig.hostUri) ||
    (Constants.expoGoConfig && Constants.expoGoConfig.debuggerHost) ||
    '';
  const host = hostUri.split(':')[0];
  if (host) return host;
  return Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
}

export const API_URL = USE_CLOUD ? CLOUD_URL : `http://${guessHost()}:${LOCAL_PORT}`;
