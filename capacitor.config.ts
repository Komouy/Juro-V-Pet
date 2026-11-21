import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jurovpet.app',
  appName: 'Juro Virtual Pet',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    url: 'https://jurovpet.vercel.app',
    cleartext: false,
  },
};

export default config;
