import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Projects from './pages/Projects';
import Hobbies from './pages/Hobbies';
import Resume from './pages/Resume';
import { ThemeProvider } from './context/ThemeContext';
import { NavProvider, useNav } from './context/NavContext';

// Wrapper component to handle content padding based on navbar state
const MainContent = ({ children }: { children: React.ReactNode }) => {
  const { isScrolled } = useNav();
  
  return (
    <main className={`container mx-auto px-4 py-8 transition-all duration-300 ${isScrolled ? 'mt-16' : ''}`}>
      {children}
    </main>
  );
};

function App() {
  return (
    <ThemeProvider>
      <NavProvider>
        <Router>
          <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
            <Navbar />
            <MainContent>
              <AnimatePresence mode="wait">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/projects" element={<Projects />} />
                  <Route path="/hobbies" element={<Hobbies />} />
                  <Route path="/resume" element={<Resume />} />
                </Routes>
              </AnimatePresence>
            </MainContent>
          </div>
        </Router>
      </NavProvider>
    </ThemeProvider>
  );
}

export default App;