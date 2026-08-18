import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Header, Disclaimer } from "./chrome.jsx";
import Home from "./pages/Home.jsx";
import Browse from "./pages/Browse.jsx";
import Caregiver from "./pages/Caregiver.jsx";
import Checkout from "./pages/Checkout.jsx";
import Track from "./pages/Track.jsx";
import Line from "./pages/Line.jsx";
import Intel from "./pages/Intel.jsx";
import How from "./pages/How.jsx";

export default function App() {
  const { pathname } = useLocation();
  const intel = pathname.startsWith("/intel");

  return (
    <div className={intel ? "shell shell-intel" : "shell"}>
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/caregiver/:id" element={<Caregiver />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/track/:id" element={<Track />} />
          <Route path="/line" element={<Line />} />
          <Route path="/intel" element={<Intel />} />
          <Route path="/how" element={<How />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Disclaimer />
    </div>
  );
}
