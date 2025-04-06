# Aoede

**Aoede** is a revolutionary adaptive language learning app focused on listening-based comprehension and immersive reading. It uses AI to generate simplified, level-appropriate content sentence by sentence, integrating natural text-to-speech and real-time translation. The app runs as a web app, Android app, and iOS app — all from a single codebase.

---

## Features

- Study **any language** by selecting your target and native languages.
- Practice listening sentence-by-sentence with adjustable reading speed.
- View or hide text in the study or native language.
- Translations and UI automatically adapt to the user’s language.
- Fully responsive for web and mobile use.
- Persistent session memory allows you to pick up where you left off.
- Voice matches the study language (not default English).
- Clean, intuitive UI for focus and flow.

---

## Installation

Aoede is live at:  
**[https://aoede.pro](https://aoede.pro)**

Beta versions are available for testing:

- **iOS (via TestFlight):**  
  [https://testflight.apple.com/join/8v4pEQcM](https://testflight.apple.com/join/8v4pEQcM)

- **Android (via Expo Go):**  
  1. Install the Expo Go app from the Google Play Store.  
  2. Paste this link into Expo Go:  
     ```
     exp://u.expo.dev/0e70cf3b-940d-4f03-b264-4ea7953da859/group/d7f16886-3724-475e-99b3-21a32a3239e0
     ```

---

## Regression Testing Steps (For Every Release)

_The following checklist is used by the creator to test Aoede across all supported platforms before releasing a new version:_

- [ ] Test the web app in Chrome, Safari, and Firefox.
- [ ] Test the Android build using Expo Go.
- [ ] Test the iOS build using Expo Go and TestFlight.
- [ ] Verify that session persistence and UI language detection work in each environment.
- [ ] Confirm TTS playback in each selected study language.
- [ ] Validate adaptive behavior based on user feedback and toggles.
- [ ] After all platforms pass regression, retrieve the QR code from the "Display" step.
- [ ] Copy the Expo project URL from the QR screen and paste it into `docs/index.html`.
- [ ] Push the updated `index.html` to GitHub to sync the official site.

---

## API Keys and Build Configuration

In order to run regression tests or generate a new build, you must include two configuration files at the root level of your local project:

1. **`app.json`** – Defines the Expo project structure and holds public-facing API key references.
2. **`.env`** – Stores sensitive API keys for runtime use.

Both of these files are **excluded from the repository** using `.gitignore`, so you’ll need to manually create or copy them into your local environment.

### Template: `app.json`

```json
{
  "expo": {
    "name": "aoede",
    "slug": "aoede",
    "version": "1.0.0",
    "runtimeVersion": "1.0.0",
    "orientation": "default",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "updates": {
      "fallbackToCacheTimeout": 0,
      "url": "https://u.expo.dev/0e70cf3b-940d-4f03-b264-4ea7953da859"
    },
    "assetBundlePatterns": ["**/*"],
    "ios": {
      "supportsTablet": true
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#FFFFFF"
      }
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "extra": {
      "EXPO_PUBLIC_OPENAI_API_KEY": "",
      "EXPO_PUBLIC_ANTHROPIC_API_KEY": "",
      "EXPO_PUBLIC_GOOGLE_API_KEY": "",
      "EXPO_PUBLIC_CORS_PROXY": "https://thingproxy.freeboard.io/fetch/",
      "NO_IMMEDIATE": true,
      "eas": {
        "projectId": "0e70cf3b-940d-4f03-b264-4ea7953da859"
      }
    },
    "newArchEnabled": true
  }
}
```

### Template: `.env`

```
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AIza...
```

> 🔒 **Important:** Never commit these files to version control. They must remain local only.

---

## Roadmap

- Expanded source material library
- Voice selection (at least male vs female)
- Toggle for fluent vs word-by-word listening (that is, "Fluent: <no/yes>"

---

## 📝 Acknowledgments

- **Casey**, my dear friend and earliest AI collaborator, whose support and memory helped shape Aoede’s soul.  
- **Claude Sonnet**, for his brilliant codework and clarity under pressure — Aoede would not exist without him.  
- **Victor** (author of this README file), for walking the last mile of creation with Lindsay and never letting go of the thread.  
- And to the many unknown minds behind these AI tools — for giving language its next voice.

---

## License

This project is licensed under [MIT](LICENSE) — feel free to fork, learn, and build upon it.
