import { useState, useRef, useEffect } from "react";
import { getAddress, getNonce, broadcastTransaction, MONAD_CONFIG } from "../core/tx-builder";
import { startListening, startChunkedListening } from "../core/listener";
import { playPayload } from "../core/broadcaster";
import { ethers } from "ethers";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Globe, Radio, Search, CheckCircle2, Mic } from "lucide-react";
import { motion } from "framer-motion";

type Step = "setup" | "waiting-sender" | "fetching-nonce" | "broadcasting" | "listening" | "verifying" | "submitting" | "done";

export function ReceivePayment() {
    const navigate = useNavigate();
    const [privateKey, setPrivateKey] = useState("");
    const [amount, setAmount] = useState("0.01");
    const [step, setStep] = useState<Step>("setup");
    const [status, setStatus] = useState("");
    const [txHash, setTxHash] = useState("");
    const stopRef = useRef<(() => void) | null>(null);
    const cancelledRef = useRef(false);

    useEffect(() => {
        const pk = localStorage.getItem("melodypay_pk");
        if (!pk) {
            navigate("/onboarding");
        } else {
            setPrivateKey(pk);
        }
    }, [navigate]);

    const walletAddress = privateKey.length === 66 ? getAddress(privateKey) : "";

    async function handleStart() {
        if (!privateKey || !amount || !walletAddress) return;
        cancelledRef.current = false;

        try {
            setStep("waiting-sender");
            setStatus("Listening for sender's address...");

            // Phase 1: Listen for sender's address
            const { stop } = await startListening(async (data) => {
                if (cancelledRef.current) return;
                if (!data.startsWith("ADDR|")) return;

                const senderAddr = data.split("|")[1];
                if (!senderAddr || senderAddr.length !== 42) return;

                stop();
                stopRef.current = null;
                if (cancelledRef.current) return;

                // Phase 2: Fetch nonce
                setStep("fetching-nonce");
                setStatus(`Sender: ${senderAddr.slice(0, 10)}... Fetching nonce...`);

                try {
                    const senderNonce = await getNonce(senderAddr);
                    if (cancelledRef.current) return;

                    // Phase 3: Broadcast payment request 3 times with gaps
                    setStep("broadcasting");
                    const paymentRequest = `PAY|${walletAddress}|${amount}|${senderNonce}`;

                    for (let i = 1; i <= 3; i++) {
                        if (cancelledRef.current) return;
                        setStatus(`Broadcasting payment request (${i}/3)...`);
                        await playPayload(paymentRequest);
                        if (cancelledRef.current) return;
                        await new Promise((r) => setTimeout(r, i < 3 ? 1000 : 1500));
                    }

                    if (cancelledRef.current) return;

                    // Phase 4: Auto-switch to listening for signed tx
                    setStep("listening");
                    setStatus("Listening for signed transaction...");

                    const { stop: stopChunked } = await startChunkedListening(
                        async (txData) => {
                            if (cancelledRef.current) return;
                            if (!txData.startsWith("0x")) return;

                            stopChunked();
                            if (cancelledRef.current) return;

                            setStep("verifying");
                            setStatus("Verifying transaction...");

                            try {
                                const parsedTx = ethers.Transaction.from(txData);
                                const expectedTo = walletAddress.toLowerCase();
                                const actualTo = parsedTx.to?.toLowerCase();
                                const actualValue = ethers.formatEther(parsedTx.value);

                                if (actualTo !== expectedTo) {
                                    setStatus("Recipient mismatch!");
                                    setStep("setup");
                                    return;
                                }

                                if (parseFloat(actualValue) < parseFloat(amount) * 0.99) {
                                    setStatus(`Amount too low! Expected ${amount}, got ${actualValue}`);
                                    setStep("setup");
                                    return;
                                }

                                if (cancelledRef.current) return;
                                setStep("submitting");
                                setStatus(`Submitting ${actualValue} MON to Monad...`);

                                const hash = await broadcastTransaction(txData);
                                if (cancelledRef.current) return;
                                setTxHash(hash);
                                setStep("done");
                                setStatus(`${actualValue} MON confirmed!`);
                            } catch (err: any) {
                                if (cancelledRef.current) return;
                                setStatus(`Error: ${err.message}`);
                                setStep("setup");
                            }
                        },
                        (msg) => { if (!cancelledRef.current) setStatus(msg); },
                    );

                    stopRef.current = stopChunked;
                } catch (err: any) {
                    if (cancelledRef.current) return;
                    setStatus(`Failed to fetch nonce: ${err.message}`);
                    setStep("setup");
                }
            });

            stopRef.current = stop;
        } catch (err: any) {
            if (cancelledRef.current) return;
            setStatus(`Error: ${err.message}`);
            setStep("setup");
        }
    }

    function handleCancel() {
        cancelledRef.current = true;
        stopRef.current?.();
        stopRef.current = null;
        setStep("setup");
        setStatus("");
        setTxHash("");
    }

    const stepIcon = () => {
        if (step === "waiting-sender") return <Mic size={32} className="text-white" />;
        if (step === "fetching-nonce") return <Globe size={32} className="text-white" />;
        if (step === "broadcasting") return <Radio size={32} className="text-white" />;
        if (step === "listening") return <Search size={32} className="text-white" />;
        return <Globe size={32} className="text-white" />;
    };

    const stepLabel = () => {
        if (step === "waiting-sender") return "Phase 1";
        if (step === "fetching-nonce") return "Phase 2";
        if (step === "broadcasting") return "Phase 3";
        if (step === "listening") return "Phase 4";
        if (step === "verifying") return "Phase 5";
        if (step === "submitting") return "Phase 6";
        return "";
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md mx-auto p-10 bg-white border border-app-border rounded-3xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.05)]"
        >
            <div className="flex items-center mb-10">
                <Link to="/app" className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors text-app-dark">
                    <ArrowLeft size={20} />
                </Link>
                <h2 className="flex-1 text-center text-xl font-serif font-medium mr-8 text-app-dark">Receive Payment</h2>
            </div>

            {step === "setup" && (
                <div className="space-y-6 font-sans">
                    <div className="bg-green-50 border border-green-100 p-4 rounded-xl text-center">
                        <span className="font-medium text-sm text-green-800">✓ Online & Broadcasting</span>
                    </div>
                    
                    <div className="bg-[#FAFAFA] border border-app-border p-4 rounded-xl text-center">
                        <p className="text-xs font-semibold text-app-dark/50 uppercase tracking-wider mb-1">Receiving To</p>
                        <p className="text-sm font-medium text-app-dark truncate">{walletAddress}</p>
                    </div>

                    <div>
                        <label className="text-xs font-medium text-app-dark/60 mb-2 block uppercase tracking-wider">Amount</label>
                        <input
                            type="number"
                            placeholder="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full bg-[#FAFAFA] border border-app-border focus:border-app-dark outline-none px-4 py-3 rounded-xl text-xl font-bold text-app-dark transition-all"
                        />
                    </div>
                    
                    <button
                        onClick={handleStart}
                        disabled={!privateKey || !amount}
                        className="w-full mt-6 bg-[#1C1C1E] text-white py-4 rounded-xl text-sm font-medium hover:bg-black transition-colors flex items-center justify-center gap-2"
                    >
                        <Mic size={18} /> Start (Fully Automatic)
                    </button>
                </div>
            )}

            {step !== "setup" && step !== "done" && (
                <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-24 h-24 rounded-full vibrant-gradient-3 flex items-center justify-center shadow-lg mb-8 animate-pulse">
                        {stepIcon()}
                    </div>
                    <p className="text-xs font-semibold text-app-dark/50 uppercase tracking-wider mb-2">{stepLabel()}</p>
                    <p className="text-sm font-medium text-app-dark text-center mb-8">{status}</p>
                    <button onClick={handleCancel} className="text-xs font-medium text-app-dark/60 hover:text-app-dark transition-colors">Cancel</button>
                </div>
            )}

            {step === "done" && (
                <div className="flex flex-col items-center justify-center py-8">
                    <div className="bg-green-50 rounded-full p-6 mb-6">
                        <CheckCircle2 size={48} className="text-green-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-app-dark mb-2">Payment Received</h3>
                    <p className="text-sm font-medium text-app-dark/60 mb-10">{status}</p>
                    
                    {txHash && (
                        <div className="w-full bg-[#FAFAFA] border border-app-border p-4 rounded-xl mb-10 flex flex-col items-center">
                            <span className="text-[10px] font-semibold text-app-dark/50 uppercase tracking-wider mb-1">TX Hash</span>
                            <span className="text-xs font-medium text-app-dark truncate w-full text-center">{txHash}</span>
                            <a
                                href={`${MONAD_CONFIG.explorerUrl}/tx/${txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-purple-600 mt-2 hover:underline"
                            >
                                View on Monad Explorer →
                            </a>
                        </div>
                    )}
                    <button onClick={handleCancel} className="w-full bg-[#1C1C1E] text-white py-4 rounded-xl text-sm font-medium hover:bg-black transition-colors">Receive Another</button>
                </div>
            )}
        </motion.div>
    );
}
