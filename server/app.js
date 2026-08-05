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

async function generateLLMResponse(provider, apiKey, ollamaUrl, prompt) {
  if (provider === "gemini") {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (!key) throw new Error("No Gemini API key provided.");
    const ai = new GoogleGenAI({ apiKey: key });
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    return response.text;
  } else if (provider === "groq") {
    const key = apiKey || process.env.GROQ_API_KEY;
    if (!key) throw new Error("No Groq API key provided.");
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama3-8b-8192", // Fast default Groq model
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      },
      { headers: { Authorization: `Bearer ${key}` } },
    );
    return response.data.choices[0].message.content;
  } else if (provider === "ollama") {
    const url = ollamaUrl || "http://localhost:11434";
    const response = await axios.post(`${url}/api/generate`, {
      model: "llama3", // Common local model
      prompt: prompt,
      stream: false,
      format: "json",
    });
    return response.data.response;
  } else {
    throw new Error(`Unsupported provider: ${provider}`);
  }
}

async function generateDefinitionsViaLLM(
  word,
  sentence,
  domain,
  provider,
  apiKey,
  ollamaUrl,
) {
  const baseInstructions = `If the word is complete gibberish (e.g., random keyboard mashing) and has absolutely no meaning in any language, slang, or technical domain, return exactly: {"meanings": []}
  Otherwise, return the response as a JSON object with a single "meanings" array in this exact schema:
  {
    "meanings": [
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
    ]
  }`;

  let prompt = `Define the word "${word}". ${baseInstructions} Provide multiple part of speech entries if applicable.`;

  if (domain) {
    prompt = `Define the word "${word}" strictly in the context of the subject/domain of ${domain}. ${baseInstructions}`;
  } else if (sentence) {
    prompt = `Define the word "${word}" strictly in the context of this sentence: "${sentence}". ${baseInstructions}`;
  }

  const llmTextResponse = await generateLLMResponse(
    provider,
    apiKey,
    ollamaUrl,
    prompt,
  );

  let parsedData = JSON.parse(llmTextResponse);
  let fallbackMeanings = Array.isArray(parsedData)
    ? parsedData
    : parsedData.meanings || [];

  if (!fallbackMeanings || fallbackMeanings.length === 0) {
    throw new Error("Word not found");
  }

  if (sentence && !domain) {
    const match = nlp(sentence).match(`{${word}}`);
    let identifiedPOS = null;
    if (match.has("#Noun")) identifiedPOS = "noun";
    else if (match.has("#Verb")) identifiedPOS = "verb";
    else if (match.has("#Adjective")) identifiedPOS = "adjective";
    else if (match.has("#Adverb")) identifiedPOS = "adverb";

    if (identifiedPOS) {
      const matchedMeanings = fallbackMeanings.filter(
        (m) => m.partOfSpeech === identifiedPOS,
      );
      const otherMeanings = fallbackMeanings.filter(
        (m) => m.partOfSpeech !== identifiedPOS,
      );
      fallbackMeanings = [...matchedMeanings, ...otherMeanings];
    }
  }

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

  return { phonetics: [], meanings: fallbackMeanings, isAIGenerated: true };
}

app.post("/api/define", async (req, res) => {
  const { word, sentence, domain, forceLLM } = req.body;
  const llmProvider = req.headers["x-llm-provider"] || "gemini";
  const apiKey = req.headers["x-api-key"] || "";
  const ollamaUrl = req.headers["x-ollama-url"] || "";

  if (forceLLM || domain) {
    try {
      const result = await generateDefinitionsViaLLM(
        word,
        sentence,
        domain,
        llmProvider,
        apiKey,
        ollamaUrl,
      );
      return res.send(result);
    } catch (err) {
      return res
        .status(404)
        .send({
          error: err.message || "Failed to generate custom definition.",
        });
    }
  }

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

      if (match.has("#Noun")) identifiedPOS = "noun";
      else if (match.has("#Verb")) identifiedPOS = "verb";
      else if (match.has("#Adjective")) identifiedPOS = "adjective";
      else if (match.has("#Adverb")) identifiedPOS = "adverb";

      console.log(`[NLP] Word: "${word}" | Sentence: "${sentence}"`);
      console.log(
        `[NLP] Found in sentence: ${match.found} | Identified POS: ${identifiedPOS}`,
      );

      if (identifiedPOS) {
        // Bring all meanings that match the POS to the top
        const matchedMeanings = meanings.filter(
          (m) => m.partOfSpeech === identifiedPOS,
        );
        const otherMeanings = meanings.filter(
          (m) => m.partOfSpeech !== identifiedPOS,
        );
        meanings = [...matchedMeanings, ...otherMeanings];
        console.log(
          `[NLP] Sorted ${matchedMeanings.length} '${identifiedPOS}' block(s) to the top.`,
        );
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
    const uniquePhonetics = Array.from(new Set(phonetics.map((p) => p.audio)))
      .map((audio) => phonetics.find((p) => p.audio === audio))
      .filter((p) => p && p.audio);

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
    // If the Dictionary API returns 404, 502, 429, etc., fall back to LLM
    if (error.response || error.request) {
      console.log(
        `[API] "${word}" failed in Dictionary API (${error.response?.status || 'Network Error'}). Falling back to ${llmProvider}...`,
      );
      try {
        const result = await generateDefinitionsViaLLM(
          word,
          sentence,
          domain,
          llmProvider,
          apiKey,
          ollamaUrl,
        );
        return res.send(result);
      } catch (fallbackError) {
        return res
          .status(404)
          .send({ error: "Word not found and LLM fallback failed." });
      }
    } else {
      console.error(`Error:`, error);
      res.status(500).send({ error: error.stack || String(error) });
    }
  }
});

app.post("/api/select-best-definition", async (req, res) => {
  const { word, sentence, meanings } = req.body;
  const llmProvider = req.headers["x-llm-provider"] || "gemini";
  const apiKey = req.headers["x-api-key"] || "";
  const ollamaUrl = req.headers["x-ollama-url"] || "";

  if (!sentence || !meanings || meanings.length === 0) {
    return res
      .status(400)
      .send({ error: "Sentence and meanings are required." });
  }

  try {
    const prompt = `
    You are an expert linguist. The user wants to know the best definition for the word "${word}" based on how it is used in the following sentence:
    "${sentence}"
    
    Here is the list of available meanings and definitions:
    ${JSON.stringify(meanings, null, 2)}
    
    Analyze the sentence and determine which part of speech and specific definition fits best.
    Return your answer as a JSON object strictly following this schema:
    {
      "meaningIndex": [integer, index of the best meaning array],
      "definitionIndex": [integer, index of the best definition inside that meaning array]
    }
    If NO definition fits perfectly or even remotely, return {"meaningIndex": -1, "definitionIndex": -1}. Do not return anything except the JSON object.
    `;

    const llmTextResponse = await generateLLMResponse(
      llmProvider,
      apiKey,
      ollamaUrl,
      prompt,
    );
    const parsedData = JSON.parse(llmTextResponse);

    if (
      typeof parsedData.meaningIndex !== "number" ||
      typeof parsedData.definitionIndex !== "number"
    ) {
      throw new Error("Invalid format returned by LLM");
    }

    res.send(parsedData);
  } catch (error) {
    console.error("Selection Assistance Error:", error);
    res
      .status(500)
      .send({ error: "Failed to automatically select the best definition." });
  }
});

app.post("/api/sendToAnki", async (req, res) => {
  const { word, partOfSpeech, definition, example, synonyms, audioURL, deckName } =
    req.body;

  let backHTML = `<b>Part of Speech:</b> ${partOfSpeech}<br><br>`;
  backHTML += `<b>Definition:</b> ${definition}<br><br>`;
  if (example) backHTML += `<b>Example:</b> <i>${example}</i><br><br>`;
  if (synonyms) backHTML += `<b>Synonyms:</b> ${synonyms}<br><br>`;

  const ankiPayload = {
    action: "addNote",
    version: 6,
    params: {
      note: {
        deckName: deckName || "Vocabulary",
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
      console.warn(
        `Audio URL unreachable (${err.message}). Skipping audio for Anki card.`,
      );
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
    res
      .status(500)
      .send({ error: "Could not connect to Anki. Is it running?" });
  }
});

app.get("/api/decks", async (req, res) => {
  try {
    const ankiResponse = await axios.post("http://127.0.0.1:8765", {
      action: "deckNames",
      version: 6
    });
    if (ankiResponse.data.error) {
      res.status(500).send({ error: ankiResponse.data.error });
    } else {
      res.send({ decks: ankiResponse.data.result });
    }
  } catch (error) {
    console.error("AnkiConnect error fetching decks:", error.message);
    res.status(500).send({ error: "Could not connect to Anki. Is it running?" });
  }
});

app.post("/api/decks", async (req, res) => {
  const { deckName } = req.body;
  if (!deckName) return res.status(400).send({ error: "deckName is required" });

  try {
    const ankiResponse = await axios.post("http://127.0.0.1:8765", {
      action: "createDeck",
      version: 6,
      params: { deck: deckName }
    });
    if (ankiResponse.data.error) {
      res.status(500).send({ error: ankiResponse.data.error });
    } else {
      res.send({ success: true, result: ankiResponse.data.result });
    }
  } catch (error) {
    console.error("AnkiConnect error creating deck:", error.message);
    res.status(500).send({ error: "Could not connect to Anki. Is it running?" });
  }
});

app.listen(PORT, () => console.log(`running on port http://localhost:${PORT}`));
