import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jurovpet.app',
  appName: 'Juro V-Pet',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
