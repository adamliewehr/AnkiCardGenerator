# Anki Vocab Gen

A desktop application designed to instantly generate robust Anki flashcards from vocabulary words. 

Anki Vocab Gen fetches definitions using the Free Dictionary API and intelligently falls back to Large Language Models (Google Gemini, Groq, or local Ollama) to generate context-aware definitions for slang, technical jargon, or obscure words. When you're happy with a definition, one click sends it directly to your local Anki deck.

## Features & Capabilities

- **Smart Dictionary Lookups**: Instantly pulls definitions, synonyms, part of speech, and audio pronunciation using the Free Dictionary API.
- **Context-Aware AI Definitions**: Paste the sentence where you found the word. If the dictionary fails, the app uses AI to generate a definition strictly based on that context.
- **Auto-Select Best Definition**: Even if standard dictionary results exist, you can use the AI "Auto-Select" feature to instantly highlight the exact meaning and part of speech that fits your context sentence.
- **Domain/Subject Mode**: Reading a biology paper or law textbook? Specify a "Domain" (e.g., Biology) to skip the standard dictionary and force the AI to provide a highly specialized, domain-accurate definition.
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
   - *Note: Please review the [Anki-Connect Docs](https://git.sr.ht/~foosoft/anki-connect) for specific OS permissions if AnkiConnect fails to bind.*

### 2. Installation (Currently macOS Only)
You do not need to use the terminal to run this app!
*Note: The current release is built specifically for macOS (Apple Silicon). Windows support is planned for the future.*
1. Go to the **Releases** tab on the GitHub repository.
2. Download the `.dmg` installer.
3. Install the application and open it.

### 3. API Key Setup
By default, the app uses AI for fallback definitions and smart auto-selection. 
1. Get a free API key from your preferred provider (e.g., [Google AI Studio](https://aistudio.google.com/app/apikey) for Gemini).
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
