import React, { useRef, useState } from 'react';
import PageTransition from '../components/PageTransition';
import { Download, Briefcase, GraduationCap, Award } from 'lucide-react';
import { motion } from 'framer-motion';
import structuredResume from '../../resources/structured_resume.json';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

function Resume() {
  const resumeRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async () => {
    if (!resumeRef.current) return;
    
    setIsGenerating(true);
    
    try {
      // Create a temporary div to clone the resume content into
      const tempDiv = document.createElement('div');
      tempDiv.className = 'pdf-mode';
      tempDiv.innerHTML = resumeRef.current.innerHTML;
      
      // Find and remove the download button from the cloned content
      const downloadBtn = tempDiv.querySelector('.download-btn');
      if (downloadBtn) {
        downloadBtn.parentNode?.removeChild(downloadBtn);
      }
      
      // Append to body temporarily (hidden) to render properly with styles
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '-9999px';
      document.body.appendChild(tempDiv);
            
      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // Add header with name and contact
      pdf.setFontSize(22);
      pdf.setTextColor(44, 62, 80);
      pdf.text(structuredResume.name, 15, 20);
      
      pdf.setFontSize(12);
      pdf.setTextColor(52, 73, 94);
      pdf.text(structuredResume.email, 15, 25);
      
      // Calculate content width (A4 width minus margins)
      const contentWidth = 210 - 30; // 210mm is A4 width, 30mm is for left+right margins
      
      // Get each section of content separately to prevent cross-page issues
      const sections = tempDiv.querySelectorAll('section');
      
      let yPosition = 30; // Start position after the header
      const pageHeight = 297; // A4 height in mm
      const maxY = pageHeight - 15; // Maximum y position (minus bottom margin)
      
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        
        // Create a div just for this section
        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'pdf-section pdf-mode';
        sectionDiv.style.backgroundColor = 'white';
        sectionDiv.appendChild(section.cloneNode(true));
        document.body.appendChild(sectionDiv);
        
        // Capture the section
        const canvas = await html2canvas(sectionDiv, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          onclone: (clonedDoc) => {
            // Process elements in the cloned document to ensure proper styling
            const forceWhiteBackground = (element) => {
              if (element instanceof HTMLElement) {
                // Default styling for most elements
                element.style.backgroundColor = 'white';
                element.style.boxShadow = 'none';
                
                // Apply light blue borders to section containers
                if (element.classList.contains('dark:bg-gray-800') || 
                    element.classList.contains('bg-gray-50')) {
                  element.style.border = '1px solid #dbeafe'; // Light blue border
                }
                
                // Special handling for skill bubbles to keep blue background
                if (element.classList.contains('skill-bubble')) {
                  element.style.backgroundColor = '#dbeafe !important'; // Light blue background
                  element.style.color = '#1e40af';  // Darker blue text for contrast
                  element.style.borderRadius = '10px';
                  element.style.padding = '4px 12px';
                }
              }
              
              // Recursively process all child elements
              if (element.children && element.children.length > 0) {
                Array.from(element.children).forEach(child => forceWhiteBackground(child));
              }
            };
            
            // Start the recursive process from the root of the cloned content
            const pdfSection = clonedDoc.querySelector('.pdf-section');
            if (pdfSection) {
              forceWhiteBackground(pdfSection);
            }
          }
        });
        
        document.body.removeChild(sectionDiv);
        
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const imgHeight = (canvas.height * contentWidth) / canvas.width;
        
        // Check if we need a new page
        if (yPosition + imgHeight > maxY) {
          pdf.addPage();
          yPosition = 15; // Reset to top margin
        }
        
        // Add the section image
        pdf.addImage(imgData, 'JPEG', 15, yPosition, contentWidth, imgHeight);
        yPosition += imgHeight + 10; // Add some space between sections
      }
      
      // Remove the temporary element
      document.body.removeChild(tempDiv);
      
      // Save the PDF
      pdf.save(`${structuredResume.name.replace(' ', '_')}_Resume.pdf`);
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