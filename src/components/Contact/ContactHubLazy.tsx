'use client';

import dynamic from 'next/dynamic';

// Code-split the contact form (SSR preserved): ContactHub is the only client
// module that imports zod, and this wrapper keeps that weight in a lazy chunk
// loaded on /contact instead of riding the shared eager chunk into every
// route — same pattern as ServicesAds' embla split. The loading fallback only
// shows during client-side navigation (first paint is server-rendered); it
// reserves roughly the form's height so the footer doesn't jump.
const ContactHub = dynamic(() => import('./ContactHub'), {
  loading: () => <div className="min-h-[70vh]" aria-hidden="true" />,
});

export type { ContactHubProps, RoleOption } from './ContactHub';
export default ContactHub;
