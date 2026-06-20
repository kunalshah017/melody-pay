import { useState, useRef, useEffect } from "react";
import { signTransaction, getAddress } from "../core/tx-builder";
import { startListening } from "../core/listener";
import { playPayload, playChunkedPayload } from "../core/broadcaster";
import { Mic, ArrowLeft, Send, CheckCircle2, Radio } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

type Step = "setup" | "announcing" | "listening" | "received" | "signing" | "broadcasting" | "done";

interface PaymentRequest {
    to: string;
    amount: string;
    nonce: number;
}

export function SendPayment() {
    const navigate = useNavigate();
    const [privateKey, setPrivateKey] = useState("");
    const [step, setStep] = useState<Step>("setup");
    const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
    const [status, setStatus] = useState("");
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
        if (!privateKey || !walletAddress) return;
        cancelledRef.current = false;

        // Phase 1: Broadcast address 3 times with gaps
        setStep("announcing");
        const addrMsg = `ADDR|${walletAddress}`;

        for (let i = 1; i <= 3; i++) {
            if (cancelledRef.current) return;
            setStatus(`Broadcasting your address (${i}/3)...`);
            await playPayload(addrMsg);
            if (cancelledRef.current) return;
            await new Promise((r) => setTimeout(r, i < 3 ? 1000 : 1500));
        }

        if (cancelledRef.current) return;

        // Phase 2: Listen for payment request
        setStep("listening");
        setStatus("Listening for payment request...");

        const { stop } = await startListening(async (data) => {
            if (cancelledRef.current) return;
            if (!data.startsWith("PAY|")) return;

            const parts = data.split("|");
            if (parts.length !== 4) return;

            const request: PaymentRequest = {
                to: parts[1],
                amount: parts[2],
                nonce: parseInt(parts[3]),
            };

            stop();
            stopRef.current = null;
            if (cancelledRef.current) return;

            setPaymentRequest(request);
            setStep("received");
            setStatus(`${request.amount} MON → ${request.to.slice(0, 10)}...`);

            // Auto-sign
            try {
                if (cancelledRef.current) return;
                setStep("signing");
                setStatus("Signing transaction...");

                const signedTx = await signTransaction(
                    { to: request.to, value: request.amount, nonce: request.nonce },
                    privateKey
                );

                if (cancelledRef.current) return;
                setStatus("Waiting for receiver...");
                await new Promise((r) => setTimeout(r, 2000));

                if (cancelledRef.current) return;
                setStep("broadcasting");
                const numChunks = Math.ceil(signedTx.length / 134);
                setStatus(`Broadcasting signed tx (${numChunks} chunks)...`);

                await playChunkedPayload(signedTx);

                if (cancelledRef.current) return;
                setStep("done");
                setStatus("Signed transaction sent via sound!");
            } catch (err: any) {
                if (cancelledRef.current) return;
                setStatus(`Error: ${err.message}`);
                setStep("setup");
            }
        });

        stopRef.current = stop;
    }

    function handleCancel() {
        cancelledRef.current = true;
        stopRef.current?.();
        stopRef.current = null;
        setStep("setup");
        setPaymentRequest(null);
        setStatus("");
    }

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md mx-auto p-10 bg-white border border-app-border rounded-3xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.05)]"
        >
            <div className="flex items-center mb-10">
                <Link to="/app" className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors text-app-dark">
                    <ArrowLeft size={20} />
                </Link>
                <h2 className="flex-1 text-center text-xl font-serif font-medium mr-8 text-app-dark">Send Payment</h2>
            </div>

            {step === "setup" && (
                <div className="space-y-6 font-sans">
                    <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl text-center">
                        <span className="font-medium text-sm text-orange-800">⚠️ Offline & Air-gapped Mode</span>
                    </div>
                    
                    <div className="bg-[#FAFAFA] border border-app-border p-4 rounded-xl text-center">
                        <p className="text-xs font-semibold text-app-dark/50 uppercase tracking-wider mb-1">Sending From</p>
                        <p className="text-sm font-medium text-app-dark truncate">{walletAddress}</p>
                    </div>
                    
                    <button
                        onClick={handleStart}
                        disabled={!privateKey}
                        className="w-full mt-6 bg-[#1C1C1E] text-white py-4 rounded-xl text-sm font-medium hover:bg-black transition-colors flex items-center justify-center gap-2"
                    >
                        <Radio size={18} /> Start (Fully Automatic)
                    </button>
                </div>
            )}

            {step !== "setup" && step !== "done" && step !== "received" && (
                <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-24 h-24 rounded-full vibrant-gradient-1 flex items-center justify-center shadow-lg mb-8 animate-pulse">
                        {(step === "announcing") && <Radio size={32} className="text-white" />}
                        {(step === "listening") && <Mic size={32} className="text-white" />}
                        {(step === "signing") && <Send size={32} className="text-white" />}
                        {(step === "broadcasting") && <Send size={32} className="text-white" />}
                    </div>
                    <p className="text-xs font-semibold text-app-dark/50 uppercase tracking-wider mb-2">
                        {step === "announcing" && "Phase 1"}
                        {step === "listening" && "Phase 2"}
                        {step === "signing" && "Phase 3"}
                        {step === "broadcasting" && "Phase 4"}
                    </p>
                    <p className="text-sm font-medium text-app-dark text-center mb-8">{status}</p>
                    <button onClick={handleCancel} className="text-xs font-medium text-app-dark/60 hover:text-app-dark transition-colors">Cancel</button>
                </div>
            )}

            {step === "received" && paymentRequest && (
                <div className="space-y-6 font-sans">
                    <div className="bg-[#FAFAFA] border border-app-border p-5 rounded-xl">
                        <div className="flex justify-between items-center mb-4 border-b border-app-border pb-3">
                            <span className="text-xs font-medium text-app-dark/60">Amount</span>
                            <span className="text-xl font-bold text-app-dark">{paymentRequest.amount} MON</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-medium text-app-dark/60">To</span>
                            <span className="text-xs font-medium text-app-dark truncate w-32">{paymentRequest.to}</span>
                        </div>
                    </div>
                    <p className="text-xs text-center text-app-dark/50">Auto-signing in progress...</p>
                </div>
            )}

            {step === "done" && (
                <div className="flex flex-col items-center justify-center py-8">
                    <div className="bg-green-50 rounded-full p-6 mb-6">
                        <CheckCircle2 size={48} className="text-green-500" />
                    </div>
                    <p className="text-sm font-medium text-app-dark text-center mb-10">{status}</p>
                    <button onClick={handleCancel} className="w-full bg-[#1C1C1E] text-white py-4 rounded-xl text-sm font-medium hover:bg-black transition-colors">Send Another</button>
                </div>
            )}
        </motion.div>
    );
}
