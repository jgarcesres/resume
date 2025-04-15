import React, { useState } from 'react';
import PageTransition from '../components/PageTransition';
import { Github, ExternalLink, Briefcase, Code } from 'lucide-react';
import projectsContent from '../../resources/projects_content.json';

interface Project {
  title: string;
  description: string;
  githubUrl?: string;
  liveUrl?: string;
  technologies: string[];
  features: string[];
}

interface ProjectsContent {
  projects: {
    public: Project[];
  };
  work: Project[];
}

function Projects() {
  const [activeTab, setActiveTab] = useState<'public' | 'work'>('public');
  const typedProjectsContent = projectsContent as ProjectsContent;
  
  const renderProjects = (projects: Project[]) => {
    return (
      <div className="space-y-8">
        {projects.map((project, index) => (
          <div 
            key={index} 
            className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 shadow-md transition-all hover:shadow-lg"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold">{project.title}</h2>
              <div className="flex space-x-4">
                {project.githubUrl && (
                  <a
                    href={project.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-600 transition-colors"
                    aria-label={`GitHub repository for ${project.title}`}
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
                    aria-label={`Live demo for ${project.title}`}
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
                  <span 
                    key={idx} 
                    className="px-3 py-1 bg-blue-100 dark:bg-blue-900 rounded-full text-sm font-medium"
                  >
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
    );
  };

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Projects</h1>
        
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 mb-8">
          <button
            className={`flex items-center px-4 py-2 border-b-2 font-medium text-sm ${
              activeTab === 'public'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('public')}
          >
            <Code className="w-5 h-5 mr-2" />
            Public Projects
          </button>
          <button
            className={`flex items-center px-4 py-2 border-b-2 font-medium text-sm ${
              activeTab === 'work'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('work')}
          >
            <Briefcase className="w-5 h-5 mr-2" />
            Work Projects
          </button>
        </div>
        
        {/* Content based on active tab */}
        {activeTab === 'public' && renderProjects(typedProjectsContent.projects.public)}
        {activeTab === 'work' && renderProjects(typedProjectsContent.work)}
      </div>
    </PageTransition>
  );
}

export default Projects;