import React from "react";
import { HashRouter as Router, Route, Routes } from "react-router-dom";
import AllSongs from "./components/AllSongs";
import SongDetails from "./components/SongDetails";
import Admin from "./components/Admin";
import "./styles/global.css";

function App() {
  return (
    <Router>
      <Routes>
        <Route exact path="/" element={<Admin />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/songs" element={<AllSongs />} />
        <Route path="/songs/:id" element={<SongDetails />} />
        <Route path="*" element={<Admin />} />
      </Routes>
    </Router>
  );
}

export default App;
