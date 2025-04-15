import React from 'react';
import PageTransition from '../components/PageTransition';
import { Github, Linkedin } from 'lucide-react';
import { motion } from 'framer-motion';
import homeContent from '../../resources/home_content.json';

function Home() {
  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center mb-8 space-x-6">
          <motion.a
            href={homeContent.socials.github}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="transition-colors duration-300 hover:text-blue-500"
          >
            <Github className="w-10 h-10" />
          </motion.a>
          
          <motion.a
            href={homeContent.socials.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="transition-colors duration-300 hover:text-blue-500"
          >
            <Linkedin className="w-10 h-10" />
          </motion.a>
        </div>
        
        <h1 className="text-4xl font-bold text-center mb-6">
          {homeContent.title}
        </h1>
        
        <div className="prose dark:prose-invert mx-auto">
          <p className="text-lg text-center mb-8">
            {homeContent.subtitle}
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            {homeContent.skills.map((skill, index) => (
              <div key={index} className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h3 className="font-semibold mb-2">{skill.title}</h3>
                <p className="text-sm">{skill.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

export default Home;