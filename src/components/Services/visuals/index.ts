import type { ComponentType } from 'react';

import { SOCIAL_BENTO_VISUALS } from './socialBentoVisuals';
import { BRANDING_BENTO_VISUALS } from './brandingBentoVisuals';

// Every category's bento artifacts, keyed by `${categorySlug}/${serviceSlug}`.
// `ServiceBentoCard` resolves a card's media here before falling back to its
// photo/logo treatment; a category with no entry is untouched.
const BENTO_VISUALS: Record<string, ComponentType> = {
  ...SOCIAL_BENTO_VISUALS,
  ...BRANDING_BENTO_VISUALS,
};

export const getServiceVisual = (
  categorySlug: string,
  serviceSlug: string,
): ComponentType | undefined => BENTO_VISUALS[`${categorySlug}/${serviceSlug}`];
