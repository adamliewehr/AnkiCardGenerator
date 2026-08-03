# Anki Vocab Gen

A desktop application designed to generate robust Anki flashcards from vocabulary words.

Anki Vocab Gen fetches definitions using the Free Dictionary API and falls back to Large Language Models (Google Gemini, Groq, or local Ollama) to generate context-aware definitions for slang, technical jargon, or obscure words. When you're happy with a definition, one click sends it directly to your local Anki deck.

## Features & Capabilities

- **Smart Dictionary Lookups**: Instantly pulls definitions, synonyms, part of speech, and audio pronunciation using the Free Dictionary API.
- **Context-Aware AI Definitions**: Paste the sentence where you found the word. If the dictionary fails, the app uses AI to generate a definition strictly based on that context.
- **Auto-Select Best Definition**: Even if standard dictionary results exist, you can use the AI "Auto-Select" feature to instantly highlight the exact meaning and part of speech that fits your context sentence.
- **Domain/Subject Mode**: Reading a biology paper or law textbook? Specify a "Domain" (e.g., Biology) to skip the standard dictionary and force the app to provide a highly specialized, domain-accurate definition.
- **Direct Anki Export**: Formats the selected definition, synonyms, examples, and audio files into a flashcard and pushes it directly to your Anki database using AnkiConnect.
- **Local & Private Options**: Configure the app to use a cloud provider like Google Gemini / Groq, or point it to a local Ollama instance for 100% offline, private AI generation.

---

## Getting Started

### 1. Prerequisites (Anki Setup)

Before using the app, you must configure Anki to accept cards from it.

1. Install the **[Anki Desktop App](https://apps.ankiweb.net/)** and keep it open in the background.
2. Install the **[AnkiConnect](https://ankiweb.net/shared/info/2055492159)** add-on in Anki.
   - Open Anki → Tools → Add-ons → Get Add-ons...
   - Enter the Code: `2055492159`
   - Restart Anki.
   - _Note: Please review the [Anki-Connect Docs](https://git.sr.ht/~foosoft/anki-connect) for specific OS permissions if AnkiConnect fails to bind._

### 2. Installation

You do not need to use the terminal to run this app!

1. Go to the **Releases** tab on the GitHub repository.
2. Download the installer for your operating system (`.dmg` for Mac, `.exe` for Windows).
3. Install the application by dragging it to your Applications folder.

**Mac Users Note ("App is damaged" Error):**
Because this is an open-source app and not signed with a paid Apple Developer certificate, macOS Gatekeeper may wrongly flag the downloaded app as "damaged". To fix this:

1. Open your Mac Terminal.
2. Run this exact command: `xattr -c /Applications/ankivocabgen.app`
3. If that doesn't work, run: `find /Applications/ankivocabgen.app -exec xattr -c {} +`
4. The app will now open normally!

### 3. AI Provider Setup (Highly Recommended: Local Ollama)

By default, the app uses AI to generate context-aware definitions. You can use cloud providers (Gemini, Groq), but we **highly recommend using a local LLM via Ollama** to avoid API rate limits and keep your data 100% private.

**Option A: Local Ollama (Recommended, Free, No Limits)**

1. Download and install [Ollama](https://ollama.com/).
2. Open your computer's Terminal and run this exact command to download the required model:
   ```bash
   ollama run llama3
   ```
   _(Note: The app is currently hard-coded to look for the `llama3` model specifically)._
3. Open the **Settings** panel inside the Anki Vocab Gen app.
4. Set the AI Provider to **Local Ollama** and click Save.

**Option B: Cloud Providers (Google Gemini / Groq)**

1. Get a free API key from your preferred provider (e.g., [Google AI Studio](https://aistudio.google.com/app/apikey)).
2. Open the **Settings** panel inside the Anki Vocab Gen app.
3. Select your provider, paste your API key, and the app will securely save it locally for future sessions.

---

## For Developers

If you want to modify the app or build it from source:

### Tech Stack

- **Frontend**: React + Vite
- **Backend**: Express + Node.js (integrated into the Electron Main process)
- **Desktop Wrapper**: Electron

### Local Development

1. Clone the repository and install dependencies:
   ```bash
   npm install
   npm run postinstall
   ```
2. Start the development environment (this boots the Vite frontend and Electron concurrently):
   ```bash
   npm run dev
   ```

### Building the Desktop App

To package the app into a standalone installer (`.dmg` or `.exe`):

```bash
npm run build:app
```

The packaged binaries will be output to the `dist/` folder.
