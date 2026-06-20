import { useState, useRef, useEffect } from "react";
import { signTransaction, getAddress } from "../core/tx-builder";
import { startListening } from "../core/listener";
import { playPayload } from "../core/broadcaster";
import { Mic, ArrowLeft, Send, CheckCircle2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

type Step = "setup" | "listening" | "received" | "signing" | "broadcasting" | "done";

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

    useEffect(() => {
        const pk = localStorage.getItem("melodypay_pk");
        if (!pk) {
            navigate("/onboarding");
        } else {
            setPrivateKey(pk);
        }
    }, [navigate]);

    const walletAddress = privateKey.length === 66 ? getAddress(privateKey) : "";

    async function handleStartListening() {
        if (!privateKey || privateKey.length !== 66) return;
        setStep("listening");
        setStatus("Listening for payment request via sound...");

        const { stop } = await startListening((data) => {
            if (!data.startsWith("PAY|")) return;
            const parts = data.split("|");
            if (parts.length !== 4) return;
            setPaymentRequest({ to: parts[1], amount: parts[2], nonce: parseInt(parts[3]) });
            setStep("received");
            setStatus(`Payment request: ${parts[2]} MON`);
            stop();
            stopRef.current = null;
        });
        stopRef.current = stop;
    }

    async function handleConfirmAndSign() {
        if (!paymentRequest) return;
        try {
            setStep("signing");
            setStatus("Signing transaction...");
            const signedTx = await signTransaction({ to: paymentRequest.to, value: paymentRequest.amount, nonce: paymentRequest.nonce }, privateKey);
            setStep("broadcasting");
            setStatus(`Broadcasting signed tx...`);
            await playPayload(signedTx);
            setStep("done");
            setStatus("Signed transaction broadcasted via sound!");
        } catch (err: any) {
            setStatus(`Error: ${err.message}`);
            setStep("received");
        }
    }

    function handleCancel() {
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
                        onClick={handleStartListening}
                        disabled={!privateKey}
                        className="w-full mt-6 bg-[#1C1C1E] text-white py-4 rounded-xl text-sm font-medium hover:bg-black transition-colors flex items-center justify-center gap-2"
                    >
                        <Mic size={18} /> Listen for Request
                    </button>
                </div>
            )}

            {(step === "listening" || step === "broadcasting" || step === "signing") && (
                <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-24 h-24 rounded-full vibrant-gradient-1 flex items-center justify-center shadow-lg mb-8 animate-pulse">
                        {step === "listening" ? <Mic size={32} className="text-white" /> : <Send size={32} className="text-white" />}
                    </div>
                    <p className="text-sm font-medium text-app-dark text-center mb-8">{status}</p>
                    {step === "listening" && <button onClick={handleCancel} className="text-xs font-medium text-app-dark/60 hover:text-app-dark transition-colors">Cancel</button>}
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
                    <div className="flex gap-4">
                        <button onClick={handleCancel} className="flex-1 bg-white border border-app-border text-app-dark py-4 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">Reject</button>
                        <button onClick={handleConfirmAndSign} className="flex-[2] bg-[#1C1C1E] text-white py-4 rounded-xl text-sm font-medium hover:bg-black transition-colors">Confirm & Sign</button>
                    </div>
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
