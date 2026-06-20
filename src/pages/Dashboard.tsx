import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Send, Download, LogOut, Wallet, Activity, Coffee, User } from "lucide-react";
import { ethers } from "ethers";

export function Dashboard() {
    const navigate = useNavigate();
    const [walletAddress, setWalletAddress] = useState("");

    useEffect(() => {
        const pk = localStorage.getItem("melodypay_pk");
        if (!pk) {
            navigate("/onboarding");
            return;
        }
        try {
            const wallet = new ethers.Wallet(pk);
            setWalletAddress(wallet.address);
        } catch (err) {
            localStorage.removeItem("melodypay_pk");
            navigate("/onboarding");
        }
    }, [navigate]);

    function handleLogout() {
        localStorage.removeItem("melodypay_pk");
        navigate("/onboarding");
    }

    if (!walletAddress) return null;

    const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-2xl mx-auto px-4"
        >
            {/* Header / Wallet Info */}
            <div className="flex items-center justify-between mb-12">
                <div>
                    <h1 className="text-3xl font-serif font-medium text-app-dark mb-2">Welcome back.</h1>
                    <div className="flex items-center gap-2 text-app-dark/60 font-sans">
                        <Wallet size={16} />
                        <span className="text-sm font-medium tracking-wide">{truncateAddress(walletAddress)}</span>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="p-3 bg-white border border-app-border rounded-xl text-app-dark/60 hover:text-red-500 hover:border-red-200 transition-colors shadow-sm"
                    title="Disconnect Wallet"
                >
                    <LogOut size={20} />
                </button>
            </div>

            {/* Network Status */}
            <div className="bg-white border border-app-border rounded-2xl p-6 mb-8 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#F7F7F5] rounded-full flex items-center justify-center">
                        <Activity size={24} className="text-green-500" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-app-dark text-sm">Monad Devnet</h3>
                        <p className="text-xs text-app-dark/50 font-medium mt-1">Connected • 0 ms latency</p>
                    </div>
                </div>
                <div className="flex gap-1 h-4">
                    {[1, 2, 3].map(bar => (
                        <motion.div
                            key={bar}
                            animate={{ height: ["40%", "100%", "60%", "90%", "40%"] }}
                            transition={{ repeat: Infinity, duration: 0.8 + Math.random(), ease: "easeInOut" }}
                            className="w-[3px] bg-green-500 rounded-sm"
                        />
                    ))}
                </div>
            </div>

            {/* Core Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Link to="/send" className="group relative bg-white border border-app-border p-8 rounded-3xl overflow-hidden hover:border-app-dark hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-100 to-transparent opacity-50 rounded-bl-[100px] -z-10 transition-transform group-hover:scale-110"></div>
                    <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                        <Send size={28} />
                    </div>
                    <h2 className="text-xl font-serif font-bold text-app-dark mb-2">Send Payment</h2>
                    <p className="text-sm font-sans text-app-dark/60 leading-relaxed">Broadcast an encrypted transaction securely via high-frequency audio.</p>
                </Link>

                <Link to="/receive" className="group relative bg-white border border-app-border p-8 rounded-3xl overflow-hidden hover:border-app-dark hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-green-100 to-transparent opacity-50 rounded-bl-[100px] -z-10 transition-transform group-hover:scale-110"></div>
                    <div className="w-14 h-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                        <Download size={28} />
                    </div>
                    <h2 className="text-xl font-serif font-bold text-app-dark mb-2">Receive Payment</h2>
                    <p className="text-sm font-sans text-app-dark/60 leading-relaxed">Listen for incoming audio payments and submit them to the Monad network.</p>
                </Link>

                <Link to="/agent/barista" className="group relative bg-white border border-app-border p-8 rounded-3xl overflow-hidden hover:border-app-dark hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-100 to-transparent opacity-50 rounded-bl-[100px] -z-10 transition-transform group-hover:scale-110"></div>
                    <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                        <Coffee size={28} />
                    </div>
                    <h2 className="text-xl font-serif font-bold text-app-dark mb-2">Barista Agent</h2>
                    <p className="text-sm font-sans text-app-dark/60 leading-relaxed">AI barista that takes orders and receives payments via sound.</p>
                </Link>

                <Link to="/agent/customer" className="group relative bg-white border border-app-border p-8 rounded-3xl overflow-hidden hover:border-app-dark hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-purple-100 to-transparent opacity-50 rounded-bl-[100px] -z-10 transition-transform group-hover:scale-110"></div>
                    <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                        <User size={28} />
                    </div>
                    <h2 className="text-xl font-serif font-bold text-app-dark mb-2">Customer Agent</h2>
                    <p className="text-sm font-sans text-app-dark/60 leading-relaxed">AI customer that orders coffee and pays automatically via sound.</p>
                </Link>
            </div>
        </motion.div>
    );
}
