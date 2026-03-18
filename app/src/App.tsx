import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Navbar from './components/Navbar';
import PixelCat from './components/PixelCat';
import Home from './pages/Home';
import Projects from './pages/Projects';
import Hobbies from './pages/Hobbies';
import Resume from './pages/Resume';
import Homelab from './pages/Homelab';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-rpg-void text-rpg-text grid-bg relative">
        <div className="crt-overlay" aria-hidden="true" />

        <Navbar />
        <main className="max-w-5xl mx-auto px-4 py-8 mt-14">
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/hobbies" element={<Hobbies />} />
              <Route path="/resume" element={<Resume />} />
              <Route path="/homelab" element={<Homelab />} />
            </Routes>
          </AnimatePresence>
        </main>

        <PixelCat />
      </div>
    </Router>
  );
}

export default App;
