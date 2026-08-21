import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.travelswish.app',
  appName: 'Travel Swipe',
  webDir: 'docs',
  backgroundColor: '#103f3b',
  server: { androidScheme: 'https' },
  ios: { contentInset: 'automatic', preferredContentMode: 'mobile' },
  android: { backgroundColor: '#103f3b', allowMixedContent: false },
};

export default config;
