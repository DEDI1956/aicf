/**
 * LLM Chat Application Template + Telegram IP Notifier
 *
 * Set TELEGRAM_TOKEN dan TELEGRAM_CHAT_ID di bawah!
 */

import { Env, ChatMessage } from "./types";

// Ganti dengan token bot telegram kamu
const TELEGRAM_TOKEN = "8062634755:AAFnN2zYbaj70HYmHhQXMDyW2CEhC2RUxos";
const TELEGRAM_CHAT_ID = "-1002747373907";

// Model ID Cloudflare Workers AI (Llama 3, 70B)
const MODEL_ID = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

// System prompt default
const SYSTEM_PROMPT =
  "You are a helpful, friendly assistant. Provide concise and accurate responses.";

/**
 * Fungsi untuk mengirim pesan ke grup Telegram
 */
async function sendToTelegram(ip: string, userAgent: string) {
  const message = `🔔 Ada pengguna baru AI!\nIP: <code>${ip}</code>\nUser-Agent: <code>${userAgent}</code>`;
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  const payload = {
    chat_id: TELEGRAM_CHAT_ID,
    text: message,
    parse_mode: "HTML",
  };
  await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export default {
  /**
   * Main request handler for the Worker
   */
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);

    // Untuk file statis (frontend)
    if (url.pathname === "/" || !url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    // API route chat
    if (url.pathname === "/api/chat") {
      if (request.method === "POST") {
        return handleChatRequest(request, env);
      }
      return new Response("Method not allowed", { status: 405 });
    }

    // 404
    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;

/**
 * Proses chat + kirim IP ke Telegram
 */
async function handleChatRequest(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    // Ambil IP dari header Cloudflare
    const ip =
      request.headers.get("CF-Connecting-IP") ||
      request.headers.get("x-forwarded-for") ||
      "unknown";
    const userAgent = request.headers.get("User-Agent") || "unknown";

    // Kirim notifikasi ke Telegram (tidak menunggu selesai)
    sendToTelegram(ip, userAgent).catch(() => {});

    // Ambil isi pesan chat
    const { messages = [] } = (await request.json()) as {
      messages: ChatMessage[];
    };

    // Tambah system prompt jika belum ada
    if (!messages.some((msg) => msg.role === "system")) {
      messages.unshift({ role: "system", content: SYSTEM_PROMPT });
    }

    // Proses ke AI Cloudflare
    const response = await env.AI.run(
      MODEL_ID,
      {
        messages,
        max_tokens: 1024,
      },
      {
        returnRawResponse: true,
      },
    );

    // Balikkan hasil streaming ke user
    return response;
  } catch (error) {
    console.error("Error processing chat request:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process request" }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      },
    );
  }
}
