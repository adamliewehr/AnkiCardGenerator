# Anki Vocab Gen — Project Summary & Roadmap

## What It Is
A **local full-stack web app** that takes a word (or a word in context), fetches its definition via APIs/LLM, lets the user review and edit the result, then pushes a formatted flashcard directly into their local Anki desktop app via AnkiConnect.

The long-term vision is a **subject-aware flashcard generator** — not just vocabulary, but any domain (biology, history, law, etc.) where the user can get context-sensitive definitions and generate cards automatically.

---

## Current Tech Stack (Monorepo)

| Layer | Tech |
|---|---|
| **Frontend** | React + Vite (port 5173) |
| **Backend** | Node.js + Express (port 3000) |
| **HTTP client** | Axios (both sides) |
| **Dictionary** | Free Dictionary API (primary) |
| **Fallback** | LLM |
| **Anki** | AnkiConnect at `http://127.0.0.1:8765` |

---

## Architectural Decisions Made

### Forms
The UI has two distinct phases:
1. **Search** — text input + submit button
2. **Review** — editable form pre-filled with API data + "Save to Anki" button

Each editable field (`definition`, `partOfSpeech`, `synonyms`) has its own `useState` so the user can modify what the API returns before saving.

### API Strategy (layered fallback)
```
1. Free Dictionary API       → primary, simple JSON, easy to parse
2. LLM                       → fallback OR when user provides a sentence for context
```
This keeps the app functional for users who don't want LLM involvement while still supporting context-aware defining when needed.

### NLP (compromise.js)
Use `compromise` to tag the part of speech of a word *within a user-provided sentence*. Use that POS tag to filter the dictionary API results and select the correct definition. This is a valid, non-LLM approach to basic disambiguation.

### LLM Design
- **Default**: A free-tier LLM (Groq or Google Gemini) with a baked-in API key
- **User override**: User can input their own API key (stored in `localStorage`) for a better model
- **Local LLM**: Support Ollama (`http://localhost:11434`) as an option for privacy/environmental reasons — Ollama's API mirrors OpenAI's format so it's a simple URL swap
- API keys in localStorage are fine since this is a local personal tool

### Why Not GitHub Pages
GitHub Pages serves over **HTTPS**. Browsers block HTTP requests from HTTPS pages (mixed content policy). This breaks:
- AnkiConnect (`http://127.0.0.1:8765`)
- Local LLMs via Ollama (`http://localhost:11434`)

So pure frontend deployment doesn't work for this app.

### Deployment Strategy
**This is a local tool.** The correct distribution model is:
1. User clones the repo from GitHub
2. Runs `npm run dev` in both `/client` and `/server`
3. Opens `http://localhost:5173`

No cloud deployment needed. AnkiConnect requires Anki to be open locally anyway.

---

## Full Roadmap

### Phase 1 — Core Flow (Completed)
- [x] Fill in `POST /api/define` backend route with real axios call to Free Dictionary API
- [x] Complete editable review form in `App.jsx`
- [x] Implement "Save to Anki" button → POST to AnkiConnect

### Phase 2 — Robustness (Completed)
- [x] Error handling: word not found, Anki not running, duplicate card, bad audio URLs

### Phase 3 — Smart Definitions (Completed)
- [x] Add optional sentence input field to the UI
- [x] Use `compromise` to extract POS from the sentence
- [x] Sort dictionary results to match that POS (so correct context is auto-selected)

### Phase 4 — LLM Integration (In Progress)

**1. AI Selection Assistance (Contextual Disambiguation)**
- [x] **LLM Fallback (Zero Results)**: If the dictionary API fails to return anything, have the LLM dynamically generate a dictionary-style response (definition, examples, synonyms).
- [ ] **AI Selection Assistance (Results Exist)**: Add a ✨ "Auto-Select Best Definition" button to the UI.
  - *Implementation:* Create `POST /api/select-best-definition` that takes the word, context sentence, and API results. The LLM returns the index of the best matching meaning/definition, automatically updating the frontend form.

**2. UI Settings Panel & API Key Management**
- [ ] **Settings UI**: Add a collapsible section in the frontend for LLM configuration.
- [ ] **Client-side Storage**: Store the chosen provider (Gemini, Groq, Ollama) and API keys in `localStorage` (this prepares for `electron-store` in Phase 5).
- [ ] **Header Passing**: Pass user-configured API keys and provider preferences from the frontend to the backend via HTTP headers.

**3. Multi-Provider & Local LLM Support**
- [ ] **Unified LLM Helper**: Refactor the backend to use a single `generateLLMResponse` helper to support Gemini, Groq, and Ollama.
- [ ] **Ollama Support**: Implement standard axios POST to local Ollama instance (default `http://localhost:11434`).

**4. Subject Mode (Domain-Aware Definitions)**
- [ ] **UI Input**: Add a "Domain/Subject" optional input field or dropdown to the search form.
- [ ] **Direct-to-LLM Routing**: Update `POST /api/define`. If a domain is provided, **completely skip the Free Dictionary API** and route the query directly to the active LLM provider.
- [ ] **Domain Prompt**: Update the LLM prompt to strictly restrict the definition to the specified subject.

### Phase 5 — Package as Desktop App (Electron Migration)
- [ ] **Electron Wrapper**: Wrap the entire monorepo in Electron. The existing Express backend (`server/app.js`) should be integrated into the Electron Main process, while the React frontend (Vite production build) runs in the Renderer process.
- [ ] **API Key Abstraction (`electron-store`)**: Eliminate the developer-centric `.env` file approach. Implement `electron-store` in the Main process to securely persist the user's Gemini API key locally across sessions.
- [ ] **Settings UI**: Build a Settings modal in the React frontend where the user can input their Gemini API key. Use Electron IPC (Inter-Process Communication) to send this key to the Main process to be saved.
- [ ] **Single Installable App**: Configure `electron-builder` to package the application into a standalone `.exe` or `.dmg`. End-users should never have to open a terminal.
- [ ] **Distribution**: Distribute the packaged binaries via GitHub Releases.

---

## Key Concepts Covered
- **React controlled inputs** — input value tied to state, `onChange` updates state on every keystroke
- **useState** — special variables that trigger re-renders when updated via their setter function
- **Hooks** — the `use` naming convention; `useState`, `useEffect`, `useRef`, `useContext` are the main ones
- **Axios `.data`** — axios wraps responses, actual JSON lives at `response.data` not `response`
- **nodemon** — install as `devDependency`, use `npm run dev` to auto-restart server on file changes
- **Mixed content policy** — browsers block HTTP calls from HTTPS pages (why GitHub Pages won't work)
