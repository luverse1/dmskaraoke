import React from 'react';
import { HashRouter as Router, Route, Routes } from 'react-router-dom';
import Redirect from './components/Redirect';
import Admin from './components/Admin';
import './styles/global.css'

function App() {
  return (
    <Router>
        <Routes>
            <Route exact path="/" element={<Redirect />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/:slug" element={<Redirect />} />
            <Route path="*" element={<Redirect />} />
        </Routes>
    </Router>
  );
}

export default App;