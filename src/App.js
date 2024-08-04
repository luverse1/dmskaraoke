import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Redirect from './components/Redirect';
import Admin from './components/Admin';
import './styles/global.css'

function App() {
  return (
    <Router>
        <Routes>
            <Route path="/" element={<Redirect />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/:slug" element={<Redirect />} />
        </Routes>
    </Router>
  );
}

export default App;
