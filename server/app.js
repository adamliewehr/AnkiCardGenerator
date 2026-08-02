require("dotenv").config({ path: "../.env" });
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const nlp = require("compromise");
const { GoogleGenAI } = require("@google/genai");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.post("/api/define", async (req, res) => {
  const { word, sentence } = req.body;

  try {
    const response = await axios.get(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`,
    );

    const entries = response.data;
    
    const phonetics = [];
    let meanings = [];

    for (const entry of entries) {
      if (entry.phonetics) phonetics.push(...entry.phonetics);
      if (entry.meanings) meanings.push(...entry.meanings);
    }

    if (sentence) {
      // Use curly braces to match any conjugated form or lemma of the word (e.g. "sprang" -> "spring")
      const match = nlp(sentence).match(`{${word}}`);
      let identifiedPOS = null;
      
      if (match.has('#Noun')) identifiedPOS = 'noun';
      else if (match.has('#Verb')) identifiedPOS = 'verb';
      else if (match.has('#Adjective')) identifiedPOS = 'adjective';
      else if (match.has('#Adverb')) identifiedPOS = 'adverb';

      console.log(`[NLP] Word: "${word}" | Sentence: "${sentence}"`);
      console.log(`[NLP] Found in sentence: ${match.found} | Identified POS: ${identifiedPOS}`);

      if (identifiedPOS) {
        // Bring all meanings that match the POS to the top
        const matchedMeanings = meanings.filter(m => m.partOfSpeech === identifiedPOS);
        const otherMeanings = meanings.filter(m => m.partOfSpeech !== identifiedPOS);
        meanings = [...matchedMeanings, ...otherMeanings];
        console.log(`[NLP] Sorted ${matchedMeanings.length} '${identifiedPOS}' block(s) to the top.`);
      }
    }

    // Number duplicate parts of speech so the UI is clear (e.g., "verb (1)", "verb (2)")
    const posCounts = {};
    for (const m of meanings) {
      posCounts[m.partOfSpeech] = (posCounts[m.partOfSpeech] || 0) + 1;
    }
    
    const posCurrent = {};
    for (const m of meanings) {
      if (posCounts[m.partOfSpeech] > 1) {
        posCurrent[m.partOfSpeech] = (posCurrent[m.partOfSpeech] || 0) + 1;
        m.partOfSpeechDisplay = `${m.partOfSpeech} (${posCurrent[m.partOfSpeech]})`;
      } else {
        m.partOfSpeechDisplay = m.partOfSpeech;
      }
    }

    // Deduplicate phonetics slightly
    const uniquePhonetics = Array.from(new Set(phonetics.map(p => p.audio)))
      .map(audio => phonetics.find(p => p.audio === audio))
      .filter(p => p && p.audio);

    res.send({ phonetics: uniquePhonetics, meanings });

    // // Drill down into the JSON structure to find what we need
    // const partOfSpeech = data.meanings[0].partOfSpeech;
    // const definition = data.meanings[0].definitions[0].definition;
    // const synonyms = data.meanings[0].synonyms;

    // let stringOfSynonyms = "";

    // for (const syn of synonyms) {
    //   stringOfSynonyms += syn + ", ";
    // }

    // stringOfSynonyms = stringOfSynonyms.slice(0, stringOfSynonyms.length - 2);

    // const audioURL = data.phonetics[0].audio;

    // // send back the word, partofspeech, and def as a json object

    // res.send({
    //   word: word,
    //   definition: definition,
    //   partOfSpeech: partOfSpeech,
    //   synonyms: stringOfSynonyms,
    //   audio: audioURL,
    // });
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.log(`[API] "${word}" not found in Dictionary API. Falling back to Gemini...`);
      
      if (!process.env.GEMINI_API_KEY) {
        console.error("No GEMINI_API_KEY found in .env");
        return res.status(404).send({ error: "Word not found and no Gemini API key configured for fallback." });
      }

      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        
        const baseInstructions = `If the word is complete gibberish (e.g., random keyboard mashing) and has absolutely no meaning in any language, slang, or technical domain, return an empty array: []
        Otherwise, return the response in this exact JSON schema:
        [
          {
            "partOfSpeech": "noun",
            "definitions": [
              {
                "definition": "The definition...",
                "example": "An example sentence...",
                "synonyms": ["synonym1", "synonym2"]
              }
            ]
          }
        ]`;

        let prompt = `Define the word "${word}". ${baseInstructions} Provide multiple part of speech entries if applicable.`;

        if (sentence) {
          prompt = `Define the word "${word}" strictly in the context of this sentence: "${sentence}". ${baseInstructions}`;
        }

        const genaiResponse = await ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });

        let fallbackMeanings = JSON.parse(genaiResponse.text);
        
        if (!fallbackMeanings || fallbackMeanings.length === 0) {
          return res.status(404).send({ error: "Word not found" });
        }
        
        // Ensure the NLP matching still applies if it was contextual
        if (sentence) {
          const match = nlp(sentence).match(`{${word}}`);
          let identifiedPOS = null;
          if (match.has('#Noun')) identifiedPOS = 'noun';
          else if (match.has('#Verb')) identifiedPOS = 'verb';
          else if (match.has('#Adjective')) identifiedPOS = 'adjective';
          else if (match.has('#Adverb')) identifiedPOS = 'adverb';

          if (identifiedPOS) {
            const matchedMeanings = fallbackMeanings.filter(m => m.partOfSpeech === identifiedPOS);
            const otherMeanings = fallbackMeanings.filter(m => m.partOfSpeech !== identifiedPOS);
            fallbackMeanings = [...matchedMeanings, ...otherMeanings];
          }
        }
        
        // Add partOfSpeechDisplay with a ✨ to indicate it was AI generated
        const posCounts = {};
        for (const m of fallbackMeanings) {
          posCounts[m.partOfSpeech] = (posCounts[m.partOfSpeech] || 0) + 1;
        }
        
        const posCurrent = {};
        for (const m of fallbackMeanings) {
          if (posCounts[m.partOfSpeech] > 1) {
            posCurrent[m.partOfSpeech] = (posCurrent[m.partOfSpeech] || 0) + 1;
            m.partOfSpeechDisplay = `${m.partOfSpeech} (${posCurrent[m.partOfSpeech]}) ✨`;
          } else {
            m.partOfSpeechDisplay = `${m.partOfSpeech} ✨`;
          }
        }

        res.send({ phonetics: [], meanings: fallbackMeanings, isAIGenerated: true });
      } catch (geminiError) {
        console.error("Gemini Fallback Error:", geminiError);
        res.status(500).send({ error: "Dictionary API failed and LLM fallback failed." });
      }
    } else {
      console.error(`Error: ${error.message}`);
      res.status(500).send({ error: "Internal server error" });
    }
  }
});

app.post("/api/sendToAnki", async (req, res) => {
  const { word, partOfSpeech, definition, example, synonyms, audioURL } = req.body;

  let backHTML = `<b>Part of Speech:</b> ${partOfSpeech}<br><br>`;
  backHTML += `<b>Definition:</b> ${definition}<br><br>`;
  if (example) backHTML += `<b>Example:</b> <i>${example}</i><br><br>`;
  if (synonyms) backHTML += `<b>Synonyms:</b> ${synonyms}<br><br>`;

  const ankiPayload = {
    action: "addNote",
    version: 6,
    params: {
      note: {
        deckName: "Vocabulary",
        modelName: "Basic",
        fields: {
          Front: word,
          Back: backHTML,
        },
        options: {
          allowDuplicate: false,
        },
        tags: ["web-generated"],
      },
    },
  };

  if (audioURL) {
    try {
      // Verify that the audio URL is actually reachable to prevent Anki download errors
      await axios.head(audioURL, { timeout: 3000 });
      ankiPayload.params.note.audio = [
        {
          url: audioURL,
          filename: `${word}-${Date.now()}.mp3`,
          fields: ["Front"],
        },
      ];
    } catch (err) {
      console.warn(`Audio URL unreachable (${err.message}). Skipping audio for Anki card.`);
    }
  }

  try {
    const ankiResponse = await axios.post("http://127.0.0.1:8765", ankiPayload);
    // AnkiConnect returns success status in response.data.error
    if (ankiResponse.data.error) {
      res.status(500).send({ error: ankiResponse.data.error });
    } else {
      res.send({ success: true, result: ankiResponse.data.result });
    }
  } catch (error) {
    console.error("AnkiConnect error:", error.message);
    res.status(500).send({ error: "Could not connect to Anki. Is it running?" });
  }
});

app.listen(PORT, () => console.log(`running on port http://localhost:${PORT}`));
