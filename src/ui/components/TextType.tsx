'use client';

import { useEffect, useMemo, useRef, useState, type ElementType, type JSX } from 'react';
import { cn } from '../lib/cn';

export type TextTypeProps = {
  text: string | string[];
  as?: keyof JSX.IntrinsicElements;
  typingSpeed?: number;
  initialDelay?: number;
  pauseDuration?: number;
  deletingSpeed?: number;
  loop?: boolean;
  className?: string;
  showCursor?: boolean;
  hideCursorWhileTyping?: boolean;
  cursorCharacter?: string;
  cursorClassName?: string;
  textColors?: string[];
  variableSpeed?: { min: number; max: number };
  onSentenceComplete?: (text: string, index: number) => void;
  startOnVisible?: boolean;
  reverseMode?: boolean;
};

export function TextType({
  text,
  as: Component = 'div',
  typingSpeed = 50,
  initialDelay = 0,
  pauseDuration = 2000,
  deletingSpeed = 30,
  loop = true,
  className = '',
  showCursor = true,
  hideCursorWhileTyping = false,
  cursorCharacter = '|',
  cursorClassName = '',
  textColors = [],
  variableSpeed,
  onSentenceComplete,
  startOnVisible = false,
  reverseMode = false,
  ...props
}: TextTypeProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [isTypingOrDeleting, setIsTypingOrDeleting] = useState(false);
  const [isVisible, setIsVisible] = useState(!startOnVisible);

  const containerRef = useRef<HTMLElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSentenceCompleteRef = useRef(onSentenceComplete);
  onSentenceCompleteRef.current = onSentenceComplete;

  const textKey = Array.isArray(text) ? text.join('\u0000') : String(text ?? '');

  const textArray = useMemo(() => {
    const lines = Array.isArray(text) ? text : [text];
    return lines.filter((line): line is string => typeof line === 'string' && line.length > 0);
  }, [textKey]);

  const clearTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const schedule = (fn: () => void, delay: number) => {
    clearTimer();
    timeoutRef.current = setTimeout(fn, delay);
  };

  const getTypingDelay = () => {
    if (!variableSpeed) return typingSpeed;
    const { min, max } = variableSpeed;
    return Math.random() * (max - min) + min;
  };

  useEffect(() => {
    if (!startOnVisible || !containerRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setIsVisible(true);
        });
      },
      { threshold: 0.1 }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [startOnVisible]);

  useEffect(() => {
    if (!isVisible || textArray.length === 0) return;

    let cancelled = false;
    let textIndex = 0;
    let charIndex = 0;
    let deleting = false;

    setDisplayedText('');
    setCurrentTextIndex(0);
    setIsTypingOrDeleting(false);

    const getSentence = () => {
      const raw = textArray[textIndex] ?? '';
      return reverseMode ? raw.split('').reverse().join('') : raw;
    };

    const tick = () => {
      if (cancelled) return;
      const sentence = getSentence();

      if (!deleting) {
        if (charIndex < sentence.length) {
          charIndex += 1;
          setDisplayedText(sentence.slice(0, charIndex));
          setIsTypingOrDeleting(true);
          schedule(tick, getTypingDelay());
          return;
        }

        setIsTypingOrDeleting(false);
        if (!loop && textIndex >= textArray.length - 1) return;

        schedule(() => {
          deleting = true;
          setIsTypingOrDeleting(true);
          tick();
        }, pauseDuration);
        return;
      }

      if (charIndex > 0) {
        charIndex -= 1;
        setDisplayedText(sentence.slice(0, charIndex));
        schedule(tick, deletingSpeed);
        return;
      }

      setIsTypingOrDeleting(false);
      onSentenceCompleteRef.current?.(textArray[textIndex], textIndex);

      const isLast = textIndex >= textArray.length - 1;
      if (!loop && isLast) return;

      textIndex = isLast ? 0 : textIndex + 1;
      deleting = false;
      charIndex = 0;
      setCurrentTextIndex(textIndex);

      schedule(() => {
        setIsTypingOrDeleting(true);
        tick();
      }, pauseDuration / 3);
    };

    schedule(tick, initialDelay);

    return () => {
      cancelled = true;
      clearTimer();
    };
  }, [
    isVisible,
    textArray,
    typingSpeed,
    deletingSpeed,
    pauseDuration,
    loop,
    initialDelay,
    reverseMode,
    variableSpeed?.min,
    variableSpeed?.max,
  ]);

  const shouldHideCursor = hideCursorWhileTyping && isTypingOrDeleting;
  const Element = Component as ElementType;
  const textColor =
    textColors.length > 0 ? textColors[currentTextIndex % textColors.length] : 'inherit';

  return (
    <Element
      ref={containerRef as React.Ref<HTMLElement>}
      className={cn('inline-block whitespace-pre-wrap', className)}
      {...props}
    >
      <span style={{ color: textColor }}>{displayedText}</span>
      {showCursor ? (
        <span
          className={cn(
            'ml-1 inline-block animate-pulse',
            shouldHideCursor && 'hidden',
            cursorClassName
          )}
        >
          {cursorCharacter}
        </span>
      ) : null}
    </Element>
  );
}

export default TextType;
