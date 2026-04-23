import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import PixelCat from './components/PixelCat';
import KonamiOverlay from './components/KonamiOverlay';
import Home from './pages/Home';
import Projects from './pages/Projects';
import Hobbies from './pages/Hobbies';
import Resume from './pages/Resume';
import Homelab from './pages/Homelab';
import Credits from './pages/Credits';
import SkillTreePage from './pages/SkillTreePage';
import CrtShaderOverlay from './components/CrtShaderOverlay';
import { useKonamiCode } from './hooks/useKonamiCode';
import { useCrtEffect } from './hooks/useCrtEffect';
import { useZeldaSecret } from './hooks/useZeldaSecret';
import { useTheme } from './context/ThemeContext';

function ThemeFlicker() {
  const { theme } = useTheme();
  const [flashKey, setFlashKey] = useState(0);
  const [prev, setPrev] = useState(theme);

  useEffect(() => {
    if (prev !== theme) {
      setFlashKey((k) => k + 1);
      setPrev(theme);
    }
  }, [theme, prev]);

  if (flashKey === 0) return null;
  return <div key={flashKey} className="theme-flicker" aria-hidden />;
}

function AppContent() {
  const playZeldaSound = useZeldaSecret();
  const { activated, dismiss } = useKonamiCode(playZeldaSound);
  const { crtEnabled, toggleCrt } = useCrtEffect();
  const { isRpg } = useTheme();

  const rootClass = isRpg
    ? 'min-h-screen bg-rpg-void text-rpg-text grid-bg relative'
    : 'min-h-screen bg-pro-bg text-pro-ink grid-bg relative';

  return (
    <div className={rootClass}>
      {isRpg && <CrtShaderOverlay enabled={crtEnabled} />}
      <ThemeFlicker />

      <Navbar onToggleCrt={toggleCrt} crtEnabled={crtEnabled} />
      <main className="max-w-5xl mx-auto px-4 py-8 mt-14">
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/hobbies" element={<Hobbies />} />
            <Route path="/resume" element={<Resume />} />
            <Route path="/homelab" element={<Homelab />} />
            <Route path="/skill-tree" element={<SkillTreePage />} />
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
