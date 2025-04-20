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
      const marginY = 18;
      const bottomMargin = 20; // Add bottom margin
      let y = marginY;
      const maxWidth = 180;
      const lineHeight = 6;
      const fontSizeTitle = 16;
      const fontSizeSection = 13;
      const fontSizeNormal = 10;
      const fontSizeSmall = 9;

      // Header: Name
      doc.setFontSize(20);
      doc.setTextColor(44, 62, 80);
      doc.setFont('helvetica', 'bold');
      doc.text(structuredResume.name, marginX, y);
      y += 8;
      // Email
      doc.setFontSize(fontSizeNormal);
      doc.setTextColor(52, 73, 94);
      doc.setFont('helvetica', 'normal');
      doc.text(structuredResume.email, marginX, y);
      y += 7;
      // Intro
      doc.setFontSize(fontSizeNormal);
      doc.setTextColor(33, 37, 41);
      y = addMultilineText(doc, structuredResume.intro, marginX, y, maxWidth, lineHeight, fontSizeNormal, 'italic');
      y += 2;

      // Section: Experience (try to fit all on first page)
      doc.setFontSize(fontSizeTitle);
      doc.setTextColor(37, 99, 235); // blue-600
      doc.setFont('helvetica', 'bold');
      doc.text('Experience', marginX, y);
      y += 7;
      doc.setFontSize(fontSizeNormal);
      doc.setTextColor(33, 37, 41);
      doc.setFont('helvetica', 'normal');
      const pageHeight = doc.internal.pageSize.getHeight();
      let jobs = structuredResume.experience;
      let jobsOnFirstPage = [];
      let jobsOnSecondPage = [];
      let tempY = y;
      // Estimate how many jobs fit on first page
      for (let i = 0; i < jobs.length; i++) {
        let job = jobs[i];
        let estY = tempY;
        estY += lineHeight; // role
        estY += 5; // company/dates
        estY += (doc.splitTextToSize(job.summary, maxWidth - 12).length) * lineHeight; // summary indent
        estY += job.responsibilities.length * lineHeight;
        estY += 6; // padding
        if (estY > pageHeight - bottomMargin) {
          jobsOnSecondPage = jobs.slice(i);
          break;
        }
        jobsOnFirstPage.push(job);
        tempY = estY;
      }
      // Render jobs for first page
      jobsOnFirstPage.forEach((job) => {
        doc.setFont('helvetica', 'bold');
        y = addMultilineText(doc, job.role, marginX, y, maxWidth, lineHeight, fontSizeSection, 'bold');
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text(`${job.company} • ${job.dates}`, marginX, y);
        y += 5;
        doc.setTextColor(33, 37, 41);
        // Summary aligned with title/company
        y = addMultilineText(doc, job.summary, marginX, y, maxWidth - 12, lineHeight, fontSizeSmall, 'italic');
        doc.setFontSize(fontSizeSmall);
        // Bullet points indented
        job.responsibilities.forEach((resp) => {
          y = addMultilineText(doc, `• ${resp}`, marginX + 4, y, maxWidth - 16, lineHeight, fontSizeSmall);
        });
        y += 2;
      });
      // If any jobs left, add new page and render them
      if (jobsOnSecondPage.length > 0) {
        doc.addPage();
        y = marginY;
        doc.setFontSize(fontSizeTitle);
        doc.setTextColor(37, 99, 235);
        doc.setFont('helvetica', 'bold');
        doc.text('Experience (cont.)', marginX, y);
        y += 7;
        doc.setFontSize(fontSizeNormal);
        doc.setTextColor(33, 37, 41);
        doc.setFont('helvetica', 'normal');
        jobsOnSecondPage.forEach((job) => {
          doc.setFont('helvetica', 'bold');
          y = addMultilineText(doc, job.role, marginX, y, maxWidth, lineHeight, fontSizeSection, 'bold');
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(100, 116, 139);
          doc.text(`${job.company} • ${job.dates}`, marginX, y);
          y += 5;
          doc.setTextColor(33, 37, 41);
          y = addMultilineText(doc, job.summary, marginX, y, maxWidth - 12, lineHeight, fontSizeSmall, 'italic');
          doc.setFontSize(fontSizeSmall);
          job.responsibilities.forEach((resp) => {
            y = addMultilineText(doc, `• ${resp}`, marginX + 8, y, maxWidth - 16, lineHeight, fontSizeSmall);
          });
          y += 2;
        });
      }
      // Continue on same page for Education, Certifications, Skills
      if (jobsOnSecondPage.length > 0) {
        // already on new page
      } else {
        // not on new page, continue
      }
      y += 6; // Match spacing between all sections (was 4, now 6)
      // Section: Education
      doc.setFontSize(fontSizeTitle);
      doc.setTextColor(37, 99, 235);
      doc.setFont('helvetica', 'bold');
      doc.text('Education', marginX, y);
      y += 7;
      doc.setFontSize(fontSizeNormal);
      doc.setTextColor(33, 37, 41);
      doc.setFont('helvetica', 'bold');
      y = addMultilineText(doc, structuredResume.education.degree, marginX, y, maxWidth, lineHeight, fontSizeSection, 'bold');
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`${structuredResume.education.institution} • ${structuredResume.education.graduation}`, marginX, y);
      y += 5;
      doc.setTextColor(33, 37, 41);
      y = addMultilineText(doc, structuredResume.education.notes.join(', '), marginX, y, maxWidth, lineHeight, fontSizeSmall);
      y += 6; // Match spacing before certifications
      if (structuredResume.certifications && structuredResume.certifications.length > 0) {
        doc.setFontSize(fontSizeTitle);
        doc.setTextColor(37, 99, 235);
        doc.setFont('helvetica', 'bold');
        doc.text('Certifications', marginX, y);
        y += 7;
        doc.setFontSize(fontSizeSmall);
        doc.setTextColor(33, 37, 41);
        doc.setFont('helvetica', 'normal');
        y = addMultilineText(doc, structuredResume.certifications.join(', '), marginX, y, maxWidth, lineHeight, fontSizeSmall);
        y += 6; // Match spacing before skills
      }
      doc.setFontSize(fontSizeTitle);
      doc.setTextColor(37, 99, 235);
      doc.setFont('helvetica', 'bold');
      doc.text('Skills', marginX, y);
      y += 7;
      doc.setFontSize(fontSizeSmall);
      doc.setTextColor(33, 37, 41);
      doc.setFont('helvetica', 'normal');
      // --- Two-column (twoleft) layout for skills ---
      const skillCategories = Object.entries(structuredResume.skills_and_technologies);
      const colWidth = (maxWidth - 8) / 2; // 2 columns, with some gap
      let leftY = y;
      let rightY = y;
      for (let i = 0; i < skillCategories.length; i++) {
        const [category, skills] = skillCategories[i];
        const colX = i % 2 === 0 ? marginX : marginX + colWidth + 8;
        let colY = i % 2 === 0 ? leftY : rightY;
        // Category title - black, bold
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0); // Black
        doc.setFontSize(fontSizeSection);
        doc.text(category.replace(/_/g, ' ').toUpperCase(), colX, colY);
        colY += 5;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(33, 37, 41);
        doc.setFontSize(fontSizeSmall);
        // Skills as comma separated, left-aligned
        const skillLines = doc.splitTextToSize(skills.join(', '), colWidth - 4);
        skillLines.forEach((line) => {
          doc.text(line, colX + 4, colY);
          colY += lineHeight;
        });
        colY += 2;
        if (i % 2 === 0) {
          leftY = colY;
        } else {
          rightY = colY;
        }
      }
      y = Math.max(leftY, rightY) + 2;
      doc.save(`${structuredResume.name.replace(' ', '_')}_Resume.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
    setIsGenerating(false);
  };

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto resume-container" ref={resumeRef}>
        {/* Intro Section */}
        <div className="flex flex-col items-center text-center mb-10">
          <img
            src="https://images.unsplash.com/photo-1511367461989-f85a21fda167?auto=format&fit=facearea&w=256&q=80"
            alt="Profile"
            className="w-24 h-24 rounded-full object-cover border-4 border-blue-500 shadow-lg mb-4"
          />
          <h1 className="text-4xl font-bold mb-1">{structuredResume.name}</h1>
          <a href={`mailto:${structuredResume.email}`} className="text-blue-600 dark:text-blue-400 hover:underline mb-2">{structuredResume.email}</a>
          <p className="max-w-2xl text-lg text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900 rounded-xl px-6 py-4 shadow-md border border-blue-100 dark:border-blue-800">
            {structuredResume.intro}
          </p>
        </div>
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
                  {/* Job Summary */}
                  <p className="mt-2 mb-3 text-base text-gray-800 dark:text-gray-200 italic bg-blue-100/60 dark:bg-blue-900/40 rounded px-4 py-2">
                    {job.summary}
                  </p>
                  <ul className="mt-2 list-disc list-inside space-y-2">
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