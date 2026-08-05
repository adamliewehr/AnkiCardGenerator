import { useState, useEffect } from "react";
import axios from "axios";

function App() {
  const [word, setWord] = useState(""); // controlled input
  const [sentence, setSentence] = useState(""); // optional context sentence
  const [domain, setDomain] = useState(""); // optional subject/domain
  const [result, setResult] = useState(null); // the json response;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [isAutoSelecting, setIsAutoSelecting] = useState(false);

  // Deck state
  const [decks, setDecks] = useState([]);
  const [selectedDeck, setSelectedDeck] = useState("Vocabulary");
  const [newDeckName, setNewDeckName] = useState("");

  // Settings state
  const [showSettings, setShowSettings] = useState(false);
  const [llmProvider, setLlmProvider] = useState("gemini");
  const [apiKey, setApiKey] = useState("");
  const [ollamaUrl, setOllamaUrl] = useState("http://localhost:11434");
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      if (window.electronAPI) {
        const p = await window.electronAPI.getStoreValue("llmProvider");
        const k = await window.electronAPI.getStoreValue("apiKey");
        const o = await window.electronAPI.getStoreValue("ollamaUrl");
        if (p) setLlmProvider(p);
        if (k) setApiKey(k);
        if (o) setOllamaUrl(o);
      } else {
        setLlmProvider(localStorage.getItem("llmProvider") || "gemini");
        setApiKey(localStorage.getItem("apiKey") || "");
        setOllamaUrl(localStorage.getItem("ollamaUrl") || "http://localhost:11434");
      }
      setSettingsLoaded(true);
    };
    loadSettings();
  }, []);

  useEffect(() => {
    const fetchDecks = async () => {
      try {
        const res = await axios.get("http://localhost:3000/api/decks");
        if (res.data && res.data.decks) {
          setDecks(res.data.decks);
          if (!res.data.decks.includes("Vocabulary")) {
            setSelectedDeck(res.data.decks[0] || "");
          }
        }
      } catch (error) {
        console.error("Failed to load decks:", error);
      }
    };
    fetchDecks();
  }, []);

  useEffect(() => {
    if (!settingsLoaded) return;
    
    if (window.electronAPI) {
      window.electronAPI.setStoreValue("llmProvider", llmProvider);
      window.electronAPI.setStoreValue("apiKey", apiKey);
      window.electronAPI.setStoreValue("ollamaUrl", ollamaUrl);
    } else {
      localStorage.setItem("llmProvider", llmProvider);
      localStorage.setItem("apiKey", apiKey);
      localStorage.setItem("ollamaUrl", ollamaUrl);
    }
  }, [llmProvider, apiKey, ollamaUrl, settingsLoaded]);

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

  async function fetchDefinition(forceLLM = false) {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await axios.post("http://localhost:3000/api/define", {
        word,
        sentence,
        domain,
        forceLLM
      }, {
        headers: {
          "x-llm-provider": llmProvider,
          "x-api-key": apiKey,
          "x-ollama-url": ollamaUrl
        }
      });
      const data = response.data;
      setResult(data);
      
      setSelectedMeaningIndex(0);
      setSelectedDefIndex(0);
      updateFormState(data, 0, 0);

      const firstAudioObj = data.phonetics?.find((p) => p.audio);
      setSelectedAudioURL(firstAudioObj ? firstAudioObj.audio : "");
    } catch (err) {
      setError(err.response?.data?.error || "Word not found");
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchDefinition(false);
  };

  const handleForceLLM = () => {
    fetchDefinition(true);
  };

  const handleAutoSelect = async () => {
    setIsAutoSelecting(true);
    try {
      const response = await axios.post("http://localhost:3000/api/select-best-definition", {
        word,
        sentence,
        meanings: result.meanings
      }, {
        headers: {
          "x-llm-provider": llmProvider,
          "x-api-key": apiKey,
          "x-ollama-url": ollamaUrl
        }
      });
      const { meaningIndex, definitionIndex } = response.data;
      
      if (meaningIndex === -1 || definitionIndex === -1) {
        alert("The AI determined that none of the dictionary definitions fit the context sentence perfectly. Consider generating a custom definition with AI.");
        return;
      }
      
      const mIdx = Math.min(Math.max(0, meaningIndex), result.meanings.length - 1);
      const dIdx = Math.min(Math.max(0, definitionIndex), result.meanings[mIdx].definitions.length - 1);

      setSelectedMeaningIndex(mIdx);
      setSelectedDefIndex(dIdx);
      updateFormState(result, mIdx, dIdx);
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      alert("Failed to auto-select definition: " + msg);
    } finally {
      setIsAutoSelecting(false);
    }
  };

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

  const handleCreateDeck = async () => {
    if (!newDeckName) return;
    try {
      await axios.post("http://localhost:3000/api/decks", { deckName: newDeckName });
      setDecks([...decks, newDeckName]);
      setSelectedDeck(newDeckName);
      setNewDeckName("");
      alert(`Deck "${newDeckName}" created successfully!`);
    } catch (error) {
      alert("Failed to create deck: " + (error.response?.data?.error || error.message));
    }
  };

  const handleSaveToAnki = async () => {
    const payload = {
      word,
      partOfSpeech: result.meanings[selectedMeaningIndex].partOfSpeech,
      definition: formState.definition,
      example: formState.example,
      synonyms: formState.synonyms,
      audioURL: selectedAudioURL || null,
      deckName: selectedDeck
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Anki Vocab Gen</h1>
        <button 
          onClick={() => setShowSettings(!showSettings)} 
          style={{ padding: "0.5rem", cursor: "pointer", background: "none", border: "1px solid #ccc", borderRadius: "4px" }}
        >
          ⚙️ Settings
        </button>
      </div>

      {showSettings && (
        <div style={{ marginBottom: "2rem", padding: "1rem", border: "1px solid #ddd", borderRadius: "8px", backgroundColor: "#f9f9f9" }}>
          <h3 style={{ marginTop: 0 }}>Settings</h3>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontWeight: "bold", marginBottom: "0.5rem" }}>LLM Provider</label>
            <select 
              value={llmProvider} 
              onChange={(e) => setLlmProvider(e.target.value)}
              style={{ width: "100%", padding: "0.5rem" }}
            >
              <option value="gemini">Google Gemini</option>
              <option value="groq">Groq</option>
              <option value="ollama">Ollama (Local)</option>
            </select>
          </div>
          
          {llmProvider !== "ollama" && (
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontWeight: "bold", marginBottom: "0.5rem" }}>API Key</label>
              <input 
                type="password" 
                value={apiKey} 
                onChange={(e) => setApiKey(e.target.value)} 
                placeholder={`Enter your ${llmProvider} API key...`}
                style={{ width: "100%", padding: "0.5rem" }}
              />
            </div>
          )}

          {llmProvider === "ollama" && (
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontWeight: "bold", marginBottom: "0.5rem" }}>Ollama URL</label>
              <input 
                type="text" 
                value={ollamaUrl} 
                onChange={(e) => setOllamaUrl(e.target.value)} 
                placeholder="http://localhost:11434"
                style={{ width: "100%", padding: "0.5rem" }}
              />
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <input
          type='text'
          value={word}
          onChange={(e) => setWord(e.target.value)}
          placeholder='Enter a word...'
          style={{ flex: 1, minWidth: "150px", padding: "0.5rem" }}
        />
        <input
          type='text'
          value={sentence}
          onChange={(e) => setSentence(e.target.value)}
          placeholder='Optional context sentence...'
          style={{ flex: 2, minWidth: "200px", padding: "0.5rem" }}
        />
        <input
          type='text'
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder='Domain (e.g. Biology)'
          style={{ flex: 1, minWidth: "150px", padding: "0.5rem" }}
        />
        <button type='submit' disabled={loading} style={{ padding: "0.5rem 1rem", minWidth: "100px" }}>
          {loading ? "Searching..." : "Define"}
        </button>
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {result && (
        <div style={{ marginTop: "2rem", border: "1px solid #ccc", padding: "1rem", borderRadius: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ margin: 0 }}>Review: {word}</h2>
            {sentence && result.meanings && result.meanings.length > 0 && !result.isAIGenerated && (
              <button 
                onClick={handleAutoSelect} 
                disabled={isAutoSelecting}
                style={{ padding: "0.5rem 1rem", background: "#f0f0f0", border: "1px solid #ccc", borderRadius: "4px", cursor: isAutoSelecting ? "not-allowed" : "pointer" }}
              >
                {isAutoSelecting ? "✨ Auto-selecting..." : "✨ Auto-Select Best Definition"}
              </button>
            )}
          </div>
          
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
          
          {result && !result.isAIGenerated && (
             <div style={{ marginBottom: "1rem" }}>
                <button 
                  onClick={handleForceLLM}
                  disabled={loading}
                  style={{ width: "100%", padding: "0.5rem", background: "#f8d7da", color: "#721c24", border: "1px solid #f5c6cb", borderRadius: "4px", cursor: "pointer" }}
                >
                  {loading ? "Generating..." : "None of these fit? Generate with AI ✨"}
                </button>
             </div>
          )}

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

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontWeight: "bold", marginBottom: "0.5rem", color: "#333" }}>Anki Deck</label>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "stretch", height: "40px" }}>
              <select 
                value={selectedDeck} 
                onChange={(e) => setSelectedDeck(e.target.value)}
                style={{ width: "160px", flexShrink: 0, padding: "0 0.5rem", border: "1px solid #ccc", borderRadius: "6px", boxSizing: "border-box", fontSize: "0.95rem", height: "100%", outline: "none", cursor: "pointer" }}
              >
                {decks.map(deck => <option key={deck} value={deck}>{deck}</option>)}
              </select>
              <input 
                type="text" 
                placeholder="New deck name..." 
                value={newDeckName} 
                onChange={(e) => setNewDeckName(e.target.value)}
                style={{ flex: 1, padding: "0 0.5rem", border: "1px solid #ccc", borderRadius: "6px", boxSizing: "border-box", fontSize: "0.95rem", height: "100%", outline: "none" }}
              />
              <button 
                onClick={handleCreateDeck}
                disabled={!newDeckName}
                style={{ 
                  padding: "0 1rem", 
                  cursor: newDeckName ? "pointer" : "not-allowed", 
                  minWidth: "100px", 
                  border: "none", 
                  borderRadius: "6px", 
                  background: newDeckName ? "#28a745" : "#a5d8b2", 
                  color: "white",
                  fontWeight: "bold",
                  boxSizing: "border-box",
                  height: "100%",
                  transition: "background 0.2s"
                }}
              >
                Create
              </button>
            </div>
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
