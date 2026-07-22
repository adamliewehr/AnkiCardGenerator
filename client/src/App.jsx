import { useState } from "react";
import axios from "axios";

function App() {
  const [word, setWord] = useState(""); // controlled input
  const [result, setResult] = useState(null); // the json response;

  // const [partOfSpeech, setPartOfSpeech] = useState("");
  // const [definition, setDefinition] = useState("");
  // const [synonyms, setSynonyms] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post("http://localhost:3000/api/define", {
        word,
      });
      setResult(response.data);
      console.log(response.data);
      // setDefinition(response.data.definition);
      // setPartOfSpeech(response.data.partOfSpeech);
      // setSynonyms(response.data.synonyms);
    } catch (err) {
      setError("Word not found");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input
          type='text'
          value={word}
          onChange={(e) => setWord(e.target.value)}
          placeholder='Enter a word...'
        />
        <button type='submit' disabled={loading}>
          {loading ? "Searching..." : "Define"}
        </button>
      </form>

      {error && <p>{error}</p>}

      {result
        ? result.phonetics.map((obj) => {
            // console.log(obj.audio);
            // <h1>{obj.text}</h1>;
            return <audio src={obj.audio} controls />; // i forgor the return and lost 10 mins. bruh
          })
        : ""}

      {result
        ? result.meanings.map((obj) => {
            console.log(obj);
            return (
              <div>
                <h1>{obj.partOfSpeech}</h1>

                {obj.definitions.map((def) => {
                  return (
                    <div>
                      <p>Def: {def.definition}</p>
                      <p>{def.example ? "Example: " + def.example : null}</p>
                      {def.synonyms.length != 0 ? "Synonyms: " : null}
                      {def.synonyms.map((syn) => {
                        return syn + " ";
                      })}
                      <p>------</p>
                    </div>
                  );
                })}

                <h2>All {obj.partOfSpeech} Synonyms: </h2>
                {obj.synonyms.map((word) => {
                  return <p>{word}</p>;
                })}
              </div>
            );
          })
        : ""}

      {/* {result && (
        <div>
          <h2>Word: {word}</h2>
          <label htmlFor='definition'>Def:</label>
          <textarea
            id='definition'
            value={definition}
            onChange={(e) => setDefinition(e.target.value)}
          ></textarea>
          <br />

          <label htmlFor='partOfSpeech'>partOfSpeech:</label>
          <textarea
            id='partOfSpeech'
            value={partOfSpeech}
            onChange={(e) => setPartOfSpeech(e.target.value)}
          ></textarea>
          <br />

          <label htmlFor='synonyms'>synonyms:</label>
          <textarea
            id='synonyms'
            value={synonyms}
            onChange={(e) => setSynonyms(e.target.value)}
          ></textarea>
        </div>
      )} */}
    </div>
  );
}

export default App;
