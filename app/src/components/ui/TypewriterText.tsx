import { useState, useEffect } from 'react';

interface TypewriterTextProps {
  text: string;
  speed?: number;
  className?: string;
  onComplete?: () => void;
  delay?: number;
}

function TypewriterText({ text, speed = 35, className = '', onComplete, delay = 0 }: TypewriterTextProps) {
  const [displayed, setDisplayed] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const startTimer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(startTimer);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    if (displayed.length >= text.length) {
      onComplete?.();
      return;
    }
    const timer = setTimeout(() => {
      setDisplayed(text.slice(0, displayed.length + 1));
    }, speed);
    return () => clearTimeout(timer);
  }, [displayed, text, speed, started, onComplete]);

  return (
    <span className={className}>
      {displayed}
      {displayed.length < text.length && (
        <span className="border-r-2 border-current animate-typewriter-cursor ml-0.5">&nbsp;</span>
      )}
    </span>
  );
}

export default TypewriterText;
