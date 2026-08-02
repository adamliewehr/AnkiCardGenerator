# Anki Vocab Gen

A local, full-stack web application designed to instantly generate robust Anki flashcards from vocabulary words. It uses the Free Dictionary API for primary definitions and intelligently falls back to a Gemini LLM to generate context-aware definitions for slang, technical jargon, or obscure words.

## Prerequisites

Before running this app, you must have the following installed and running locally:

1. **[Anki Desktop App](https://apps.ankiweb.net/)**: Must be open in the background.
2. **[AnkiConnect](https://ankiweb.net/shared/info/2055492159)**: An Anki add-on that allows external apps to communicate with your Anki database. (Add-on Code: `2055492159`).
   - _Note: Please read the [Anki-Connect Docs](https://git.sr.ht/~foosoft/anki-connect) because it provides information to allow it to work depending on what operating system you are running._
3. **Node.js**: Ensure Node is installed to run the local servers.

## Environment Variables

This app relies on the Gemini LLM for AI-generated definitions when a word isn't found in the dictionary. Since this is a local tool designed to be run on your own machine, you must provide your own free API key.

1. Get a free API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Create a `.env` file in the root of this repository.
3. Add your key to the file like this:
   ```env
   GEMINI_API_KEY="your_api_key_here"
   ```

## Installation & Running

This is a monorepo containing a React frontend (`/client`) and an Express/Node.js backend (`/server`).

1. **Install dependencies:**
   You will need to install the dependencies in both folders:

   ```bash
   cd server && npm install
   cd ../client && npm install
   ```

2. **Start the servers:**
   You will need to run the development servers for both the frontend and backend simultaneously (in two separate terminal tabs):

   ```bash
   # Terminal 1 (Backend)
   cd server
   npm run dev

   # Terminal 2 (Frontend)
   cd client
   npm run dev
   ```

3. **Use the App:**
   Ensure Anki is open, then open your browser to `http://localhost:5173`. Search for a word, optionally provide the sentence context, edit the definitions, and click "Save to Anki"!
