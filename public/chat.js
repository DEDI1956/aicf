/**
 * AI DIANA Chat App Frontend
 * Mendukung: bubble modern, tombol copy, streaming, auto-scroll, dll.
 */

// DOM elements
const chatMessages = document.getElementById("chat-messages");
const userInput = document.getElementById("user-input");
const sendButton = document.getElementById("send-button");
const typingIndicator = document.getElementById("typing-indicator");

// Chat state
let chatHistory = [
  {
    role: "ai",
    content:
      "Halo, saya <b>AI DIANA</b>! Siap membantu Anda. Silakan tanya apa saja.",
  },
];
let isProcessing = false;

// Auto-resize textarea as user types
userInput.addEventListener("input", function () {
  this.style.height = "auto";
  this.style.height = this.scrollHeight + "px";
});

// Send message on Enter (tanpa Shift)
userInput.addEventListener("keydown", function (e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Send button click handler
sendButton.addEventListener("click", sendMessage);

/**
 * Menambah pesan ke chat (bubble user/ai)
 */
function addMessageToChat(role, content) {
  const messageEl = document.createElement("div");
  messageEl.className = `bubble ${role}`;
  messageEl.innerHTML = content;
  if (role === "ai") {
    // Tambah tombol copy
    messageEl.innerHTML +=
      '<button class="copy-btn" title="Copy"><svg width="18" height="18" viewBox="0 0 20 20"><rect x="5" y="7" width="9" height="10" rx="2" fill="#FFD600" stroke="#333" stroke-width="1.3"/><rect x="7" y="3" width="9" height="10" rx="2" fill="none" stroke="#FFD600" stroke-width="1.5"/></svg></button>';
  }
  chatMessages.appendChild(messageEl);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * Kirim pesan ke API dan proses streaming balasan AI
 */
async function sendMessage() {
  const message = userInput.value.trim();

  // Jangan kirim pesan kosong/lagi proses
  if (message === "" || isProcessing) return;

  // Disable input saat memproses
  isProcessing = true;
  userInput.disabled = true;
  sendButton.disabled = true;

  // Tambahkan pesan user ke chat
  addMessageToChat("user", message);

  // Kosongkan input
  userInput.value = "";
  userInput.style.height = "auto";

  // Tampilkan typing indicator
  typingIndicator.classList.add("visible");

  // Tambahkan ke history
  chatHistory.push({ role: "user", content: message });

  try {
    // Buat elemen bubble AI kosong untuk streaming
    const aiMessageEl = document.createElement("div");
    aiMessageEl.className = "bubble ai";
    aiMessageEl.innerHTML =
      '<span id="ai-stream"></span>' +
      '<button class="copy-btn" title="Copy"><svg width="18" height="18" viewBox="0 0 20 20"><rect x="5" y="7" width="9" height="10" rx="2" fill="#FFD600" stroke="#333" stroke-width="1.3"/><rect x="7" y="3" width="9" height="10" rx="2" fill="none" stroke="#FFD600" stroke-width="1.5"/></svg></button>';
    chatMessages.appendChild(aiMessageEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Kirim request ke API
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: chatHistory.map((x) =>
          x.role === "ai" ? { role: "assistant", content: stripHTML(x.content) } : { ...x }
        ),
      }),
    });

    if (!response.ok) throw new Error("Gagal mendapatkan balasan dari AI");

    // Streaming respon
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let responseText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });

      // Proses streaming JSON per baris
      const lines = chunk.split("\n");
      for (const line of lines) {
        try {
          const jsonData = JSON.parse(line);
          if (jsonData.response) {
            responseText += jsonData.response;
            aiMessageEl.querySelector("#ai-stream").innerHTML = escapeHTML(responseText);
            chatMessages.scrollTop = chatMessages.scrollHeight;
          }
        } catch (e) {
          // Lewati error parsing (misal baris kosong)
        }
      }
    }

    // Update bubble jadi final (hapus id #ai-stream)
    aiMessageEl.innerHTML =
      escapeHTML(responseText) +
      '<button class="copy-btn" title="Copy"><svg width="18" height="18" viewBox="0 0 20 20"><rect x="5" y="7" width="9" height="10" rx="2" fill="#FFD600" stroke="#333" stroke-width="1.3"/><rect x="7" y="3" width="9" height="10" rx="2" fill="none" stroke="#FFD600" stroke-width="1.5"/></svg></button>';

    // Simpan ke history
    chatHistory.push({ role: "ai", content: escapeHTML(responseText) });
  } catch (error) {
    addMessageToChat("ai", "Maaf, terjadi kesalahan saat memproses permintaan Anda.");
  } finally {
    typingIndicator.classList.remove("visible");
    isProcessing = false;
    userInput.disabled = false;
    sendButton.disabled = false;
    userInput.focus();
  }
}

/**
 * Escape text supaya HTML tidak dieksekusi (aman)
 */
function escapeHTML(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Hapus tag HTML (untuk history)
 */
function stripHTML(html) {
  var tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

/**
 * Fitur tombol copy di setiap bubble AI
 * (Sudah otomatis aktif lewat observer di index.html, jadi tidak perlu diulang di sini)
 */

// Selesai!
