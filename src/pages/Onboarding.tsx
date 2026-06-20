import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, ArrowRight, Key, ArrowLeft } from "lucide-react";
import { ethers } from "ethers";

export function Onboarding() {
    const [privateKey, setPrivateKey] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    function handleConnect(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        
        let pk = privateKey.trim();
        if (!pk.startsWith("0x")) {
            pk = "0x" + pk;
        }

        if (pk.length !== 66) {
            setError("Invalid private key. Must be 64 hex characters.");
            return;
        }

        try {
            // Verify it's a valid private key by instantiating a wallet
            new ethers.Wallet(pk);
            localStorage.setItem("melodypay_pk", pk);
            navigate("/app");
        } catch (err) {
            setError("Invalid private key format.");
        }
    }

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md mx-auto px-4"
        >
            <div className="mb-8">
                <Link to="/" className="inline-flex items-center text-app-dark/60 hover:text-app-dark transition-colors mb-6 text-sm font-medium">
                    <ArrowLeft size={16} className="mr-2" /> Back to Home
                </Link>
                <div className="w-16 h-16 bg-white border border-app-border rounded-2xl shadow-sm flex items-center justify-center mb-6">
                    <ShieldCheck size={32} className="text-app-dark" />
                </div>
                <h1 className="text-3xl font-serif font-medium text-app-dark mb-3">Import Wallet</h1>
                <p className="text-app-dark/60 font-sans text-sm leading-relaxed">
                    MelodyPay operates completely offline. Your private key is stored securely in your browser's local storage and is never sent to our servers.
                </p>
            </div>

            <form onSubmit={handleConnect} className="space-y-6">
                <div>
                    <label className="text-xs font-semibold text-app-dark/50 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Key size={14} /> Private Key
                    </label>
                    <input
                        type="password"
                        placeholder="0x..."
                        value={privateKey}
                        onChange={(e) => setPrivateKey(e.target.value)}
                        className="w-full bg-white border border-app-border focus:border-app-dark outline-none px-4 py-4 rounded-xl text-sm text-app-dark transition-all shadow-sm"
                    />
                    {error && <p className="text-red-500 text-xs mt-2 font-medium">{error}</p>}
                </div>

                <button 
                    type="submit"
                    disabled={!privateKey}
                    className="w-full bg-[#1C1C1E] text-white py-4 rounded-xl text-sm font-medium hover:bg-black transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                    Secure Login <ArrowRight size={16} />
                </button>
            </form>

            <div className="mt-8 bg-amber-50 border border-amber-100 p-4 rounded-xl">
                <p className="text-xs text-amber-800 leading-relaxed font-medium">
                    ⚠️ <strong>Warning:</strong> This is a demo application on the Monad testnet. We recommend using a testnet-specific wallet. Never use your mainnet private keys.
                </p>
            </div>
        </motion.div>
    );
}
