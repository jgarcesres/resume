import React from 'react';
import PageTransition from '../components/PageTransition';
import { Download, Briefcase, GraduationCap, Award } from 'lucide-react';
import { motion } from 'framer-motion';
import structuredResume from '../../structured_resume.json';

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
              {structuredResume.experience.map((job, index) => (
                <div key={index} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                  <h3 className="text-xl font-semibold">{job.role}</h3>
                  <p className="text-gray-600 dark:text-gray-400">{job.company} • {job.dates}</p>
                  <ul className="mt-4 list-disc list-inside space-y-2">
                    {job.responsibilities.map((task, idx) => (
                      <li key={idx}>{task}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center space-x-2 mb-4">
              <GraduationCap className="w-6 h-6 text-blue-500" />
              <h2 className="text-2xl font-semibold">Education</h2>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold">{structuredResume.education.degree}</h3>
              <p className="text-gray-600 dark:text-gray-400">{structuredResume.education.institution} • {structuredResume.education.graduation}</p>
              <p className="mt-2">{structuredResume.education.notes.join(', ')}</p>
            </div>
          </section>

          <section>
            <div className="flex items-center space-x-2 mb-4">
              <Award className="w-6 h-6 text-blue-500" />
              <h2 className="text-2xl font-semibold">Skills</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(structuredResume.skills_and_technologies).map(([category, skills], index) => (
                <div key={index} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                  <h3 className="font-semibold mb-3">{category.replace('_', ' ').toUpperCase()}</h3>
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill, idx) => (
                      <span key={idx} className="px-3 py-1 bg-blue-100 dark:bg-blue-900 rounded-full text-sm">{skill}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </PageTransition>
  );
}

export default Resume;