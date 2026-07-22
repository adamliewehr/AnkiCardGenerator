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
| **Fallback** | Merriam-Webster API (`shortdef` field) |
| **Anki** | AnkiConnect at `http://127.0.0.1:8765` |

---

## Current State

- ✅ Git repo initialized, monorepo structure (`/client`, `/server`)
- ✅ Express server running with `nodemon` on port 3000
- ✅ `POST /api/define` route stubbed out (axios logic still needs filling in)
- ✅ `App.jsx` has state variables and `handleSubmit` wired up
- ✅ Search form renders, calls backend, populates editable state
- ⬜ Backend route not yet returning real data from the dictionary API
- ⬜ Editable review form not yet complete
- ⬜ Anki push not yet implemented

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
2. Merriam-Webster API       → fallback, use `shortdef` field only (rest is deeply nested)
3. LLM                       → last resort OR when user provides a sentence for context
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

### Phase 1 — Core Flow (Current)
- [ ] Fill in `POST /api/define` backend route with real axios call to Free Dictionary API
- [ ] Complete editable review form in `App.jsx`
- [ ] Implement "Save to Anki" button → POST to AnkiConnect

### Phase 2 — Robustness
- [ ] Add Merriam-Webster as fallback (use `shortdef` only)
- [ ] Error handling: word not found, Anki not running, duplicate card

### Phase 3 — Smart Definitions
- [ ] Add optional sentence input field to the UI
- [ ] Use `compromise` to extract POS from the sentence
- [ ] Filter dictionary results to match that POS
- [ ] Add LLM fallback for context-dependent definition when sentence is provided

### Phase 4 — LLM Integration
- [ ] Default free LLM (Groq or Gemini) for subject-aware definitions
- [ ] UI settings panel: user can input their own API key
- [ ] Ollama support for local/private LLM option
- [ ] Subject mode: user picks a domain (biology, law, etc.) → LLM generates a context-aware definition

### Phase 5 — Package as Desktop App
- [ ] Wrap entire monorepo in **Electron**
- [ ] Single installable app — no terminal, no `npm run dev`
- [ ] Electron's Node.js backend can still hit AnkiConnect and Ollama on localhost
- [ ] Distribute via GitHub Releases

---

## Key Concepts Covered
- **React controlled inputs** — input value tied to state, `onChange` updates state on every keystroke
- **useState** — special variables that trigger re-renders when updated via their setter function
- **Hooks** — the `use` naming convention; `useState`, `useEffect`, `useRef`, `useContext` are the main ones
- **Axios `.data`** — axios wraps responses, actual JSON lives at `response.data` not `response`
- **nodemon** — install as `devDependency`, use `npm run dev` to auto-restart server on file changes
- **Mixed content policy** — browsers block HTTP calls from HTTPS pages (why GitHub Pages won't work)
