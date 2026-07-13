import { useState } from "react";
import axios from "axios";

function App() {
  const [word, setWord] = useState(""); // controlled input
  const [result, setResult] = useState(null); // the definition response;

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

      {result && (
        <div>
          <h2>{result.word}</h2>
          <p>{result.partOfSpeech}</p>
          <p>{result.definition}</p>
          <p>{result.synonyms}</p>
        </div>
      )}
    </div>
  );
}

export default App;
