const express = require("express");
const cors = require("cors");
const axios = require("axios");
const nlp = require("compromise");

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
      console.error(`Error: "${word}" not found in the dictionary.`);
      res.status(404).send({ error: "Word not found" });
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
