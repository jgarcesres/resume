import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Navbar from './components/Navbar';
import PixelCat from './components/PixelCat';
import Home from './pages/Home';
import Projects from './pages/Projects';
import Hobbies from './pages/Hobbies';
import Resume from './pages/Resume';
import PageTransition from './components/PageTransition';
import PixelPanel from './components/ui/PixelPanel';

function HomelabPlaceholder() {
  return (
    <PageTransition>
      <PixelPanel glow="cyan" className="text-center py-12">
        <span className="text-2xl mb-4 block">🏰</span>
        <h1 className="font-pixel text-lg text-rpg-text-bright mb-3">The Server Room</h1>
        <p className="font-pixel text-[9px] text-rpg-text-dim">Coming soon — homelab topology, status page, and more.</p>
      </PixelPanel>
    </PageTransition>
  );
}

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
              <Route path="/homelab" element={<HomelabPlaceholder />} />
            </Routes>
          </AnimatePresence>
        </main>

        <PixelCat />
      </div>
    </Router>
  );
}

export default App;
