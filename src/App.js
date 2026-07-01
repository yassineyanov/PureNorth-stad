import "@/App.css";
import { WebsiteProvider } from "@/context/WebsiteContext";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/context/AuthContext";
import Home from "@/pages/Home";
import Admin from "@/pages/Admin";
import FAQ from "@/pages/FAQ";
import Kundavtal from "@/pages/Kundavtal";
import NojdKundgaranti from "@/pages/NojdKundgaranti";
import Integritetspolicy from "@/pages/Integritetspolicy";
import Varderingar from "@/pages/Varderingar";
import Malsattning from "@/pages/Malsattning";
import OmOss from "@/pages/OmOss";

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <WebsiteProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/om-oss" element={<OmOss />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/kundavtal" element={<Kundavtal />} />
            <Route path="/nojd-kundgaranti" element={<NojdKundgaranti />} />
            <Route path="/integritetspolicy" element={<Integritetspolicy />} />
            <Route path="/varderingar" element={<Varderingar />} />
            <Route path="/malsattning" element={<Malsattning />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/:tab" element={<Admin />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-center" richColors />
        </WebsiteProvider>
      </AuthProvider>
    </div>
  );
}

export default App;
