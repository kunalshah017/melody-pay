import { useState, useRef, useEffect } from "react";
import { getAddress, broadcastTransaction, MONAD_CONFIG } from "../core/tx-builder";
import { startListening } from "../core/listener";
import { playLoop } from "../core/broadcaster";
import { ethers } from "ethers";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Globe, Radio, Search, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

type Step = "setup" | "broadcasting" | "listening" | "verifying" | "submitting" | "done";

export function ReceivePayment() {
    const navigate = useNavigate();
    const [privateKey, setPrivateKey] = useState("");
    const [amount, setAmount] = useState("0.01");
    const [step, setStep] = useState<Step>("setup");
    const [status, setStatus] = useState("");
    const [txHash, setTxHash] = useState("");
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

    async function handleRequestPayment() {
        if (!privateKey || !amount) return;
        setStep("broadcasting");
        setStatus("Broadcasting payment request...");
        const paymentRequest = `PAY|${walletAddress}|${amount}|0`;
        const { stop } = playLoop(paymentRequest, 3000);
        stopRef.current = stop;
        setTimeout(() => { startListeningForSignedTx(); }, 6000);
    }

    async function startListeningForSignedTx() {
        stopRef.current?.();
        stopRef.current = null;
        setStep("listening");
        setStatus("Listening for signed transaction...");

        const { stop } = await startListening(async (data) => {
            if (!data.startsWith("0x")) return;
            stop();
            stopRef.current = null;
            setStep("verifying");
            setStatus("Verifying...");

            try {
                const parsedTx = ethers.Transaction.from(data);
                const actualValue = ethers.formatEther(parsedTx.value);
                setStep("submitting");
                setStatus(`Submitting ${actualValue} MON...`);
                const hash = await broadcastTransaction(data);
                setTxHash(hash);
                setStep("done");
                setStatus(`${actualValue} MON confirmed.`);
            } catch (err: any) {
                setStatus(`Error: ${err.message}`);
                setStep("setup");
            }
        });
        stopRef.current = stop;
    }

    function handleCancel() {
        stopRef.current?.();
        stopRef.current = null;
        setStep("setup");
        setStatus("");
        setTxHash("");
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
                        onClick={handleRequestPayment}
                        disabled={!privateKey || !amount}
                        className="w-full mt-6 bg-[#1C1C1E] text-white py-4 rounded-xl text-sm font-medium hover:bg-black transition-colors flex items-center justify-center gap-2"
                    >
                        <Radio size={18} /> Broadcast Request
                    </button>
                </div>
            )}

            {(step === "broadcasting" || step === "listening" || step === "verifying" || step === "submitting") && (
                <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-24 h-24 rounded-full vibrant-gradient-3 flex items-center justify-center shadow-lg mb-8 animate-pulse">
                        {step === "broadcasting" ? <Radio size={32} className="text-white" /> : 
                         step === "listening" ? <Search size={32} className="text-white" /> : <Globe size={32} className="text-white" />}
                    </div>
                    <p className="text-sm font-medium text-app-dark text-center mb-8">{status}</p>
                    {(step === "broadcasting" || step === "listening") && (
                        <button onClick={handleCancel} className="text-xs font-medium text-app-dark/60 hover:text-app-dark transition-colors">Cancel</button>
                    )}
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
                        </div>
                    )}
                    <button onClick={handleCancel} className="w-full bg-[#1C1C1E] text-white py-4 rounded-xl text-sm font-medium hover:bg-black transition-colors">Receive Another</button>
                </div>
            )}
        </motion.div>
    );
}
