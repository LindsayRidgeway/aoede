import 'dotenv/config';

export default {
  expo: {
    name: "aoede",
    slug: "aoede",
    version: "1.0.0",
    runtimeVersion: '1.0.0',
    orientation: "default",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    updates: {
      fallbackToCacheTimeout: 0,
      url: "https://u.expo.dev/0e70cf3b-940d-4f03-b264-4ea7953da859"
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#FFFFFF"
      }
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    extra: {
      // Include a fallback empty string to avoid undefined errors
      EXPO_PUBLIC_OPENAI_API_KEY: process.env.EXPO_PUBLIC_OPENAI_API_KEY || '',
      EXPO_PUBLIC_ANTHROPIC_API_KEY: process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '',
      EXPO_PUBLIC_GOOGLE_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_API_KEY || '',
      EXPO_PUBLIC_CORS_PROXY: process.env.EXPO_PUBLIC_CORS_PROXY || '',
      NO_IMMEDIATE: true,
      eas: {
        projectId: "0e70cf3b-940d-4f03-b264-4ea7953da859"
      }
    },
    // Enable New Architecture as suggested by the warning
    newArchEnabled: true
  }
};