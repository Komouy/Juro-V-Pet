import type { CapacitorConfig } from '@capacitor/cli';

// Jika variabel VITE_CAPACITOR_LIVE_URL diset, APK memuat server remote untuk live debug.
// Secara default (kosong), APK memuat aset lokal dari webDir: 'dist' secara standalone & offline-ready.
const liveUrl = process.env.VITE_CAPACITOR_LIVE_URL;

const config: CapacitorConfig = {
  appId: 'com.jurovpet.app',
  appName: 'Juro Virtual Pet',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    ...(liveUrl ? { url: liveUrl, cleartext: false } : {}),
  },
};

export default config;
