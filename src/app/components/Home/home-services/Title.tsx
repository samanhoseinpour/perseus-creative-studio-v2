'use client';

import { twMerge } from 'tailwind-merge';
import { useInView } from 'framer-motion';
import React, { useEffect, useRef, useState } from 'react';
import { useFeatureStore } from './Store';

interface ServicesTitleProps {
  children: React.ReactNode;
  id: number;
}

export const Title = ({ children, id }: ServicesTitleProps) => {
  const ref = useRef<HTMLParagraphElement>(null);
  const [documentRef, setDocumentRef] = useState<Document | null>(null);

  // Only set documentRef on the client after mount
  useEffect(() => {
    setDocumentRef(document);
  }, []);

  const isInView = useInView(ref, {
    margin: '-50% 0px -50% 0px',
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    root: documentRef || undefined,
  });

  const setInViewFeature = useFeatureStore((state) => state.setInViewFeature);
  const inViewFeature = useFeatureStore((state) => state.inViewFeature);

  useEffect(() => {
    if (isInView) setInViewFeature(id);
    if (!isInView && inViewFeature === id) setInViewFeature(null);
  }, [isInView, id, setInViewFeature, inViewFeature]);

  return (
    <div
      ref={ref}
      className={twMerge(
        'py-24 transition-colors',
        isInView ? 'text-black' : 'text-black/30'
      )}
    >
      {children}
    </div>
  );
};
