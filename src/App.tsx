import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Home } from "./pages/Home";
import { SendPayment } from "./pages/SendPayment";
import { ReceivePayment } from "./pages/ReceivePayment";
// Airdrop pages — commented out for now
// import { AirdropBroadcast } from "./pages/AirdropBroadcast";
// import { AirdropClaim } from "./pages/AirdropClaim";

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/send" element={<SendPayment />} />
                <Route path="/receive" element={<ReceivePayment />} />
                {/* <Route path="/airdrop/broadcast" element={<AirdropBroadcast />} /> */}
                {/* <Route path="/airdrop/claim" element={<AirdropClaim />} /> */}
            </Routes>
        </BrowserRouter>
    );
}
