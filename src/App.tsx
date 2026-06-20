import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Home } from "./pages/Home";
import { Signer } from "./pages/Signer";
import { Relay } from "./pages/Relay";
import { AirdropBroadcast } from "./pages/AirdropBroadcast";
import { AirdropClaim } from "./pages/AirdropClaim";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/sign" element={<Signer />} />
        <Route path="/relay" element={<Relay />} />
        <Route path="/airdrop/broadcast" element={<AirdropBroadcast />} />
        <Route path="/airdrop/claim" element={<AirdropClaim />} />
      </Routes>
    </BrowserRouter>
  );
}
