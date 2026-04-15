# Aoede

Aoede is a web app for adaptive foreign-language listening and reading with books from Project Gutenberg.

The user chooses:
- a `study language`
- a `book language`
- a book from a personal library

Aoede then:
- loads the book text
- tracks the reader's position in that specific book
- simplifies each sentence to a chosen reading level
- translates for the user's own language
- plays text-to-speech audio
- automatically translates the UI into the user's language

Aoede is now maintained as a `web app only`. The current architecture is:
- Expo / React Native Web for the frontend
- a Netlify Function for translation, simplification, language-list, and TTS API calls
- OpenAI for sentence simplification and reader-facing translation
- Google Cloud Translation and Text-to-Speech for fast translation, language metadata, and audio

## Current Architecture

Frontend:
- `App.js` holds the main application state
- `UI.js` switches between the home view and the reading view
- `HomeUI.js`, `ReadingUI.js`, and `LibraryUI.js` render the major screens
- `bookReader*.js` manages reading position, sentence extraction, and sentence processing
- `bookPipe*.js` fetches and prepares source text

Backend:
- `netlify/functions/aoedeapi.js` is the only serverless endpoint
- `netlify/functions/simplifiers/` contains the reading-level prompt templates

Deployment:
- Netlify builds the web app with `expo export -p web --output-dir docs/app`
- Netlify publishes `docs/app`
- Netlify also deploys the function in `netlify/functions`

## Features

- Web-based, no app store required
- Intelligent personal library built from Project Gutenberg
- Per-book position memory
- Multiple reading levels: `6`, `9`, `12`, `15`, `18`
- Sentence-by-sentence simplification
- Study-language and user-language display
- Listening-speed control
- Automatic UI translation into the user's language
- Gamepad support on web

## Requirements

You will need:
- Node.js
- npm
- a Netlify account
- an OpenAI API key
- a Google Cloud API key with:
  - Translation API enabled
  - Text-to-Speech API enabled

The project currently uses the dependencies pinned in `package.json` and `package-lock.json`.

## Local Setup

1. Clone the repository.
2. Install dependencies:

```bash
npm install
```

3. Create a local `.env` file in the project root:

```env
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=AIza...
```

Do not commit `.env`.

## Running Aoede Locally

There are two useful local modes.

### 1. Frontend only

This is the quickest way to run the web UI:

```bash
npx expo start --web
```

This starts the Expo web app locally.

Important:
- the frontend currently calls a hardcoded Netlify function URL in `apiServices.js`
- that means the local web app will still talk to the deployed backend unless you change that constant

Current setting:

```js
const NETLIFY_ENDPOINT = "https://aoede-site.netlify.app/.netlify/functions/aoedeapi";
```

### 2. Full local stack

To run both the frontend and the Netlify function locally:

```bash
netlify dev
```

With the current code, if you want the frontend to call the local function instead of production, temporarily change the endpoint in `apiServices.js` to:

```js
const NETLIFY_ENDPOINT = "http://localhost:8888/.netlify/functions/aoedeapi";
```

After local testing, change it back before committing unless you intentionally want to alter the deployed architecture.

## Recreating Aoede on Your Own Machine

If you want your own independently working copy of Aoede, the minimum path is:

1. Clone this repository.
2. Run `npm install`.
3. Create `.env` with valid OpenAI and Google keys.
4. Create a Netlify site.
5. Link the local repo to that Netlify site.
6. Add the same environment variables to the Netlify site:
   - `OPENAI_API_KEY`
   - `GOOGLE_API_KEY`
7. Update `NETLIFY_ENDPOINT` in `apiServices.js` to point to your own deployed function URL.
8. Run locally with `netlify dev`.
9. Deploy with `netlify deploy --prod`.

Your deployed function URL will look like:

```text
https://your-site-name.netlify.app/.netlify/functions/aoedeapi
```

## Netlify Configuration

Netlify is configured by `netlify.toml`:

```toml
[build]
  command = "expo export -p web --output-dir docs/app"
  publish = "docs/app"
  functions = "netlify/functions"
```

The function bundler is `esbuild`, and the simplifier prompt files are explicitly included for the `aoedeapi` function.

## Deploying to Production

Once your Netlify site is linked and authenticated:

```bash
netlify deploy --prod
```

That command:
- exports the Expo web build into `docs/app`
- bundles `netlify/functions/aoedeapi.js`
- publishes the site and function together

## Reading Levels

Aoede supports these reading levels:
- `RL 6`: strongest simplification
- `RL 9`
- `RL 12`
- `RL 15`
- `RL 18`: minimal or no simplification

The exact prompt logic lives in:
- `netlify/functions/simplifiers/simplify6.js`
- `netlify/functions/simplifiers/simplify9.js`
- `netlify/functions/simplifiers/simplify12.js`
- `netlify/functions/simplifiers/simplify15.js`
- `netlify/functions/simplifiers/simplify18.js`

## Notes for Maintainers

- User library state is stored locally with AsyncStorage
- Per-book reading position is also stored locally
- The app remembers whether the user last exited from Home or Reading
- If you are debugging sentence behavior, the most relevant code is in `bookReaderProcessing.js`
- If you are debugging API behavior, start with `apiServices.js` and `netlify/functions/aoedeapi.js`

## A Few Things Salvaged from the Older README

These ideas still belong in the project description:
- Aoede is adaptive, sentence-based, and book-centered
- it combines study language, user language, and source-book language
- it remembers where the reader left off
- it is intended to be used directly from a URL, not through app-store packaging

## Acknowledgments

Aoede was shaped with help from human and AI collaborators across its development life, and it remains a deliberately personal, maintainable project.
