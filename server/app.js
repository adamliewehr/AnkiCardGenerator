const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.post("/api/define", async (req, res) => {
  const word = req.body.word;
  // get the word that the user wants to define

  try {
    // make the axios call to the dictionary API

    const response = await axios.get(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`,
    );

    // Axios automatically parses the JSON. We grab the first entry (index 0)
    const data = response.data[0];

    // so the way this JSON is structured, we care about two main keys:

    const phonetics = data.phonetics;
    const meanings = data.meanings;

    // console.log(phonetics);
    // console.log(meanings);

    res.send({ phonetics: phonetics, meanings, meanings });

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
    } else {
      console.error(`Error: ${error.message}`);
    }
  }
});

app.post("/api/sendToAnki", async (req, res) => {});

app.listen(PORT, () => console.log(`running on port http://localhost:${PORT}`));
