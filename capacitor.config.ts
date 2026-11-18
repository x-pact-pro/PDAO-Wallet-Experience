import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'org.privatedao.wallet',
  appName: 'PrivateDAO Wallet',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 700,
      backgroundColor: '#080f1a',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
  },
}

export default config
