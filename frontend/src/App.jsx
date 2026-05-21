import { useEffect, useRef, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000/api";

function App() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState("Type a question and press Send.");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const appendMessage = (role, text) => {
    setMessages((prev) => [...prev, { role, text, id: prev.length + 1 }]);
  };

  const sendChat = async () => {
    const trimmed = message.trim();
    if (!trimmed) {
      setError("Please write a message before sending.");
      return;
    }

    setError("");
    setLoading(true);
    appendMessage("user", trimmed);
    setMessage("");

    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });

      const data = await response.json();
      if (!response.ok || data.status !== "ok") {
        setError(data.error || "Unable to get a response from the server.");
        setStatus("Server error");
      } else {
        const answer = data.message || "No answer returned.";
        appendMessage("assistant", answer);
        setStatus("Response received.");
      }
    } catch (err) {
      setError(String(err));
      setStatus("Network error");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    setError("");
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/history`);
      const data = await response.json();
      if (!response.ok || data.status !== "ok") {
        setError(data.error || "Unable to load history.");
        return;
      }
      setMessages(data.history.map((item, index) => ({
        role: item.role,
        text: item.message,
        id: index + 1,
      })));
      setStatus("History loaded.");
    } catch (err) {
      setError(String(err));
      setStatus("History error");
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendChat();
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1>Smart AI Customer Support</h1>
          <p>Ask support questions and get a fast AI reply.</p>
        </div>
        <div className="actions">
          <button type="button" onClick={fetchHistory} disabled={loading}>
            Load History
          </button>
        </div>
      </header>

      <main className="chat-panel">
        <div className="status-row">
          <span>{status}</span>
          {loading && <span className="loading">Loading...</span>}
        </div>

        <div className="message-list">
          {messages.map((msg) => (
            <div key={msg.id} className={`message ${msg.role}`}>
              <div className="message-role">{msg.role === "assistant" ? "AI" : "You"}</div>
              <div className="message-text">{msg.text}</div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        {error && <div className="error-box">{error}</div>}

        <div className="input-area">
          <textarea
            rows="3"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask about refund policy, delivery, support, returns..."
          />
          <button type="button" onClick={sendChat} disabled={loading}>
            Send
          </button>
        </div>
      </main>
    </div>
  );
}

export default App;
