import React from 'react';
import PageTransition from '../components/PageTransition';
import { Gamepad2, ChefHat, Server } from 'lucide-react';
import { motion } from 'framer-motion';
import hobbiesContent from '../../resources/hobbies_content.json';

function Hobbies() {
  // Function to convert Tailwind color class to CSS color value
  const getColorFromClass = (colorClass) => {
    // Map Tailwind color classes to CSS color values
    const colorMap = {
      'text-purple-500': '#A855F7', // Purple-500 in Tailwind
      'text-red-500': '#EF4444',    // Red-500 in Tailwind
      'text-green-500': '#10B981',  // Green-500 in Tailwind
      // Add more color mappings as needed
    };
    
    return colorMap[colorClass] || 'white'; // Default to white if not found
  };

  // This function returns the appropriate icon component based on the icon name in the JSON
  const getIconComponent = (iconName, iconColor) => {
    const color = getColorFromClass(iconColor);
    
    switch (iconName) {
      case 'Gamepad2':
        return <Gamepad2 className="w-12 h-12" color={color} />;
      case 'ChefHat':
        return <ChefHat className="w-12 h-12" color={color} />;
      case 'Server':
        return <Server className="w-12 h-12" color={color} />;
      default:
        return null;
    }
  };

  // Animation variants for different icons
  const animationVariants = {
    Gamepad2: {
      animate: { rotate: [0, -10, 10, -10, 0] },
      transition: { duration: 2, repeat: Infinity, repeatType: "reverse" }
    },
    ChefHat: {
      animate: { y: [0, -10, 0] },
      transition: { duration: 1.5, repeat: Infinity, repeatType: "reverse" }
    },
    Server: {
      animate: { scale: [1, 1.1, 1] },
      transition: { duration: 1.5, repeat: Infinity, repeatType: "reverse" }
    }
  };

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Hobbies & Interests</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {hobbiesContent.hobbies.map((hobby, index) => (
            <div key={index} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
              <motion.div
                className="flex justify-center mb-4"
                animate={animationVariants[hobby.icon]?.animate || {}}
                transition={animationVariants[hobby.icon]?.transition || {}}
              >
                {getIconComponent(hobby.icon, hobby.iconColor)}
              </motion.div>
              <h2 className="text-xl font-semibold mb-3 text-center">{hobby.title}</h2>
              <p className="text-sm text-center">
                {hobby.description}
              </p>
            </div>
          ))}
        </div>
        
        <div className="mt-12 bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Current Projects</h2>
          <ul className="space-y-4">
            {hobbiesContent.projects.map((project, index) => (
              <li key={index}>
                <h3 className="font-semibold">{project.title}</h3>
                <p className="text-sm">
                  {project.description}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </PageTransition>
  );
}

export default Hobbies;