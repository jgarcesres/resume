import React from 'react';
import PageTransition from '../components/PageTransition';
import { Github, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

function Projects() {
  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Projects</h1>
        
        <div className="mb-12">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold">git2jamf</h2>
              <div className="flex space-x-4">
                <a
                  href="https://github.com/yourusername/git2jamf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-600 transition-colors"
                >
                  <Github className="w-6 h-6" />
                </a>
                <a
                  href="https://git2jamf.example.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-600 transition-colors"
                >
                  <ExternalLink className="w-6 h-6" />
                </a>
              </div>
            </div>
            
            <p className="text-lg mb-4">
              A github action that synchronizes Git repositories with Jamf Pro,
              streamlining the deployment of scripts and configurations and allowing for version control missing in JAMF.
            </p>
            
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 rounded-full text-sm">
                Python
              </span>
              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 rounded-full text-sm">
                Docker
              </span>
              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 rounded-full text-sm">
                CI/CD
              </span>
              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 rounded-full text-sm">
                Automation
              </span>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold">Key Features:</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Automated synchronization between Git repositories and Jamf Pro</li>
                <li>Git triggers for real-time updates</li>
                <li>Comprehensive logging and error handling</li>
                <li>Docker containerization for easy deployment</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

export default Projects;