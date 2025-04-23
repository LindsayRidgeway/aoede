export default {
  expo: {
    name: "aoede",
    slug: "aoede",
    version: "1.0.0",
    runtimeVersion: {
      policy: "appVersion"
    },
    orientation: "default",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    updates: {
      fallbackToCacheTimeout: 0,
      url: "https://u.expo.dev/0e70cf3b-940d-4f03-b264-4ea7953da859"
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.lindsayridgeway.aoede",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false
      },
      buildNumber: "104"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#FFFFFF"
      },
      package: "com.lindsayridgeway.aoede"
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    extra: {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
      CORS_PROXY: process.env.CORS_PROXY,
      NO_IMMEDIATE: true,
      eas: {
        projectId: "0e70cf3b-940d-4f03-b264-4ea7953da859"
      }
    },
    newArchEnabled: true
  }
};