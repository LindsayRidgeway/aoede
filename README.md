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

- **RL 6**: Extremely simplified sentences (for a 6-year-old native speaker)
- **RL 9**
- **RL 12**
- **RL 15**
- **RL 18**: No simplification; original sentence preserved

At RL 18, Aoede skips the AI simplification step entirely.

---

## API Keys and Build Configuration

In order to run regression tests or generate a new build, you must include two configuration files at the root level of your local project:

1. **`.env`** – Stores sensitive API keys for runtime use.
2. **`app.config.js`** – Defines the app's Expo project structure.
3. **`eas.json`** – Defines build profiles for Expo Application Services (EAS).

The first file listed, .env, must be **excluded from the repository** using `.gitignore`, so you’ll need to manually create or copy it into your local environment, and store it for recovery
outside of the project directory.

### Template: `.env`

```
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AIza...
```

> 🔒 **Important:** Never commit this files to version control. It must remain local only.

---

## Regression Testing

_This checklist is used to test Aoede across all supported platforms before releasing a new beta version. It includes browser-based tests, Android testing (both QR and direct URL modes), and TestFlight deployment for iOS and Mac._

---

### 🌐 Web App Testing (Chrome, Safari)

1. In Terminal, navigate to the Aoede directory.
2. Set the default browser to **Chrome**: `export BROWSER="Google Chrome"`
3. Run:  
   ```
   npx expo start --clear
   ```
4. Press `w` to launch in Chrome.
5. Test Aoede in the Chrome browser.
6. Press `CTRL-C` to stop the process.

7. Set the browser to **Safari**: `export BROWSER=safari`
8. Run:  
   ```
   npx expo start --clear
   ```
9. Press `w` again.
10. Test Aoede in Safari, with **system language set to French**.  
    Confirm **I18N UI translation** works.
11. `CTRL-C` to stop.

12. Reset default browser to Chrome: `export BROWSER="Google Chrome"`

---

### 🤳 Android Testing

1. Run the Android build:
   ```
   eas build --platform android --profile apk
   ```
2. The last line of the build log provides a link to use on an Android, so paste the link into the Android section of docs/index.html, and send the link to your Android phone (perhaps via Telegram) for testing.

---

### 🍎 iOS + macOS Testing (TestFlight)

1. Run the iOS build:
   ```
   eas build --platform ios
   ```
2. Submit the build:
   ```
   eas submit --platform ios
   ```
3. Copy the TestFlight link from the final output and open it in a browser.
4. Sign in to **App Store Connect**.
5. Navigate: **Apps → Aoede → TestFlight tab**.
6. Wait for the build to finish processing.
7. Click the **certification** link, select **None**, and submit.
8. Click the previously deployed build.
9. Copy its description.
10. Expire that build.
11. Click the **new build**, paste in the old description, and save.
12. Navigate to **Testers → Outside Beta Testers → Builds tab**.
13. Click the “+” to assign the new build if needed.

#### On Your iPhone:
- Open **TestFlight**.
- Tap **Update**, then **Open**.
- Test Aoede on iOS.

#### On Your Mac:
- In App Store Connect, scroll to the **public TestFlight URL**.
- Double-click to open.
- Launch Aoede via TestFlight on macOS.

---

### 🧪 Final Checks (All Platforms)

- [ ] Confirm **session persistence** and **UI language detection**.
- [ ] Verify **TTS playback** in all selected study languages.
- [ ] Validate **adaptive sentence response** based on UI toggles and feedback.
- [ ] Retrieve the **Expo project URL** from the QR screen.
- [ ] Copy this URL into `docs/index.html`.
- [ ] Push the updated `index.html` to GitHub to sync the official site.
[aoede-1.2] ~/aoede $ 

---

## 🌐 Publishing Updates to aoede.pro

1. Add, commit, and push any files not yet committe to your current branch:
   ```
   git status
   git add .
   git commit -m "[describe changes]"
   git push
   ```

2. Make sure you are in the `main` branch:
   ```
   git checkout main
   git pull
   ```

3. Merge updated branch, such as `aoede-2.1` and including updated `docs/index.html`, into main:
   ```
   git merge aoede-2.1
   ```

4. Stage all changes:
   ```
   git add .
   ```

5. Commit the changes:
   ```
   git commit -m "Merge aoede-2.1 into main"
   ```

6. Push the changes to GitHub:
   ```
   git push
   ```

7. GitHub Pages will automatically rebuild the site within 30–90 seconds.

8. (Optional) Return to your working branch, such as `aoede-2.1`:
   ```
   git checkout aoede-2.1
   git push -u origin aoede-2.1
   ```

---

## ✅ Quick Summary

| Step | Command |
|:---|:---|
| Switch to `main` | `git checkout main` + `git pull` |
| Stage changes | `git add .` |
| Commit | `git commit -m "Publish new webpage for Aoede"` |
| Push to GitHub | `git push` |
| Return to work | `git checkout aoede-2.1` + `git push -u origin aoede-2.1` |

---

## Roadmap

- Forward and backward positioning of the source material
- Replace DOM logic with raw string scanning to greatly speed up the Library search feature
- Voice selection
- Individual word translation and pronunciation

---

## Tickets

Issues currently under review:

- Intermittent out-of-sync results from AI API

---

## Development Notes

Aoede uses:

- **React Native with Expo**
- **OpenAI GPT-4o** for source material translation and simplification
- **Google Cloud APIs** for text-to-speech and I18N translation

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