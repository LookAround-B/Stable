import { useEffect, useState } from 'react';

interface RandomLetterRevealProps {
  text: string;
  className?: string;
  delay?: number;
}

export default function RandomLetterReveal({ text, className = "", delay = 0 }: RandomLetterRevealProps) {
  const [displayText, setDisplayText] = useState("");
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  useEffect(() => {
    if (!text) return;

    let iteration = 0;
    const letters = text.split("");
    const maxIterations = letters.length;

    const start = () => {
      const interval = setInterval(() => {
        const scrambled = letters.map((char, index) => {
          if (index < iteration) return char;
          if (index === Math.floor(iteration)) return characters[Math.floor(Math.random() * characters.length)];
          return " ";
        }).join("");

        setDisplayText(scrambled);

        if (iteration >= maxIterations) {
          clearInterval(interval);
          setDisplayText(text);
        }
        iteration += 1; // Full speed - reveal one character per tick
      }, 18); // Fast tick rate

      return () => clearInterval(interval);
    };

    const timer = setTimeout(start, delay * 1000);
    return () => clearTimeout(timer);
  }, [text, delay]);

  return <span className={className}>{displayText || (text ? " ".repeat(text.length) : "")}</span>;
}
