import React from 'react';
import PageTransition from '../components/PageTransition';
import { Download, Briefcase, GraduationCap, Award } from 'lucide-react';
import { motion } from 'framer-motion';

function Resume() {
  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Resume</h1>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center space-x-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            onClick={() => window.open('/resume.pdf', '_blank')}
          >
            <Download className="w-4 h-4" />
            <span>Download PDF</span>
          </motion.button>
        </div>
        
        <div className="space-y-8">
          <section>
            <div className="flex items-center space-x-2 mb-4">
              <Briefcase className="w-6 h-6 text-blue-500" />
              <h2 className="text-2xl font-semibold">Experience</h2>
            </div>
            
            <div className="space-y-6">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                <h3 className="text-xl font-semibold">Senior Site Reliability Engineer</h3>
                <p className="text-gray-600 dark:text-gray-400">Current Company • 2020 - Present</p>
                <ul className="mt-4 list-disc list-inside space-y-2">
                  <li>Lead infrastructure automation initiatives using Terraform and Ansible</li>
                  <li>Designed and implemented CI/CD pipelines using GitLab and Jenkins</li>
                  <li>Managed Kubernetes clusters in production environments</li>
                </ul>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                <h3 className="text-xl font-semibold">DevOps Engineer</h3>
                <p className="text-gray-600 dark:text-gray-400">Previous Company • 2018 - 2020</p>
                <ul className="mt-4 list-disc list-inside space-y-2">
                  <li>Implemented monitoring and alerting solutions using Prometheus and Grafana</li>
                  <li>Automated deployment processes reducing deployment time by 60%</li>
                  <li>Maintained and improved cloud infrastructure on AWS</li>
                </ul>
              </div>
            </div>
          </section>
          
          <section>
            <div className="flex items-center space-x-2 mb-4">
              <GraduationCap className="w-6 h-6 text-blue-500" />
              <h2 className="text-2xl font-semibold">Education</h2>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold">B.S. Computer Science</h3>
              <p className="text-gray-600 dark:text-gray-400">University Name • 2014 - 2018</p>
              <p className="mt-2">Focus on distributed systems and software engineering</p>
            </div>
          </section>
          
          <section>
            <div className="flex items-center space-x-2 mb-4">
              <Award className="w-6 h-6 text-blue-500" />
              <h2 className="text-2xl font-semibold">Skills</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                <h3 className="font-semibold mb-3">Technologies</h3>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 rounded-full text-sm">Kubernetes</span>
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 rounded-full text-sm">Docker</span>
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 rounded-full text-sm">Terraform</span>
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 rounded-full text-sm">AWS</span>
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 rounded-full text-sm">Python</span>
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 rounded-full text-sm">Go</span>
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                <h3 className="font-semibold mb-3">Tools</h3>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 rounded-full text-sm">GitLab</span>
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 rounded-full text-sm">Jenkins</span>
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 rounded-full text-sm">Prometheus</span>
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 rounded-full text-sm">Grafana</span>
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 rounded-full text-sm">ELK Stack</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </PageTransition>
  );
}

export default Resume;