import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Moon, Sun, Terminal, Code, Coffee, FileText, Menu, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useNav } from '../context/NavContext';
import { motion, AnimatePresence } from 'framer-motion';

function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { isScrolled, setIsScrolled } = useNav();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  // Add scroll event listener to detect when page is scrolled
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    
    // Clean up event listener on component unmount
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [setIsScrolled]);

  return (
    <nav 
      className={`${
        isScrolled ? 'fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm' : 'bg-white dark:bg-gray-800 relative'
      } shadow-lg transition-all duration-300`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <NavLink to="/" className="flex items-center space-x-2 relative z-50">
            <Terminal className="w-6 h-6" />
            <span className="font-bold text-xl">Juan Garces</span>
          </NavLink>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <NavLink 
              to="/projects" 
              className={({ isActive }) => 
                `flex items-center space-x-1 hover:text-blue-500 transition-colors ${
                  isActive ? 'text-blue-500' : ''
                }`
              }
            >
              <Code className="w-4 h-4" />
              <span>Projects</span>
            </NavLink>
            
            <NavLink 
              to="/hobbies"
              className={({ isActive }) => 
                `flex items-center space-x-1 hover:text-blue-500 transition-colors ${
                  isActive ? 'text-blue-500' : ''
                }`
              }
            >
              <Coffee className="w-4 h-4" />
              <span>Hobbies</span>
            </NavLink>
            
            <NavLink 
              to="/resume"
              className={({ isActive }) => 
                `flex items-center space-x-1 hover:text-blue-500 transition-colors ${
                  isActive ? 'text-blue-500' : ''
                }`
              }
            >
              <FileText className="w-4 h-4" />
              <span>Resume</span>
            </NavLink>
            
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center relative z-50">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors mr-2"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={toggleMenu}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black md:hidden z-40"
              onClick={() => setIsMenuOpen(false)}
            />
            
            {/* Menu */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed top-0 right-0 w-64 h-full bg-white dark:bg-gray-800 shadow-lg md:hidden z-50"
            >
              <div className="flex flex-col p-4 space-y-4 pt-20">
                <NavLink 
                  to="/projects" 
                  className={({ isActive }) => 
                    `flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                      isActive ? 'text-blue-500 bg-gray-100 dark:bg-gray-700' : ''
                    }`
                  }
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Code className="w-5 h-5" />
                  <span>Projects</span>
                </NavLink>
                
                <NavLink 
                  to="/hobbies"
                  className={({ isActive }) => 
                    `flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                      isActive ? 'text-blue-500 bg-gray-100 dark:bg-gray-700' : ''
                    }`
                  }
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Coffee className="w-5 h-5" />
                  <span>Hobbies</span>
                </NavLink>
                
                <NavLink 
                  to="/resume"
                  className={({ isActive }) => 
                    `flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                      isActive ? 'text-blue-500 bg-gray-100 dark:bg-gray-700' : ''
                    }`
                  }
                  onClick={() => setIsMenuOpen(false)}
                >
                  <FileText className="w-5 h-5" />
                  <span>Resume</span>
                </NavLink>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
}

export default Navbar;