import { useState } from "react";
import axios from "axios";

function App() {
  const [word, setWord] = useState(""); // controlled input
  const [sentence, setSentence] = useState(""); // optional context sentence
  const [result, setResult] = useState(null); // the json response;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Selection state
  const [selectedMeaningIndex, setSelectedMeaningIndex] = useState(0);
  const [selectedDefIndex, setSelectedDefIndex] = useState(0);
  const [selectedAudioURL, setSelectedAudioURL] = useState("");

  // Editable fields
  const [formState, setFormState] = useState({
    definition: "",
    example: "",
    synonyms: "",
  });

  const updateFormState = (apiResult, meaningIdx, defIdx) => {
    if (!apiResult || !apiResult.meanings || !apiResult.meanings[meaningIdx]) return;
    const meaning = apiResult.meanings[meaningIdx];
    const def = meaning.definitions[defIdx];
    if (!def) return;

    const allSynonyms = [...(def.synonyms || []), ...(meaning.synonyms || [])];
    const uniqueSynonyms = [...new Set(allSynonyms)];

    setFormState({
      definition: def.definition || "",
      example: def.example || "",
      synonyms: uniqueSynonyms.join(", "),
    });
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await axios.post("http://localhost:3000/api/define", {
        word,
        sentence
      });
      const data = response.data;
      setResult(data);
      
      setSelectedMeaningIndex(0);
      setSelectedDefIndex(0);
      updateFormState(data, 0, 0);

      const firstAudioObj = data.phonetics?.find((p) => p.audio);
      setSelectedAudioURL(firstAudioObj ? firstAudioObj.audio : "");
    } catch (err) {
      setError("Word not found");
    } finally {
      setLoading(false);
    }
  }

  const handleMeaningChange = (e) => {
    const newIdx = parseInt(e.target.value, 10);
    setSelectedMeaningIndex(newIdx);
    setSelectedDefIndex(0);
    updateFormState(result, newIdx, 0);
  };

  const handleDefChange = (e) => {
    const newIdx = parseInt(e.target.value, 10);
    setSelectedDefIndex(newIdx);
    updateFormState(result, selectedMeaningIndex, newIdx);
  };

  const handleFormChange = (e) => {
    setFormState({
      ...formState,
      [e.target.name]: e.target.value
    });
  };

  const handleSaveToAnki = async () => {
    const payload = {
      word,
      partOfSpeech: result.meanings[selectedMeaningIndex].partOfSpeech,
      definition: formState.definition,
      example: formState.example,
      synonyms: formState.synonyms,
      audioURL: selectedAudioURL || null
    };
    
    setSaving(true);
    try {
      await axios.post("http://localhost:3000/api/sendToAnki", payload);
      alert("Successfully saved to Anki!");
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to save to Anki.";
      alert(`Error: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>
      <h1>Anki Vocab Gen</h1>
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
        <input
          type='text'
          value={word}
          onChange={(e) => setWord(e.target.value)}
          placeholder='Enter a word...'
          style={{ flex: 1, padding: "0.5rem" }}
        />
        <input
          type='text'
          value={sentence}
          onChange={(e) => setSentence(e.target.value)}
          placeholder='Optional context sentence...'
          style={{ flex: 2, padding: "0.5rem" }}
        />
        <button type='submit' disabled={loading} style={{ padding: "0.5rem 1rem" }}>
          {loading ? "Searching..." : "Define"}
        </button>
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {result && (
        <div style={{ marginTop: "2rem", border: "1px solid #ccc", padding: "1rem", borderRadius: "8px" }}>
          <h2>Review: {word}</h2>
          
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontWeight: "bold", marginBottom: "0.5rem" }}>Select Audio</label>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input 
                  type="radio" 
                  name="audioSelection" 
                  value="" 
                  checked={selectedAudioURL === ""} 
                  onChange={() => setSelectedAudioURL("")} 
                />
                No Audio
              </label>
              {result.phonetics?.map((obj, i) => {
                if (!obj.audio) return null;
                const audioLabel = obj.text || obj.audio.split('/').pop();
                return (
                  <label key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <input 
                      type="radio" 
                      name="audioSelection" 
                      value={obj.audio} 
                      checked={selectedAudioURL === obj.audio} 
                      onChange={() => setSelectedAudioURL(obj.audio)} 
                    />
                    <audio src={obj.audio} controls style={{ height: "30px" }} />
                    <span style={{ fontSize: "0.85rem", color: "#555" }}>{audioLabel}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontWeight: "bold" }}>Part of Speech</label>
            <select value={selectedMeaningIndex} onChange={handleMeaningChange} style={{ width: "100%", padding: "0.5rem" }}>
              {result.meanings.map((meaning, i) => (
                <option key={i} value={i}>{meaning.partOfSpeechDisplay || meaning.partOfSpeech}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontWeight: "bold" }}>Select Definition</label>
            <select value={selectedDefIndex} onChange={handleDefChange} style={{ width: "100%", padding: "0.5rem" }}>
              {result.meanings[selectedMeaningIndex]?.definitions.map((def, i) => (
                <option key={i} value={i}>
                  {def.definition.substring(0, 80)}{def.definition.length > 80 ? "..." : ""}
                </option>
              ))}
            </select>
          </div>

          <hr style={{ margin: "1.5rem 0" }} />

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontWeight: "bold" }}>Definition</label>
            <textarea
              name="definition"
              value={formState.definition}
              onChange={handleFormChange}
              style={{ width: "100%", padding: "0.5rem", minHeight: "80px" }}
            />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontWeight: "bold" }}>Example</label>
            <textarea
              name="example"
              value={formState.example}
              onChange={handleFormChange}
              style={{ width: "100%", padding: "0.5rem", minHeight: "60px" }}
            />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontWeight: "bold" }}>Synonyms</label>
            <textarea
              name="synonyms"
              value={formState.synonyms}
              onChange={handleFormChange}
              style={{ width: "100%", padding: "0.5rem", minHeight: "60px" }}
              placeholder="Comma-separated synonyms"
            />
          </div>

          <button disabled={saving} onClick={handleSaveToAnki} style={{ padding: "0.75rem 1.5rem", background: "#007bff", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", width: "100%" }}>
            {saving ? "Saving..." : "Save to Anki"}
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
