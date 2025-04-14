import React from 'react';
import PageTransition from '../components/PageTransition';
import { Github, ExternalLink } from 'lucide-react';
import projectsContent from '../../resources/projects_content.json';

function Projects() {
  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Projects</h1>
        
        <div className="space-y-12">
          {projectsContent.projects.map((project, index) => (
            <div key={index} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold">{project.title}</h2>
                <div className="flex space-x-4">
                  {project.githubUrl && (
                    <a
                      href={project.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-600 transition-colors"
                    >
                      <Github className="w-6 h-6" />
                    </a>
                  )}
                  {project.liveUrl && (
                    <a
                      href={project.liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-600 transition-colors"
                    >
                      <ExternalLink className="w-6 h-6" />
                    </a>
                  )}
                </div>
              </div>
              
              <p className="text-lg mb-4">{project.description}</p>
              
              {project.technologies && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {project.technologies.map((tech, idx) => (
                    <span key={idx} className="px-3 py-1 bg-blue-100 dark:bg-blue-900 rounded-full text-sm">
                      {tech}
                    </span>
                  ))}
                </div>
              )}
              
              {project.features && (
                <div className="space-y-2">
                  <h3 className="font-semibold">Key Features:</h3>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    {project.features.map((feature, idx) => (
                      <li key={idx}>{feature}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </PageTransition>
  );
}

export default Projects;