import { useState, useRef } from "react";
import { getAddress, getNonce, broadcastTransaction, MONAD_CONFIG } from "../core/tx-builder";
import { startListening, startChunkedListening } from "../core/listener";
import { playPayload } from "../core/broadcaster";
import { chatWithAgent, extractTotal, cleanMessage } from "../core/agent";
import { ethers } from "ethers";
import { Link } from "react-router-dom";
import { ArrowLeft, Coffee, Mic, Radio } from "lucide-react";
import { motion } from "framer-motion";

interface Message {
    role: "barista" | "customer" | "system";
    content: string;
}

export function BaristaAgent() {
    const [apiKey] = useState(() => import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem("gemini_key") || "");
    const [privateKey, setPrivateKey] = useState(() => localStorage.getItem("melodypay_pk") || "");
    const [started, setStarted] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [status, setStatus] = useState("");
    const [txHash, setTxHash] = useState("");
    const stopRef = useRef<(() => void) | null>(null);
    const cancelledRef = useRef(false);
    const conversationRef = useRef<{ role: string; content: string }[]>([]);

    const walletAddress = privateKey.length === 66 ? getAddress(privateKey) : "";

    function addMessage(msg: Message) {
        setMessages((prev) => [...prev, msg]);
        conversationRef.current.push({ role: msg.role, content: msg.content });
    }

    async function handleStart() {
        if (!walletAddress) return;
        cancelledRef.current = false;
        setStarted(true);
        setMessages([]);
        conversationRef.current = [];
        addMessage({ role: "system", content: "Barista is listening for customer..." });
        listenForCustomer();
    }

    async function listenForCustomer() {
        setStatus("🎤 Listening...");

        const { stop } = await startListening(async (data) => {
            if (cancelledRef.current) return;
            if (!data.startsWith("MSG|") && !data.startsWith("ADDR|")) return;

            // Handle address announcement for payment
            if (data.startsWith("ADDR|")) {
                const senderAddr = data.split("|")[1];
                if (!senderAddr || senderAddr.length !== 42) return;
                stop();
                stopRef.current = null;

                addMessage({ role: "system", content: `Payment: got sender ${senderAddr.slice(0, 10)}...` });
                setStatus("Fetching nonce...");

                // Fetch nonce and send PAY request
                const lastTotal = getLastTotal();
                const nonce = await getNonce(senderAddr);
                const payMsg = `PAY|${walletAddress}|${lastTotal}|${nonce}`;

                setStatus("📡 Broadcasting payment request...");
                for (let i = 0; i < 3; i++) {
                    if (cancelledRef.current) return;
                    await playPayload(payMsg);
                    await new Promise((r) => setTimeout(r, 1000));
                }

                // Listen for signed tx
                setStatus("🎤 Waiting for signed tx...");
                const { stop: stopChunked } = await startChunkedListening(
                    async (txData) => {
                        if (cancelledRef.current) return;
                        if (!txData.startsWith("0x")) return;
                        stopChunked();

                        try {
                            const parsedTx = ethers.Transaction.from(txData);
                            const actualValue = ethers.formatEther(parsedTx.value);
                            setStatus("Submitting to Monad...");
                            const hash = await broadcastTransaction(txData);
                            setTxHash(hash);
                            addMessage({ role: "system", content: `✅ Payment confirmed! ${actualValue} MON (tx: ${hash.slice(0, 16)}...)` });

                            // Barista says thanks
                            const response = await chatWithAgent(apiKey, "barista", conversationRef.current, "Payment confirmed!");
                            const clean = cleanMessage(response);
                            addMessage({ role: "barista", content: clean });
                            setStatus("📡 Responding...");
                            await playPayload(`MSG|${clean}`);
                            setStatus("Done! ✅");
                        } catch (err: any) {
                            addMessage({ role: "system", content: `❌ ${err.message}` });
                            setStatus("Error");
                        }
                    },
                    () => { },
                );
                stopRef.current = stopChunked;
                return;
            }

            // Handle conversation message
            const customerMsg = data.slice(4); // Remove "MSG|"
            stop();
            stopRef.current = null;

            addMessage({ role: "customer", content: customerMsg });
            setStatus("🤖 Thinking...");

            // Get barista response from Gemini
            const response = await chatWithAgent(apiKey, "barista", conversationRef.current, customerMsg);
            const clean = cleanMessage(response);
            const total = extractTotal(response);

            addMessage({ role: "barista", content: clean + (total ? ` (${total} MON)` : "") });

            // Wait for customer to be ready to listen
            setStatus("⏳ Waiting for customer...");
            await new Promise((r) => setTimeout(r, 2000));
            if (cancelledRef.current) return;

            // Broadcast response
            setStatus("📡 Speaking...");
            await playPayload(`MSG|${clean}`);
            await new Promise((r) => setTimeout(r, 1000));

            if (cancelledRef.current) return;

            // Go back to listening
            if (!cancelledRef.current) listenForCustomer();
        });

        stopRef.current = stop;
    }

    function getLastTotal(): string {
        for (let i = conversationRef.current.length - 1; i >= 0; i--) {
            const total = extractTotal(conversationRef.current[i].content);
            if (total) return total;
        }
        return "1";
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
                    <Coffee className="inline mr-2" size={20} /> Barista Agent
                </h2>
            </div>

            {!started ? (
                <div className="space-y-4 font-sans">
                    <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl text-center">
                        <span className="font-medium text-sm text-amber-800">☕ MelodyPay Café — Agent Mode</span>
                    </div>
                    <div className="bg-[#FAFAFA] border border-app-border p-3 rounded-xl text-center">
                        <p className="text-xs text-app-dark/50 uppercase tracking-wider mb-1">Wallet</p>
                        <p className="text-xs text-app-dark truncate">{walletAddress || "Set up in onboarding"}</p>
                    </div>
                    <button
                        onClick={handleStart}
                        disabled={!walletAddress}
                        className="w-full bg-[#1C1C1E] text-white py-4 rounded-xl text-sm font-medium hover:bg-black transition-colors flex items-center justify-center gap-2"
                    >
                        <Mic size={18} /> Start Barista Agent
                    </button>
                </div>
            ) : (
                <div className="space-y-3 font-sans">
                    <div className="flex items-center gap-2 text-xs text-app-dark/60 mb-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        {status}
                    </div>

                    <div className="max-h-80 overflow-y-auto space-y-2 p-2">
                        {messages.map((msg, i) => (
                            <div key={i} className={`text-xs p-2 rounded-lg ${msg.role === "barista" ? "bg-amber-50 text-amber-900 ml-4" :
                                msg.role === "customer" ? "bg-blue-50 text-blue-900 mr-4" :
                                    "bg-gray-50 text-gray-600 text-center italic"
                                }`}>
                                {msg.role !== "system" && <span className="font-bold uppercase text-[10px] block mb-0.5">{msg.role}</span>}
                                {msg.content}
                            </div>
                        ))}
                    </div>

                    {txHash && (
                        <a href={`${MONAD_CONFIG.explorerUrl}/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
                            className="block text-xs text-center text-purple-600 hover:underline">
                            View tx on Monad Explorer →
                        </a>
                    )}

                    <button onClick={handleCancel} className="w-full border border-app-border text-app-dark py-3 rounded-xl text-xs font-medium hover:bg-gray-50 transition-colors">
                        Stop Agent
                    </button>
                </div>
            )}
        </motion.div>
    );
}
