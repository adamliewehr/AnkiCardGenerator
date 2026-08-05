# New Features Planning

This file is used to plan out new features for the Anki Vocab Gen project.

## 1. Image Support for Flashcards
- **Goal**: Allow users to attach relevant pictures to their flashcards to aid in memory retention.
- **Implementation**: Fetch real images using a standard Image/Stock Photo API (avoiding AI generation for performance and simplicity).
- **Anki Integration**: Images will be downloaded locally and passed to AnkiConnect as part of the `picture` field on the note.

### Potential APIs
1. **Pixabay API (Recommended)**
   - **Pros**: Offers illustrations and vector graphics which are often better for vocab than photos. Very generous free tier (5,000 requests/hour).
   - **Cost**: 100% Free.
2. **Pexels API**
   - **Pros**: High-quality stock photos, incredibly easy to use.
   - **Cost**: 100% Free (20,000 requests/month).
3. **Unsplash API**
   - **Pros**: The gold standard for beautiful, artistic photography.
   - **Cons**: Strict free tier limits (50 requests/hour).
4. **Wikimedia Commons API**
   - **Pros**: Completely open, no API keys, dictionary-style factual images.
   - **Cons**: Search can be messy, image quality varies wildly.
5. **Google Custom Search JSON API**
   - **Pros**: Will find an image for literally anything.
   - **Cons**: Restrictive free tier (100 queries/day), harder user onboarding (requires Custom Search Engine setup).

## 2. Reliable Audio / Text-to-Speech (TTS)
- **Problem**: The current Free Dictionary API audio is inconsistent, sometimes missing, or contains broken links.
- **Goal**: Implement a reliable, high-quality audio source so users can consistently hear the pronunciation of the words they are learning.
- **Selected Approach**: **Anki Native TTS**
  - Instead of downloading and sending `.mp3` files via AnkiConnect (which is unreliable via Free Dictionary API), we will leverage Anki's native TTS capabilities.
  - We will modify the Anki note creation logic to inject Anki's built-in TTS tag (e.g., `{{tts en_US:Front}}`) directly into the card payload when it is sent via AnkiConnect.
  - **Frontend Toggle**: A new checkbox will be added to the React frontend ("Include Audio Pronunciation"). This will allow the user to easily opt in or out of the TTS injection on a per-card basis. The toggle will be checked (enabled) by default.
  - This approach is 100% free, requires no external APIs or downloaded files, and seamlessly uses the OS-level voices when the user reviews the card in Anki.

- **Fallback Options (If Anki TTS sounds poor or doesn't work out):**
  - **Google Translate TTS API**: An unofficial but widely used endpoint (`translate.google.com/translate_tts`) that instantly returns an `.mp3` file. It's free, reliable, sounds very natural, and requires no API keys.
  - **Forvo API**: Crowdsourced real human pronunciations. Exceptional quality, but requires an API key and has strict rate limits (500 requests/day on the free tier).
  - **Browser Web Speech API**: 100% free and built into the browser, but it only *plays* audio and can't be exported as an `.mp3` to send to Anki.

## 3. Anki Deck Selection & Creation
- **Problem**: Currently, all generated flashcards are hardcoded to be routed to a deck named "Vocabulary".
- **Goal**: Give users full control over which Anki deck their flashcards are sent to, including the ability to create new decks dynamically.
- **Implementation**:
  - **Deck Dropdown**: On app load (or when a user clicks a refresh button), use AnkiConnect's `deckNames` action to fetch a list of all existing decks in the user's Anki profile. Populate a dropdown menu in the UI with these names.
  - **Dynamic Routing**: Modify the frontend to pass the selected deck name to the backend, and update the `addNote` payload to use that deck instead of the hardcoded "Vocabulary" string.
  - **Create Deck on the Fly**: Add a "Create New Deck" option. When triggered, use AnkiConnect's `createDeck` action to instantly create the deck in Anki, update the dropdown list, and automatically select the newly created deck.
