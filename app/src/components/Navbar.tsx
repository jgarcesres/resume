import React from 'react';
import { NavLink } from 'react-router-dom';
import { Moon, Sun, Terminal, Code, Coffee, FileText } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

function Navbar() {
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <NavLink to="/" className="flex items-center space-x-2">
            <Terminal className="w-6 h-6" />
            <span className="font-bold text-xl">Juan Garces</span>
          </NavLink>
          
          <div className="flex items-center space-x-8">
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
        </div>
      </div>
    </nav>
  );
}

export default Navbar;