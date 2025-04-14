import React from 'react';
import PageTransition from '../components/PageTransition';
import { Terminal } from 'lucide-react';
import { motion } from 'framer-motion';

function Home() {
  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center mb-8">
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatType: "reverse",
            }}
          >
            <Terminal className="w-16 h-16 text-blue-500" />
          </motion.div>
        </div>
        
        <h1 className="text-4xl font-bold text-center mb-6">
          Hi, I'm Juan Garces
        </h1>
        
        <div className="prose dark:prose-invert mx-auto">
          <p className="text-lg text-center mb-8">
            Site Reliability Engineer with expertise in DevOps, automation, and infrastructure.
            I specialize in building robust, scalable systems and streamlining development workflows.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h3 className="font-semibold mb-2">DevOps</h3>
              <p className="text-sm">Implementing CI/CD pipelines and infrastructure as code solutions.</p>
            </div>
            
            <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h3 className="font-semibold mb-2">Automation</h3>
              <p className="text-sm">Creating efficient workflows and automated processes for development teams.</p>
            </div>
            
            <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h3 className="font-semibold mb-2">Infrastructure</h3>
              <p className="text-sm">Managing and optimizing cloud and on-premise infrastructure solutions.</p>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

export default Home;