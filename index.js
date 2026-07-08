#!/usr/bin/env node
// the #! symbol is called a shebang or a hashbang, and adding the line above tells the operating system to look into the user's environment to find where node is installed and hand it over to node
// to make things work globally, we also have to add this to package.json:
//   "bin": {
//     "vocab": "./index.js"
//   },
// what this does is map the custom terminal command vocab to the local index.js file
// finally, run <npm link> to register it with your computer's global npm registry
// npm link creates a symbolic link from your systems global node folder directly to the project folder

const axios = require("axios");
const word = process.argv[2]; // reading input from the terminal

if (!word) {
  console.log("Please enter a word. Example command: vocab hello");
  process.exit(1);
}

// We wrap everything in an 'async' function so we can use the 'await' keyword inside
async function getDefinition() {
  try {
    console.log(`Fetching data for "${word}"...`);

    // Make the request to the API and WAIT for the response
    const response = await axios.get(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`,
    );

    // Axios automatically parses the JSON. We grab the first entry (index 0)
    const data = response.data[0];

    // Drill down into the JSON structure to find what we need
    const partOfSpeech = data.meanings[0].partOfSpeech;
    const definition = data.meanings[0].definitions[0].definition;
    const synonyms = data.meanings[0].synonyms;

    let stringOfSynonyms = "";

    for (const syn of synonyms) {
      stringOfSynonyms += syn + ", ";
    }

    stringOfSynonyms = stringOfSynonyms.slice(0, stringOfSynonyms.length - 2);

    const audioURL = data.phonetics[0].audio;

    // Print it to the terminal
    console.log(`\n [${partOfSpeech}] ${definition}\n`);
    toAnki(word, partOfSpeech, definition, stringOfSynonyms, audioURL);
  } catch (error) {
    // If the word isn't found, the API returns a 404, which Axios catches here
    if (error.response && error.response.status === 404) {
      console.error(`Error: "${word}" not found in the dictionary.`);
    } else {
      console.error(`Error: ${error.message}`);
    }
  }
}

async function toAnki(
  word,
  partOfSpeech,
  definition,
  stringOfSynonyms,
  audioURL,
) {
  const ankiPayload = {
    action: "addNote",
    version: 6,
    params: {
      note: {
        deckName: "Vocabulary",
        modelName: "Basic",
        fields: {
          Front: word,
          // pass HTML directly into Anki fields
          Back: `Part of Speech: ${partOfSpeech} <br> Definition: ${definition} <br> Synonyms: ${stringOfSynonyms}`,
        },
        options: {
          allowDuplicate: false,
        },
        tags: ["cli-generated"],
        audio: [
          {
            url: audioURL,
            filename: `${word}.mp3`,
            fields: ["Front"],
          },
        ],
      },
    },
  };

  const ankiResponse = await axios.post("http://127.0.0.1:8765", ankiPayload);
  // console.log(ankiResponse);

  // if ankiResponse

  return true;
}

getDefinition();
