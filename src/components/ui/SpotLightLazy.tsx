'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { SpotlightProps } from '@/components/ui/SpotLight';

// SpotLight is a desktop-only visual (the marketing layout hides it below md),
// but as a static import it still shipped and hydrated its springs, transforms,
// and window listeners on phones. This wrapper keeps it out of the mobile
// mount entirely: server render and first client render both produce nothing
// (no hydration mismatch — same trick as SmartLenis, adapted for a component
// that renders DOM), then pointer-equipped viewports mount it one tick after
// hydration. It's invisible until hover anyway, so the late mount can't flash.
const SpotLight = dynamic(() => import('@/components/ui/SpotLight'), {
  ssr: false,
});

const SpotLightLazy = (props: SpotlightProps) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(min-width: 768px) and (pointer: fine)').matches) {
      setShow(true);
    }
  }, []);

  if (!show) return null;
  return <SpotLight {...props} />;
};

export default SpotLightLazy;
