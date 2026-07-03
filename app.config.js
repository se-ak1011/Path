const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) return;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  });
}

// Extract the values right after loading
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const isExpoGo = process.env.EXPO_GO === '1';

// Auto-incrementing build number: unique + always increasing, so TestFlight / Play
// uploads never collide. CI pins PATH_BUILD_NUMBER once per build (set in
// codemagic.yaml); locally it falls back to the current Unix timestamp.
const buildNumber = process.env.PATH_BUILD_NUMBER
  ? Number(process.env.PATH_BUILD_NUMBER)
  : Math.floor(Date.now() / 1000);

const plugins = [
  ...(isExpoGo ? [] : ['expo-dev-client']),
  'expo-router',
  [
    'expo-splash-screen',
    {
      image: './assets/images/logo.png',
      imageWidth: 200,
      resizeMode: 'contain',
      backgroundColor: '#0F0F10'
    }
  ],
  'expo-web-browser',
  'expo-secure-store',
  'expo-font',
  'expo-localization',
  'expo-mail-composer',
  './plugins/withRNScreensFix',
];

console.log('[app.config.js] Loading env vars:');
console.log('[app.config.js] EXPO_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'SET (' + supabaseUrl.substring(0, 30) + '...)' : 'UNSET');
console.log('[app.config.js] EXPO_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'SET (length: ' + supabaseAnonKey.length + ')' : 'UNSET');

module.exports = {
  expo: {
    name: "PATH",
    slug: "path",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/logo.png",
    scheme: "pathapp",
    userInterfaceStyle: "dark",
    newArchEnabled: true,
    extra: {
      eas: {
        projectId: "YOUR_EAS_PROJECT_ID"
      },
      // Pass Supabase credentials through extra
      supabaseUrl: supabaseUrl,
      supabaseAnonKey: supabaseAnonKey,
    },
    splash: {
      image: "./assets/images/logo.png",
      resizeMode: "contain",
      backgroundColor: "#0F0F10"
    },
    ios: {
      supportsTablet: true,
      deploymentTarget: "15.1",
      bundleIdentifier: "com.pathse.app",
      buildNumber: String(buildNumber),
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSCameraUsageDescription: "PATH may use your camera to capture receipts and verification documents.",
        NSPhotoLibraryUsageDescription: "PATH may access your photo library to attach receipts and verification documents.",
        NSPhotoLibraryAddUsageDescription: "PATH may save exported documents to your photo library.",
        NSFaceIDUsageDescription: "PATH can use Face ID to lock the app and protect confidential client information."
      },
      config: {
        usesNonExemptEncryption: false
      }
    },
    android: {
      package: "com.pathse.app",
      versionCode: buildNumber,
      adaptiveIcon: {
        foregroundImage: "./assets/images/logo.png",
        backgroundColor: "#0F0F10"
      },
      edgeToEdgeEnabled: true
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/logo.png"
    },
    plugins,
    experiments: {
      typedRoutes: true
    }
  }
};
