import React, { useRef, useState } from 'react';
import PageTransition from '../components/PageTransition';
import { Download, Briefcase, GraduationCap, Award } from 'lucide-react';
import { motion } from 'framer-motion';
import structuredResume from '../../resources/structured_resume.json';
import jsPDF from 'jspdf';

function Resume() {
  const resumeRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Helper for multi-line text
  const addMultilineText = (doc, text, x, y, maxWidth, lineHeight, fontSize = 12, fontStyle = 'normal') => {
    doc.setFontSize(fontSize);
    doc.setFont(undefined, fontStyle);
    const lines = doc.splitTextToSize(text, maxWidth);
    lines.forEach((line, idx) => {
      doc.text(line, x, y + idx * lineHeight);
    });
    return y + lines.length * lineHeight;
  };

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const marginX = 15;
      let y = 20;
      const maxWidth = 180;
      const lineHeight = 7;

      // Header: Name
      doc.setFontSize(22);
      doc.setTextColor(44, 62, 80);
      doc.setFont('helvetica', 'bold');
      doc.text(structuredResume.name, marginX, y);
      y += 9;
      // Email
      doc.setFontSize(12);
      doc.setTextColor(52, 73, 94);
      doc.setFont('helvetica', 'normal');
      doc.text(structuredResume.email, marginX, y);
      y += 10;

      // Section: Experience
      doc.setFontSize(16);
      doc.setTextColor(37, 99, 235); // blue-600
      doc.setFont('helvetica', 'bold');
      doc.text('Experience', marginX, y);
      y += 7;
      doc.setFontSize(12);
      doc.setTextColor(33, 37, 41);
      doc.setFont('helvetica', 'normal');
      structuredResume.experience.forEach((job) => {
        // Role and company
        doc.setFont('helvetica', 'bold');
        y = addMultilineText(doc, job.role, marginX, y, maxWidth, lineHeight, 13, 'bold');
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text(`${job.company} • ${job.dates}`, marginX, y);
        y += 6;
        doc.setTextColor(33, 37, 41);
        // Responsibilities
        job.responsibilities.forEach((resp) => {
          y = addMultilineText(doc, `• ${resp}`, marginX + 4, y, maxWidth - 8, lineHeight, 11);
        });
        y += 3;
      });
      y += 2;

      // Section: Education
      doc.setFontSize(16);
      doc.setTextColor(37, 99, 235);
      doc.setFont('helvetica', 'bold');
      doc.text('Education', marginX, y);
      y += 7;
      doc.setFontSize(12);
      doc.setTextColor(33, 37, 41);
      doc.setFont('helvetica', 'bold');
      y = addMultilineText(doc, structuredResume.education.degree, marginX, y, maxWidth, lineHeight, 13, 'bold');
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`${structuredResume.education.institution} • ${structuredResume.education.graduation}`, marginX, y);
      y += 6;
      doc.setTextColor(33, 37, 41);
      y = addMultilineText(doc, structuredResume.education.notes.join(', '), marginX, y, maxWidth, lineHeight, 11);
      y += 2;

      // Section: Skills
      doc.setFontSize(16);
      doc.setTextColor(37, 99, 235);
      doc.setFont('helvetica', 'bold');
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text('Skills', marginX, y);
      y += 7;
      doc.setFontSize(12);
      doc.setTextColor(33, 37, 41);
      doc.setFont('helvetica', 'normal');
      Object.entries(structuredResume.skills_and_technologies).forEach(([category, skills]) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.setFont('helvetica', 'bold');
        y = addMultilineText(doc, category.replace(/_/g, ' ').toUpperCase(), marginX, y, maxWidth, lineHeight, 12, 'bold');
        doc.setFont('helvetica', 'normal');
        y = addMultilineText(doc, skills.join(', '), marginX + 4, y, maxWidth - 8, lineHeight, 11);
        y += 2;
      });

      // Section: Certifications (if any)
      if (structuredResume.certifications && structuredResume.certifications.length > 0) {
        doc.setFontSize(16);
        doc.setTextColor(37, 99, 235);
        doc.setFont('helvetica', 'bold');
        doc.text('Certifications', marginX, y);
        y += 7;
        doc.setFontSize(12);
        doc.setTextColor(33, 37, 41);
        doc.setFont('helvetica', 'normal');
        y = addMultilineText(doc, structuredResume.certifications.join(', '), marginX, y, maxWidth, lineHeight, 11);
      }

      // Always fit to one page: if y > 280, warn user (optional)
      // Save PDF
      doc.save(`${structuredResume.name.replace(' ', '_')}_Resume.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
    setIsGenerating(false);
  };

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto resume-container" ref={resumeRef}>
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Resume</h1>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center space-x-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors download-btn no-print"
            onClick={generatePDF}
            disabled={isGenerating}
          >
            <Download className="w-4 h-4" />
            <span>{isGenerating ? 'Generating...' : 'Download PDF'}</span>
          </motion.button>
        </div>

        <div className="space-y-8">
          <section>
            <div className="flex items-center space-x-2 mb-4 section-header">
              <Briefcase className="w-6 h-6 text-blue-500" />
              <h2 className="text-2xl font-semibold">Experience</h2>
            </div>

            <div className="space-y-6">
              {structuredResume.experience.map((job, index) => (
                <div key={index} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 job-item">
                  <h3 className="text-xl font-semibold break-words">{job.role}</h3>
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
            <div className="flex items-center space-x-2 mb-4 section-header">
              <GraduationCap className="w-6 h-6 text-blue-500" />
              <h2 className="text-2xl font-semibold">Education</h2>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold break-words">{structuredResume.education.degree}</h3>
              <p className="text-gray-600 dark:text-gray-400">{structuredResume.education.institution} • {structuredResume.education.graduation}</p>
              <p className="mt-2">{structuredResume.education.notes.join(', ')}</p>
            </div>
          </section>

          <section>
            <div className="flex items-center space-x-2 mb-4 section-header">
              <Award className="w-6 h-6 text-blue-500" />
              <h2 className="text-2xl font-semibold">Skills</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(structuredResume.skills_and_technologies).map(([category, skills], index) => (
                <div key={index} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                  <h3 className="font-semibold mb-3 break-words">{category.replace(/_/g, ' ').toUpperCase()}</h3>
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill, idx) => (
                      <span key={idx} className="px-3 py-1 bg-blue-100 dark:bg-blue-900 rounded-full text-sm skill-bubble">{skill}</span>
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