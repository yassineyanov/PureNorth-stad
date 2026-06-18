import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/context/AuthContext";
import Home from "@/pages/Home";
import Admin from "@/pages/Admin";
import FAQ from "@/pages/FAQ";
import Kundavtal from "@/pages/Kundavtal";
import NojdKundgaranti from "@/pages/NojdKundgaranti";
import Integritetspolicy from "@/pages/Integritetspolicy";

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/kundavtal" element={<Kundavtal />} />
            <Route path="/nojd-kundgaranti" element={<NojdKundgaranti />} />
            <Route path="/integritetspolicy" element={<Integritetspolicy />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </div>
  );
}

export default App;
