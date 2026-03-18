import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Navbar from './components/Navbar';
import PixelCat from './components/PixelCat';
import KonamiOverlay from './components/KonamiOverlay';
import Home from './pages/Home';
import Projects from './pages/Projects';
import Hobbies from './pages/Hobbies';
import Resume from './pages/Resume';
import Homelab from './pages/Homelab';
import Credits from './pages/Credits';
import { useKonamiCode } from './hooks/useKonamiCode';
import { useCrtEffect } from './hooks/useCrtEffect';
import { useZeldaSecret } from './hooks/useZeldaSecret';

function AppContent() {
  const playZeldaSound = useZeldaSecret();
  const { activated, dismiss } = useKonamiCode(playZeldaSound);
  const { crtEnabled, toggleCrt } = useCrtEffect();

  return (
    <div className="min-h-screen bg-rpg-void text-rpg-text grid-bg relative">
      {crtEnabled && <div className="crt-overlay" aria-hidden="true" />}

      <Navbar onToggleCrt={toggleCrt} crtEnabled={crtEnabled} />
      <main className="max-w-5xl mx-auto px-4 py-8 mt-14">
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/hobbies" element={<Hobbies />} />
            <Route path="/resume" element={<Resume />} />
            <Route path="/homelab" element={<Homelab />} />
            <Route path="/credits" element={<Credits />} />
          </Routes>
        </AnimatePresence>
      </main>

      <PixelCat />
      <KonamiOverlay visible={activated} onDismiss={dismiss} />
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
