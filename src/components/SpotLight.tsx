'use client';
import { useRef, useState, useCallback, useEffect } from 'react';
import { motion, useSpring, useTransform, SpringOptions } from 'motion/react';
import { cn } from '../utils/aceternity';

export type SpotlightProps = {
  className?: string;
  size?: number;
  springOptions?: SpringOptions;
};

const Spotlight = ({
  className,
  size = 200,
  springOptions = { bounce: 0 },
}: SpotlightProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [parentElement, setParentElement] = useState<HTMLElement | null>(null);
  const [isDocumentRoot, setIsDocumentRoot] = useState(false);

  const mouseX = useSpring(0, springOptions);
  const mouseY = useSpring(0, springOptions);

  const spotlightLeft = useTransform(mouseX, (x) => `${x - size / 2}px`);
  const spotlightTop = useTransform(mouseY, (y) => `${y - size / 2}px`);

  useEffect(() => {
    if (!containerRef.current) return;

    const parent = containerRef.current.parentElement as HTMLElement | null;
    if (!parent) return;

    // Body/document-root positioning is viewport-relative. Non-root parents are
    // element-relative and need a containing block for the absolute spotlight.
    const nextIsDocumentRoot =
      parent === document.body || parent === document.documentElement;

    const prevPosition = parent.style.position;
    const prevOverflow = parent.style.overflow;

    if (!nextIsDocumentRoot) {
      parent.style.position = parent.style.position || 'relative';
      parent.style.overflow = parent.style.overflow || 'hidden';
    }

    setIsDocumentRoot(nextIsDocumentRoot);
    setParentElement(parent);

    return () => {
      if (!nextIsDocumentRoot) {
        parent.style.position = prevPosition;
        parent.style.overflow = prevOverflow;
      }
    };
  }, []);

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!parentElement) return;

      if (isDocumentRoot) {
        mouseX.set(event.clientX);
        mouseY.set(event.clientY);
        return;
      }

      const { left, top } = parentElement.getBoundingClientRect();
      mouseX.set(event.clientX - left);
      mouseY.set(event.clientY - top);
    },
    [isDocumentRoot, mouseX, mouseY, parentElement],
  );

  useEffect(() => {
    if (!parentElement) return;

    const abortController = new AbortController();
    const eventTarget: HTMLElement | Window = isDocumentRoot
      ? window
      : parentElement;

    const onMouseMove = (event: Event) => {
      handleMouseMove(event as MouseEvent);
    };

    eventTarget.addEventListener('mousemove', onMouseMove, {
      signal: abortController.signal,
      passive: true,
    });

    if (isDocumentRoot) {
      eventTarget.addEventListener('mouseover', () => setIsHovered(true), {
        signal: abortController.signal,
        passive: true,
      });
      document.addEventListener('mouseleave', () => setIsHovered(false), {
        signal: abortController.signal,
        passive: true,
      });
    } else {
      parentElement.addEventListener('mouseenter', () => setIsHovered(true), {
        signal: abortController.signal,
        passive: true,
      });
      parentElement.addEventListener('mouseleave', () => setIsHovered(false), {
        signal: abortController.signal,
        passive: true,
      });
    }

    return () => {
      abortController.abort();
    };
  }, [isDocumentRoot, parentElement, handleMouseMove]);

  return (
    <motion.div
      ref={containerRef}
      className={cn(
        'pointer-events-none rounded-full bg-[radial-gradient(circle_at_center,var(--color-background-contrast-black)_0%,transparent_70%)] blur-xl transition-opacity duration-200 will-change-transform contain-paint',
        isHovered ? 'opacity-40' : 'opacity-0',
        className,
      )}
      style={{
        position: isDocumentRoot ? 'fixed' : 'absolute',
        width: size,
        height: size,
        left: spotlightLeft,
        top: spotlightTop,
      }}
    />
  );
};

export default Spotlight;
