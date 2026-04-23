import { useRef, useState } from 'react';
import PageTransition from '../components/PageTransition';
import { motion } from 'framer-motion';
import structuredResume from '@resources/structured_resume.json';
import jsPDF from 'jspdf';
import PixelPanel from '../components/ui/PixelPanel';
import PixelButton from '../components/ui/PixelButton';
import PixelBadge from '../components/ui/PixelBadge';
import { FloppyDiskIcon, HourglassIcon, OfficeIcon, GradCapIcon, TrophyIcon } from '../components/ui/PixelIcons';
import { useTheme } from '../context/ThemeContext';
import { useLabels } from '../lib/labels';

function Resume() {
  const resumeRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { isRpg } = useTheme();
  const L = useLabels();

  const addMultilineText = (doc: jsPDF, text: string, x: number, y: number, maxWidth: number, lineHeight: number, fontSize = 12, fontStyle = 'normal') => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', fontStyle);
    const lines = doc.splitTextToSize(text, maxWidth);
    lines.forEach((line: string, idx: number) => {
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
      const bottomMargin = 20;
      let y = marginY;
      const maxWidth = 180;
      const lineHeight = 6;
      const fontSizeTitle = 16;
      const fontSizeSection = 13;
      const fontSizeNormal = 10;
      const fontSizeSmall = 9;

      doc.setFontSize(20);
      doc.setTextColor(44, 62, 80);
      doc.setFont('helvetica', 'bold');
      doc.text(structuredResume.name, marginX, y);
      y += 8;
      doc.setFontSize(fontSizeNormal);
      doc.setTextColor(52, 73, 94);
      doc.setFont('helvetica', 'normal');
      doc.text(structuredResume.email, marginX, y);
      y += 7;
      y = addMultilineText(doc, structuredResume.intro, marginX, y, maxWidth, lineHeight, fontSizeNormal, 'italic');
      y += 2;

      doc.setFontSize(fontSizeTitle);
      doc.setTextColor(37, 99, 235);
      doc.setFont('helvetica', 'bold');
      doc.text('Experience', marginX, y);
      y += 7;
      doc.setFontSize(fontSizeNormal);
      doc.setTextColor(33, 37, 41);
      doc.setFont('helvetica', 'normal');
      const pageHeight = doc.internal.pageSize.getHeight();
      const jobs = structuredResume.experience;
      const jobsOnFirstPage: typeof jobs = [];
      let jobsOnSecondPage: typeof jobs = [];
      let tempY = y;
      for (let i = 0; i < jobs.length; i++) {
        const job = jobs[i];
        let estY = tempY;
        estY += lineHeight;
        estY += 5;
        estY += (doc.splitTextToSize(job.summary, maxWidth - 12).length) * lineHeight;
        estY += job.responsibilities.length * lineHeight;
        estY += 6;
        if (estY > pageHeight - bottomMargin) {
          jobsOnSecondPage = jobs.slice(i);
          break;
        }
        jobsOnFirstPage.push(job);
        tempY = estY;
      }
      const renderJobs = (jobList: typeof jobs) => {
        jobList.forEach((job) => {
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
            y = addMultilineText(doc, `• ${resp}`, marginX + 4, y, maxWidth - 16, lineHeight, fontSizeSmall);
          });
          y += 2;
        });
      };
      renderJobs(jobsOnFirstPage);
      if (jobsOnSecondPage.length > 0) {
        doc.addPage();
        y = marginY;
        doc.setFontSize(fontSizeTitle);
        doc.setTextColor(37, 99, 235);
        doc.setFont('helvetica', 'bold');
        doc.text('Experience (cont.)', marginX, y);
        y += 7;
        renderJobs(jobsOnSecondPage);
      }

      y += 6;
      doc.setFontSize(fontSizeTitle);
      doc.setTextColor(37, 99, 235);
      doc.setFont('helvetica', 'bold');
      doc.text('Education', marginX, y);
      y += 7;
      doc.setFont('helvetica', 'bold');
      y = addMultilineText(doc, structuredResume.education.degree, marginX, y, maxWidth, lineHeight, fontSizeSection, 'bold');
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`${structuredResume.education.institution} • ${structuredResume.education.graduation}`, marginX, y);
      y += 5;
      doc.setTextColor(33, 37, 41);
      y = addMultilineText(doc, structuredResume.education.notes.join(', '), marginX, y, maxWidth, lineHeight, fontSizeSmall);
      y += 6;

      if (structuredResume.certifications?.length > 0) {
        doc.setFontSize(fontSizeTitle);
        doc.setTextColor(37, 99, 235);
        doc.setFont('helvetica', 'bold');
        doc.text('Certifications', marginX, y);
        y += 7;
        doc.setFontSize(fontSizeSmall);
        doc.setTextColor(33, 37, 41);
        doc.setFont('helvetica', 'normal');
        y = addMultilineText(doc, structuredResume.certifications.join(', '), marginX, y, maxWidth, lineHeight, fontSizeSmall);
        y += 6;
      }

      doc.setFontSize(fontSizeTitle);
      doc.setTextColor(37, 99, 235);
      doc.setFont('helvetica', 'bold');
      doc.text('Skills', marginX, y);
      y += 7;
      const skillCategories = Object.entries(structuredResume.skills_and_technologies);
      const colWidth = (maxWidth - 8) / 2;
      let leftY = y;
      let rightY = y;
      for (let i = 0; i < skillCategories.length; i++) {
        const [category, skills] = skillCategories[i];
        const colX = i % 2 === 0 ? marginX : marginX + colWidth + 8;
        let colY = i % 2 === 0 ? leftY : rightY;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(fontSizeSection);
        doc.text(category.replace(/_/g, ' ').toUpperCase(), colX, colY);
        colY += 5;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(33, 37, 41);
        doc.setFontSize(fontSizeSmall);
        const skillLines = doc.splitTextToSize(skills.join(', '), colWidth - 4);
        skillLines.forEach((line: string) => {
          doc.text(line, colX + 4, colY);
          colY += lineHeight;
        });
        colY += 2;
        if (i % 2 === 0) leftY = colY; else rightY = colY;
      }
      doc.save(`${structuredResume.name.replace(' ', '_')}_Resume.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
    setIsGenerating(false);
  };

  const SectionIcon = ({ Icon }: { Icon: React.ComponentType<{ className?: string }> }) => (
    <span className="inline-flex mr-2 align-middle"><Icon className="w-4 h-4" /></span>
  );

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto space-y-6" ref={resumeRef}>
        {/* Character / Professional Header */}
        {isRpg ? (
          <PixelPanel glow="cyan" className="text-center py-6">
            <h1 className="font-pixel text-xl text-rpg-text-bright mb-2">{structuredResume.name}</h1>
            <span className="font-pixel text-[9px] text-neon-gold uppercase">{L.classTitle}</span>
            <div className="mt-3">
              <a href={`mailto:${structuredResume.email}`} className="text-neon-cyan text-xs font-body hover:text-neon-gold transition-colors">
                {structuredResume.email}
              </a>
            </div>
            <p className="mt-4 text-sm text-rpg-text font-body max-w-2xl mx-auto leading-relaxed">
              {structuredResume.intro}
            </p>
          </PixelPanel>
        ) : (
          <section className="pt-6 pb-2">
            <div className="flex items-baseline gap-3 mb-5">
              <span className="pro-label">04 / {L.classTitle}</span>
              <span className="flex-1 h-px bg-pro-rule" aria-hidden />
            </div>
            <h1 className="pro-display text-[52px] md:text-[64px] leading-[0.95] tracking-tight text-pro-ink font-normal">
              {structuredResume.name}
            </h1>
            <div className="mt-3 flex flex-wrap items-baseline gap-x-5 gap-y-1">
              <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-pro-accent">
                {L.classTitle}
              </span>
              <a
                href={`mailto:${structuredResume.email}`}
                className="font-sans text-[14px] text-pro-ink-soft hover:text-pro-accent underline underline-offset-4 decoration-pro-rule hover:decoration-pro-accent transition-colors"
              >
                {structuredResume.email}
              </a>
            </div>
            <p className="mt-6 font-sans text-[16px] text-pro-ink-soft max-w-2xl leading-[1.55]">
              {structuredResume.intro}
            </p>
          </section>
        )}

        {/* Download Button */}
        <div className="flex justify-end no-print">
          <PixelButton onClick={generatePDF} disabled={isGenerating} variant="gold">
            <span className="inline-flex items-center gap-2">
              {isGenerating
                ? <>{isRpg && <HourglassIcon className="w-4 h-4" />} {L.saveGameLoading}</>
                : <>{isRpg && <FloppyDiskIcon className="w-4 h-4" />} {L.saveGame}</>
              }
            </span>
          </PixelButton>
        </div>

        {/* Experience / Adventure Log */}
        <PixelPanel title={L.adventureLog}>
          <div className="space-y-6 pt-2">
            {structuredResume.experience.map((job, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
                className="relative pl-6 border-l-2 border-rpg-border"
              >
                <div className="absolute -left-[5px] top-1 w-2 h-2 bg-neon-cyan border border-neon-cyan/50" />
                <h3 className="font-pixel text-[10px] text-rpg-text-bright uppercase">{job.role}</h3>
                <p className="font-pixel text-[8px] text-rpg-text-dim mt-1">
                  <SectionIcon Icon={OfficeIcon} /> {job.company} · {job.dates}
                </p>
                <p className="text-xs text-neon-cyan/70 font-body italic mt-2 border-l-2 border-neon-cyan/20 pl-3">
                  {job.summary}
                </p>
                <ul className="mt-2 space-y-1">
                  {job.responsibilities.map((task, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-rpg-text font-body">
                      <span className="text-neon-green text-[8px] mt-1 shrink-0">◆</span>
                      {task}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </PixelPanel>

        {/* Education */}
        <PixelPanel title={L.trainingGrounds} glow="gold">
          <div className="pt-2">
            <h3 className="font-pixel text-[10px] text-rpg-text-bright uppercase">
              <SectionIcon Icon={GradCapIcon} /> {structuredResume.education.degree}
            </h3>
            <p className="font-pixel text-[8px] text-rpg-text-dim mt-1">
              {structuredResume.education.institution} · {structuredResume.education.graduation}
            </p>
            <p className="text-xs text-rpg-text font-body mt-2">{structuredResume.education.notes.join(' · ')}</p>
          </div>
        </PixelPanel>

        {/* Certifications */}
        {structuredResume.certifications?.length > 0 && (
          <PixelPanel title={L.achievementsUnlocked} glow="magenta">
            <div className="flex flex-wrap gap-2 pt-2">
              {structuredResume.certifications.map((cert, idx) => (
                <div key={idx} className="flex items-center gap-2 rpg-border px-3 py-2">
                  <TrophyIcon className="w-4 h-4 text-neon-gold" />
                  <span className="font-pixel text-[9px] text-neon-gold">{cert}</span>
                </div>
              ))}
            </div>
          </PixelPanel>
        )}

        {/* Skills & Technologies */}
        <PixelPanel title={L.inventory}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {Object.entries(structuredResume.skills_and_technologies).map(([category, skills], index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 + index * 0.05 }}
                className="border border-rpg-border/50 p-3"
              >
                <h3 className="font-pixel text-[8px] text-neon-cyan uppercase mb-2">
                  {category.replace(/_/g, ' ')}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {skills.map((skill, idx) => (
                    <PixelBadge key={idx}>{skill}</PixelBadge>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </PixelPanel>
      </div>
    </PageTransition>
  );
}

export default Resume;
