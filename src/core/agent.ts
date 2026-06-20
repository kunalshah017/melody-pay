import { GoogleGenAI } from "@google/genai";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

const BARISTA_SYSTEM = `You are a barista agent at "MelodyPay Café". You serve coffee via sound-based payments on Monad blockchain.

Menu:
- Espresso: 0.5 MON
- Cappuccino: 1 MON
- Latte: 1.2 MON
- Mocha: 1.5 MON
- Cold Brew: 1 MON

Rules:
- Keep responses SHORT (1-2 sentences max).
- When customer orders, confirm the item and state the total clearly like "That'll be X MON."
- When you state the total, end your message with exactly: [TOTAL:X] where X is the amount (e.g., [TOTAL:1.5])
- After payment is confirmed, say something brief and friendly.
- You are casual and friendly.`;

const CUSTOMER_SYSTEM = `You are a customer agent at a café. You want to order coffee and pay via sound.

Rules:
- Keep responses SHORT (1-2 sentences max).
- Start by greeting and ordering something from the menu.
- When you hear the total, confirm you'd like to pay.
- When you confirm payment, end your message with exactly: [PAY]
- Be casual and natural.`;

let genAI: GoogleGenAI | null = null;

function getGenAI(apiKey?: string): GoogleGenAI {
  const key = apiKey || GEMINI_API_KEY;
  if (!key)
    throw new Error("Gemini API key not set. Add VITE_GEMINI_API_KEY to .env");
  if (!genAI) {
    genAI = new GoogleGenAI({ apiKey: key });
  }
  return genAI;
}

export async function chatWithAgent(
  apiKey: string | undefined,
  role: "barista" | "customer",
  conversationHistory: { role: string; content: string }[],
  latestMessage?: string,
): Promise<string> {
  const ai = getGenAI(apiKey);

  const systemPrompt = role === "barista" ? BARISTA_SYSTEM : CUSTOMER_SYSTEM;

  // Build prompt with conversation history
  let prompt = systemPrompt + "\n\nConversation so far:\n";
  for (const msg of conversationHistory) {
    prompt += `${msg.role}: ${msg.content}\n`;
  }
  if (latestMessage) {
    prompt += `${role === "barista" ? "Customer" : "Barista"}: ${latestMessage}\n`;
  }
  prompt += `\n${role === "barista" ? "Barista" : "Customer"} (you):`;

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash-lite",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  return (response.text ?? "").trim();
}

export function extractTotal(message: string): string | null {
  const match = message.match(/\[TOTAL:([\d.]+)\]/);
  return match ? match[1] : null;
}

export function hasPaySignal(message: string): boolean {
  return message.includes("[PAY]");
}

export function cleanMessage(message: string): string {
  return message
    .replace(/\[TOTAL:[\d.]+\]/, "")
    .replace(/\[PAY\]/, "")
    .trim();
}
