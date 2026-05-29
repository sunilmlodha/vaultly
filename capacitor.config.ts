import type { CapacitorConfig } from '@capacitor/cli'

const isProd = process.env.NODE_ENV === 'production'

const config: CapacitorConfig = {
  // ── App identity ──────────────────────────────────────────────────────────
  appId:   'app.vaultly.finance',
  appName: 'Vaultly',

  // ── Web directory (used when NOT using a remote server URL) ───────────────
  // For dev/local testing: build with `next build && next export`, point here.
  // For production: we use server.url (remote-loaded approach) so webDir is
  // the fallback for offline shell only.
  webDir: 'out',

  // ── Remote server (production: loads the live Vercel deployment) ──────────
  // This means the app is always up to date without an App Store update.
  // Remove this block when you want a fully offline-capable native build.
  server: {
    url: isProd ? 'https://vaultly-mu.vercel.app' : 'http://localhost:3000',
    cleartext: false,
    // Allow navigation within the Vaultly domain
    allowNavigation: ['vaultly-mu.vercel.app'],
  },

  // ── iOS ──────────────────────────────────────────────────────────────────
  ios: {
    scheme: 'vaultly',
    contentInset: 'always',
    backgroundColor: '#6366f1',
    // Minimum iOS version required: 16.0
  },

  // ── Android ──────────────────────────────────────────────────────────────
  android: {
    backgroundColor: '#6366f1',
    // Minimum Android SDK: 24 (Android 7.0)
  },

  // ── Plugins ──────────────────────────────────────────────────────────────
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#6366f1',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#6366f1',
      overlaysWebView: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    // Keyboard behaviour — prevent the keyboard from pushing the viewport
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
}

export default config
