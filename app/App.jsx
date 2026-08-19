import { Navigate, Route, Routes } from "react-router-dom";
import { Shell } from "./chrome.jsx";
import Board from "./pages/Board.jsx";
import Wizard from "./pages/Wizard.jsx";
import Pack from "./pages/Pack.jsx";
import Directory from "./pages/Directory.jsx";
import Heat from "./pages/Heat.jsx";
import Legal from "./pages/Legal.jsx";

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Board />} />
        <Route path="/wizard" element={<Wizard />} />
        <Route path="/pack" element={<Pack />} />
        <Route path="/directory" element={<Directory />} />
        <Route path="/heat" element={<Heat />} />
        <Route path="/legal" element={<Legal />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}
