import { useState, useRef } from "react";
import { signTransaction, getAddress } from "../core/tx-builder";
import { startListening } from "../core/listener";
import { playPayload, playChunkedPayload } from "../core/broadcaster";
import { chatWithAgent, hasPaySignal, cleanMessage } from "../core/agent";
import { Link } from "react-router-dom";
import { ArrowLeft, User, Mic, Radio } from "lucide-react";
import { motion } from "framer-motion";

interface Message {
    role: "barista" | "customer" | "system";
    content: string;
}

export function CustomerAgent() {
    const [apiKey, setApiKey] = useState(() => localStorage.getItem("gemini_key") || "");
    const [privateKey, setPrivateKey] = useState(() => localStorage.getItem("melodypay_pk") || "");
    const [started, setStarted] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [status, setStatus] = useState("");
    const stopRef = useRef<(() => void) | null>(null);
    const cancelledRef = useRef(false);
    const conversationRef = useRef<{ role: string; content: string }[]>([]);

    const walletAddress = privateKey.length === 66 ? getAddress(privateKey) : "";

    function addMessage(msg: Message) {
        setMessages((prev) => [...prev, msg]);
        conversationRef.current.push({ role: msg.role, content: msg.content });
    }

    async function handleStart() {
        if (!apiKey || !walletAddress) return;
        localStorage.setItem("gemini_key", apiKey);
        cancelledRef.current = false;
        setStarted(true);
        setMessages([]);
        conversationRef.current = [];

        // Customer initiates — get first message from LLM
        setStatus("🤖 Thinking...");
        const greeting = await chatWithAgent(apiKey, "customer", [], undefined);
        const clean = cleanMessage(greeting);
        addMessage({ role: "customer", content: clean });

        // Broadcast greeting
        setStatus("📡 Speaking...");
        await playPayload(`MSG|${clean}`);
        await new Promise((r) => setTimeout(r, 1500));

        if (cancelledRef.current) return;

        // Start listening for barista response
        listenForBarista();
    }

    async function listenForBarista() {
        setStatus("🎤 Listening for barista...");

        const { stop } = await startListening(async (data) => {
            if (cancelledRef.current) return;

            // Handle PAY request from barista (payment flow)
            if (data.startsWith("PAY|")) {
                const parts = data.split("|");
                if (parts.length !== 4) return;
                stop();
                stopRef.current = null;

                const to = parts[1];
                const amount = parts[2];
                const nonce = parseInt(parts[3]);

                addMessage({ role: "system", content: `💰 Paying ${amount} MON...` });
                setStatus("✍️ Signing...");

                try {
                    const signedTx = await signTransaction(
                        { to, value: amount, nonce },
                        privateKey
                    );

                    setStatus("⏳ Waiting...");
                    await new Promise((r) => setTimeout(r, 2000));

                    if (cancelledRef.current) return;
                    setStatus("📡 Broadcasting payment...");
                    await playChunkedPayload(signedTx);

                    addMessage({ role: "system", content: "✅ Payment sent via sound!" });
                    setStatus("🎤 Listening for confirmation...");

                    // Listen for final barista message
                    const { stop: stopFinal } = await startListening(async (finalData) => {
                        if (cancelledRef.current) return;
                        if (!finalData.startsWith("MSG|")) return;
                        stopFinal();
                        const baristaMsg = finalData.slice(4);
                        addMessage({ role: "barista", content: baristaMsg });
                        setStatus("Done! ☕");
                    });
                    stopRef.current = stopFinal;
                } catch (err: any) {
                    addMessage({ role: "system", content: `❌ ${err.message}` });
                    setStatus("Error");
                }
                return;
            }

            // Handle TOTAL message
            if (data.startsWith("TOTAL|")) {
                // Barista stated total, customer should initiate payment
                stop();
                stopRef.current = null;
                if (cancelledRef.current) return;

                // Customer confirms payment via LLM
                setStatus("🤖 Deciding...");
                const response = await chatWithAgent(apiKey, "customer", conversationRef.current, "The barista told me the total. I should pay now.");
                const clean = cleanMessage(response);
                addMessage({ role: "customer", content: clean });

                // Broadcast confirm + address
                setStatus("📡 Confirming & sending address...");
                await playPayload(`MSG|${clean}`);
                await new Promise((r) => setTimeout(r, 1000));

                // Broadcast address for payment
                const addrMsg = `ADDR|${walletAddress}`;
                for (let i = 0; i < 3; i++) {
                    if (cancelledRef.current) return;
                    await playPayload(addrMsg);
                    await new Promise((r) => setTimeout(r, 1000));
                }

                if (cancelledRef.current) return;

                // Now listen for PAY request from barista
                setStatus("🎤 Waiting for payment request...");
                listenForBarista();
                return;
            }

            // Handle conversation message
            if (!data.startsWith("MSG|")) return;
            const baristaMsg = data.slice(4);
            stop();
            stopRef.current = null;

            addMessage({ role: "barista", content: baristaMsg });

            if (cancelledRef.current) return;

            // Get customer response from LLM
            setStatus("🤖 Thinking...");
            const response = await chatWithAgent(apiKey, "customer", conversationRef.current, baristaMsg);
            const clean = cleanMessage(response);
            const wantsToPay = hasPaySignal(response);

            addMessage({ role: "customer", content: clean });

            // Broadcast response
            setStatus("📡 Speaking...");
            await playPayload(`MSG|${clean}`);
            await new Promise((r) => setTimeout(r, 1500));

            if (cancelledRef.current) return;

            if (wantsToPay) {
                // Customer wants to pay — broadcast address
                setStatus("📡 Sending wallet address...");
                const addrMsg = `ADDR|${walletAddress}`;
                for (let i = 0; i < 3; i++) {
                    if (cancelledRef.current) return;
                    await playPayload(addrMsg);
                    await new Promise((r) => setTimeout(r, 1000));
                }
                if (cancelledRef.current) return;
            }

            // Continue listening
            listenForBarista();
        });

        stopRef.current = stop;
    }

    function handleCancel() {
        cancelledRef.current = true;
        stopRef.current?.();
        stopRef.current = null;
        setStarted(false);
        setStatus("");
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md mx-auto p-6 bg-white border border-app-border rounded-3xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.05)]"
        >
            <div className="flex items-center mb-6">
                <Link to="/app" className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors text-app-dark">
                    <ArrowLeft size={20} />
                </Link>
                <h2 className="flex-1 text-center text-xl font-serif font-medium mr-8 text-app-dark">
                    <User className="inline mr-2" size={20} /> Customer Agent
                </h2>
            </div>

            {!started ? (
                <div className="space-y-4 font-sans">
                    <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl text-center">
                        <span className="font-medium text-sm text-blue-800">🤖 AI Customer — Orders & Pays via Sound</span>
                    </div>
                    <input
                        type="password"
                        placeholder="Gemini API Key"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="w-full bg-[#FAFAFA] border border-app-border px-4 py-3 rounded-xl text-sm text-app-dark outline-none"
                    />
                    <div className="bg-[#FAFAFA] border border-app-border p-3 rounded-xl text-center">
                        <p className="text-xs text-app-dark/50 uppercase tracking-wider mb-1">Wallet</p>
                        <p className="text-xs text-app-dark truncate">{walletAddress || "Set up in onboarding"}</p>
                    </div>
                    <button
                        onClick={handleStart}
                        disabled={!apiKey || !walletAddress}
                        className="w-full bg-[#1C1C1E] text-white py-4 rounded-xl text-sm font-medium hover:bg-black transition-colors flex items-center justify-center gap-2"
                    >
                        <Radio size={18} /> Start Customer Agent
                    </button>
                </div>
            ) : (
                <div className="space-y-3 font-sans">
                    <div className="flex items-center gap-2 text-xs text-app-dark/60 mb-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        {status}
                    </div>

                    <div className="max-h-80 overflow-y-auto space-y-2 p-2">
                        {messages.map((msg, i) => (
                            <div key={i} className={`text-xs p-2 rounded-lg ${msg.role === "customer" ? "bg-blue-50 text-blue-900 ml-4" :
                                    msg.role === "barista" ? "bg-amber-50 text-amber-900 mr-4" :
                                        "bg-gray-50 text-gray-600 text-center italic"
                                }`}>
                                {msg.role !== "system" && <span className="font-bold uppercase text-[10px] block mb-0.5">{msg.role}</span>}
                                {msg.content}
                            </div>
                        ))}
                    </div>

                    <button onClick={handleCancel} className="w-full border border-app-border text-app-dark py-3 rounded-xl text-xs font-medium hover:bg-gray-50 transition-colors">
                        Stop Agent
                    </button>
                </div>
            )}
        </motion.div>
    );
}
