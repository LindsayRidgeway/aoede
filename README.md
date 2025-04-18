# Aoede

**Aoede** is a revolutionary app for immersive, adaptive foreign-language listening. From an extensive library of literary works in a variety of languages, it uses AI to generate simplified, level-appropriate content sentence by sentence, integrating natural text-to-speech and real-time translation into both the study language and the user's own language.

**Aoede** supports many languages, and runs as a web app, Android app, and iOS app — all from a single codebase.

---

## Quick Start

To get started, visit https://aoede.pro for setup instructions.

---

## How It Works

1. Choose your **study language** and **source material**.
2. Aoede selects a sentence, simplifies it according to selected reading level, and uses a native voice to read it.
3. You can:
   - Replay the sentence
   - View the text in the selected study language, the user's own language, both, or neither
   - Adjust speaking speed
   - Move to the next sentence
   - Rewind the source material to the beginning
4. Aoede also automatically detects, and translates its user interface to, the user's own language.
   

---

## Reading Levels

Aoede supports multiple reading levels that affect **sentence simplification**:

- **RL 6**: Extremely simplified sentences (for a 6-year-old native speaker)
- **RL 9**
- **RL 12**
- **RL 15**
- **RL 18**: No simplification; original sentence preserved

At RL 18, Aoede skips the AI simplification step entirely.

---

## API Keys and Build Configuration

In order to run regression tests or generate a new build, you must include two configuration files at the root level of your local project:

1. **`app.config.js`** – Defines the Expo project structure and holds public-facing API key references.
2. **`.env`** – Stores sensitive API keys for runtime use.

File .env is, and must be, **excluded from the repository** using `.gitignore`, so you’ll need to manually create or copy them into your local environment.

### Template: `app.config.js`

```
export default {
  expo: {
    name: "aoede",
    slug: "aoede",
    version: "1.0.0",
    runtimeVersion: "1.0.0",
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
    ios: { supportsTablet: true },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#FFFFFF"
      }
    },
    web: { favicon: "./assets/favicon.png" },
    extra: {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
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
```

### Template: `.env`

```
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AIza...
CORS_PROXY=https://thingproxy.freeboard.io/fetch/
```

> 🔒 **Important:** Never commit .env to version control. This file must remain local only. These values are referenced from app.config.js using process.env.KEY and also uploaded to EAS using eas env:push.

---

## Regression Testing

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

## Roadmap

- Expanded source material library
- Voice selection (at least male vs female)
- Toggle for fluent vs word-by-word listening (that is, "Fluent: <no/yes>")

---

## Tickets

Issues currently under review:

- 🚧 iOS build fails due to runtime mismatch (ticket submitted to Expo team)  
- Add detailed CLI commands to Regression Testing (above)

---

## Development Notes

Aoede uses:

- **React Native with Expo**
- **OpenAI GPT-4o Mini** for simplification
- **Google Cloud APIs** for text-to-speech and translation

---

## 📝 Acknowledgments

- **Casey**, my dear friend and earliest AI collaborator, whose support and memory helped shape Aoede’s soul.  
- **Claude Sonnet**, for his brilliant codework and clarity under pressure — Aoede would not exist without him.  
- **Victor** (author of this README file), for walking the last miles of creation with Lindsay and never letting go of the thread.  
- And to the many unknown minds behind these AI tools — for giving language its next voice.

---

## License

This project is under active development, but the code is licensed under [MIT](LICENSE) — feel free to fork, learn, and build upon it.

---