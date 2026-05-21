const apiBase = "http://127.0.0.1:5000/api";

const statusEl = document.getElementById("status");
const historyBtn = document.getElementById("load-history");
const sendBtn = document.getElementById("send-button");
const messageInput = document.getElementById("message-input");
const messagesEl = document.getElementById("messages");
const errorEl = document.getElementById("error-box");

const renderMessages = (messages) => {
  messagesEl.innerHTML = messages
    .map(
      (item) => `
      <div class="message ${item.role}">
        <div class="message-role">${item.role === "assistant" ? "AI" : "You"}</div>
        <div class="message-text">${item.message}</div>
      </div>`
    )
    .join("");
  messagesEl.scrollTop = messagesEl.scrollHeight;
};

const setStatus = (text) => {
  statusEl.textContent = text;
};

const setError = (text) => {
  errorEl.textContent = text;
  errorEl.style.display = text ? "block" : "none";
};

const fetchHistory = async () => {
  setError("");
  setStatus("Loading history...");
  try {
    const res = await fetch(`${apiBase}/history`);
    const data = await res.json();
    if (!res.ok || data.status !== "ok") {
      throw new Error(data.error || "Could not load history.");
    }
    renderMessages(data.history);
    setStatus("History loaded.");
  } catch (err) {
    setError(err.message);
    setStatus("Unable to load history.");
  }
};

const sendMessage = async () => {
  const message = messageInput.value.trim();
  if (!message) {
    setError("Write a message before sending.");
    return;
  }

  setError("");
  setStatus("Sending message...");
  sendBtn.disabled = true;
  messageInput.disabled = true;

  try {
    const res = await fetch(`${apiBase}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });

    const data = await res.json();
    if (!res.ok || data.status !== "ok") {
      throw new Error(data.error || "AI request failed.");
    }
    const history = data.history || [];
    renderMessages(history);
    setStatus("AI response received.");
    messageInput.value = "";
  } catch (err) {
    setError(err.message);
    setStatus("Error sending message.");
  } finally {
    sendBtn.disabled = false;
    messageInput.disabled = false;
  }
};

sendBtn.addEventListener("click", sendMessage);
historyBtn.addEventListener("click", fetchHistory);
messageInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
});

setStatus("Type a question and click Send.");
setError("");
