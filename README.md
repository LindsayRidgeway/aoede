# Aoede

**Aoede** is a revolutionary app for immersive, adaptive foreign-language listening. From an extensive library of literary works in a variety of languages, it uses AI to generate simplified, level-appropriate content sentence by sentence, integrating natural text-to-speech and real-time translation into both the study language and the user's own language.

**Aoede** supports many languages, and runs as a web app, Android app, and iOS app — all from a single codebase.

---

## Quick Start

Aoede can be accessed via instructions at https://aoede.pro

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

- **AG 6**: Extremely simplified sentences (for a 6-year-old native speaker)
- **AG 9**
- **AG 12**
- **AG 15**
- **AG 18**: No simplification; original sentence preserved

At AG 18, Aoede skips the AI simplification step entirely.

---

## Error Codes

If something fails, Aoede will tell you. Expect messages like:

- `translation failed (A1)` – Google Translation API failed.
- `simplification failed (A2)` – GPT-4o Mini returned no output.
- `audio generation failed (A4)` – TTS service could not process sentence.
- `source sentence unavailable (A5)` – No sentence received from pipeline.

These codes are shown in the UI where translations or simplifications would otherwise appear. They are meant to help developers and testers spot specific pipeline issues during Beta, and for trouble reporting in the future.

---

## API Keys and Build Configuration

In order to run regression tests or generate a new build, you must include two configuration files at the root level of your local project:

1. **`app.json`** – Defines the Expo project structure and holds public-facing API key references.
2. **`.env`** – Stores sensitive API keys for runtime use.

Both of these files are and must be **excluded from the repository** using `.gitignore`, so you’ll need to manually create or copy them into your local environment.

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
- ⚠️ Some languages intermittently fail to translate—under investigation
- Reading level, reading speed, and both Show on/off switches used to be, and should be, persistent across sessions, but currently they are always reset to minimum value
- Add detailed CLI commands to Regression Testing (above)
- Since The Little Prince source material is in French, the title should appear in French in the list of books

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