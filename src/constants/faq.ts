// FAQ page copy. Split out of constants/index.ts so the client-bundled FaqList
// (and every route, via the shared chunk group) stops shipping the full Q&A set;
// the /frequently-asked-questions page passes these to <FaqList items={...}>.
//
// Editorial contract for this file:
//  - This is the studio-wide layer. Per-discipline depth lives in the `faqs`
//    blocks on each service category/detail record (`@/constants/services`),
//    each project category (`@/constants/projects`), and the blog index
//    (BLOG_INDEX_FAQS in `@/constants/blogs`). Answer the cross-cutting
//    question here and point at the page that owns the detail via `links`.
//  - First person, present tense, no third-person "Perseus's site says…".
//  - No prices or dollar figures anywhere — scope and engagement framing only.
//  - Every claim must be true of the site as it stands today. The whole set is
//    emitted as FAQPage JSON-LD, so a stale answer is a stale schema claim.
import type { FAQItem } from '@/components/FaqList';

// The two Careers answers below are FALLBACKS. The FAQ page swaps them at
// render time for copy composed from the live job listings (composeHiringFaq /
// composeRemoteFaq in src/lib/careerFields.ts), matched on these question
// strings — so keep the constants and the `question` fields in sync, and never
// name a role in the stored answer (it would go stale the day a role closes).
export const HIRING_FAQ_QUESTION = 'Are you hiring?';
export const REMOTE_FAQ_QUESTION = 'Are the roles remote?';

export const faqItems: FAQItem[] = [
  // ── Services ──────────────────────────────────────────────────────────────
  {
    category: 'Services',
    question: 'What does Perseus Creative Studio actually do?',
    answer:
      'We’re a Vancouver marketing agency built around five in-house disciplines: production (video, photo, aerial, 3D and virtual tours), websites (design, development, e-commerce, landing pages, care), digital marketing (SEO, Google/Meta/LinkedIn Ads, tracking, CRO), social media (strategy, management, creator collaborations, reporting), and branding (strategy, identity, messaging, guidelines, creative direction). One senior team covers all five, so the brand system, the site it lives on, the content that fills it, and the campaigns that drive traffic are planned together instead of handed between vendors.',
    links: [{ label: 'All services', href: '/services' }],
  },
  {
    category: 'Services',
    question: 'What’s included under Production?',
    answer:
      'Videography, photography, aerial (drone) production, post-production, 2D/3D models, and Matterport virtual tours. Most engagements capture stills and motion in the same session, so your website, listings, ads, and social all draw from one coherent set of media instead of mismatched sources.',
    links: [
      { label: 'Production services', href: '/services/production' },
      { label: 'Production work', href: '/projects/production' },
    ],
  },
  {
    category: 'Services',
    question: 'What’s included under Websites?',
    answer:
      'Website design, development, redesigns, e-commerce, landing pages, web applications, ongoing maintenance, and standalone performance/SEO audits for sites we didn’t build. Every build ships fast, search-ready, measurable, and editable by your own team.',
    links: [
      { label: 'Website services', href: '/services/websites' },
      { label: 'Website work', href: '/projects/websites' },
    ],
  },
  {
    category: 'Services',
    question: 'What’s included under Digital Marketing?',
    answer:
      'SEO, Google Ads, Meta Ads, LinkedIn Ads, tracking & analytics, and conversion rate optimization. Tracking comes first in every engagement — we’d rather fix attribution before spending your budget than report on numbers nobody in the room trusts.',
    links: [
      { label: 'Digital marketing services', href: '/services/digital-marketing' },
    ],
  },
  {
    category: 'Services',
    question: 'What’s included under Social Media?',
    answer:
      'Social strategy, day-to-day management, influencer and creator collaborations, and reporting & insights. Content is produced in-house by the same production team, so the feed is original photo and video cut for each platform — not stock, not reposts.',
    links: [{ label: 'Social media services', href: '/services/social' }],
  },
  {
    category: 'Services',
    question: 'What’s included under Branding?',
    answer:
      'Brand strategy & positioning, logo and visual identity, brand messaging & copywriting, brand guidelines, and creative direction. Identities ship as systems with usage rules your future designers, printers, and developers can follow — not as a single logo file.',
    links: [{ label: 'Branding services', href: '/services/branding' }],
  },
  {
    category: 'Services',
    question: 'Can we hire you for just one service?',
    answer:
      'Yes. Plenty of engagements are a single shoot, one landing page, a brand refresh, or an ad account rebuild. Every service has its own page covering scope, process, what’s included, and what delivery looks like — read the one that fits and tell us where you want to start.',
    links: [
      { label: 'Browse services', href: '/services' },
      { label: 'Start a project', href: '/contact' },
    ],
  },
  {
    category: 'Services',
    question: 'How do we decide which service to start with?',
    answer:
      'We’d rather sequence the work than sell all of it. On the first call we look for where opportunity is actually being lost: unclear positioning, a site that doesn’t convert, no content to run, or campaigns pointed at the wrong page. Whatever is costing you the most gets fixed first, and the rest is phased so the work compounds instead of scattering.',
    links: [{ label: 'Tell us your goals', href: '/contact' }],
  },
  {
    category: 'Services',
    question: 'Can you bundle branding, website, and ongoing marketing?',
    answer:
      'Yes, and it’s usually the most efficient way to work with us. Bundling keeps one team on strategy through execution: the brand system informs the site, one shoot fills both, and campaigns run against analytics that were wired in during the build. Creative gets reused across channels instead of re-commissioned for each one.',
  },
  {
    category: 'Services',
    question: 'Do you build landing pages and funnels designed to convert?',
    answer:
      'Yes — landing pages are their own service. We align the offer, copy, design, build, and tracking so the page performs as a measurable channel rather than a URL, and we wire the follow-through at the same time: forms, notifications, CRM handoff, and thank-you paths.',
    links: [
      { label: 'Landing pages', href: '/services/websites/landing-pages' },
    ],
  },
  {
    category: 'Services',
    question: 'What if we need something outside those five disciplines?',
    answer:
      'Tell us anyway. If it’s adjacent — a print piece that has to match the identity, a platform we haven’t run before, a tool we haven’t integrated — we’ll usually scope it. If it’s genuinely outside what we do well, we’ll say so on the first call and point you somewhere better rather than stretching a scope to fit.',
  },

  // ── Studio ────────────────────────────────────────────────────────────────
  {
    category: 'Studio',
    question: 'Where is Perseus based, and where do you work?',
    answer:
      'The studio is in North Vancouver, BC — visits by appointment — and we work throughout Metro Vancouver and the Sea-to-Sky corridor in person. Beyond that, our project archive spans Toronto, Edmonton, Kelowna, Kamloops, Salt Spring Island, Los Angeles, Irvine, Cary, Madrid, Marbella, Como, and the UK. Production travels; strategy, web, and marketing run remotely with scheduling set to your time zone.',
    links: [
      { label: 'About the studio', href: '/about' },
      { label: 'Where we’ve worked', href: '/projects' },
    ],
  },
  {
    category: 'Studio',
    question: 'When was Perseus founded?',
    answer:
      'January 2024. We started out helping small businesses and personal brands stand out through creativity, strategy, and storytelling, and grew from single design and media projects into full engagements across industries and continents — the About page timeline walks through each year, including the productions that took us out of the country.',
    links: [{ label: 'Studio timeline', href: '/about' }],
  },
  {
    category: 'Studio',
    question: 'Who will we actually be working with?',
    answer:
      'The people who scope the work are the people who do it. The studio is led by founder & CEO Aryan Ghasemi, co-founder & CTO Saman Hoseinpour, and COO Arshia Farrahi, alongside in-house marketing, post-production, and videography specialists. You get one primary point of contact for the engagement, not a rotating account layer between you and the work.',
    links: [{ label: 'Meet the team', href: '/about' }],
  },
  {
    category: 'Studio',
    question: 'How big is the team, and do you subcontract?',
    answer:
      'Small and senior by design. Cameras, drones, editors, designers, and developers are on the team rather than on somebody else’s retainer, which is why quality stays consistent from a shoot to a landing page. When a project needs a specialist we don’t have, we bring in a vetted collaborator — and we tell you when we do.',
    links: [{ label: 'How we work', href: '/about' }],
  },
  {
    category: 'Studio',
    question: 'What makes Perseus different from a traditional agency?',
    answer:
      'Three things. One senior team end to end, so there are no hand-offs between vendors and no telephone-game briefs. Production in-house rather than subcontracted, so the same hands touch every deliverable. And everything built for distribution — nothing is made without knowing where it will live, whether that’s a homepage hero, a paid ad, a listing feed, or a search result.',
    links: [{ label: 'Why brands choose us', href: '/about' }],
  },
  {
    category: 'Studio',
    question: 'Can we see reviews or speak to past clients?',
    answer:
      'Our Google Business Profile reviews are pulled live onto the home and About pages, and the client wall on About shows who we’ve worked with. For references matched to your industry and the exact deliverable you’re weighing, just ask — we’ll connect you with the most relevant one rather than a generic testimonial.',
    links: [
      { label: 'Reviews & clients', href: '/about' },
      { label: 'Ask for a reference', href: '/contact' },
    ],
  },
  {
    category: 'Studio',
    question: 'Do you work in languages other than English?',
    answer:
      'Day-to-day work runs in English. We do build multilingual and multi-regional websites, and we’ve delivered projects across North America and Europe — so if your audience isn’t English-first, raise it early and we’ll scope translation and localization properly instead of retrofitting it after launch.',
  },
  {
    category: 'Studio',
    question: 'Where can we follow what the studio is making?',
    answer:
      'New work lands on Instagram first, and the About page carries a live feed of it. Finished engagements go into the project archive with the client, industry, location, and year attached, and longer write-ups go on the blog.',
    links: [
      { label: 'Project archive', href: '/projects' },
      { label: 'Blog', href: '/blogs' },
    ],
  },
  {
    category: 'Studio',
    question: 'Do you publish anything useful for free?',
    answer:
      'The blog carries what we’ve learned from live client work — websites, SEO, paid media, production, and social — written or reviewed by the team and attributed to named authors rather than a generic byline. The blog index has its own FAQ covering cadence, sourcing, and how to quote or republish a piece.',
    links: [
      { label: 'Read the blog', href: '/blogs' },
      { label: 'Our authors', href: '/blogs/authors' },
    ],
  },

  // ── Projects ──────────────────────────────────────────────────────────────
  {
    category: 'Projects',
    question: 'Where can I see examples of your work?',
    answer:
      'The project archive is organized by discipline — production, websites, digital marketing, social, and branding — with more than seventy engagements published across them. Each category page lets you narrow by service, industry, and location, so you can jump straight to work that resembles yours instead of scrolling a generic portfolio.',
    links: [{ label: 'Project archive', href: '/projects' }],
  },
  {
    category: 'Projects',
    question: 'Is everything in the archive real client work?',
    answer:
      'Yes. Every card is a delivered engagement with the client, industry, location, and year attached, and website projects link out to the live build so you can visit it yourself. Nothing in the archive is a concept piece, a spec mockup, or a rendering of work we didn’t do.',
    links: [{ label: 'Browse the work', href: '/projects' }],
  },
  {
    category: 'Projects',
    question: 'Why don’t all projects have a full written case study yet?',
    answer:
      'Because a case study written on launch day isn’t worth your time. We publish the full write-up once there’s something real to report — measured performance for a site, a matured results window for a campaign, an identity actually live in the world. Until then the archive card carries the scope, the client, and the work itself.',
  },
  {
    category: 'Projects',
    question: 'Can I see work for my specific industry?',
    answer:
      'Filter any category by industry. Real estate, construction & trades, hospitality & events, sports & fitness, health & wellness, retail & e-commerce, home services, boats & yachts, and energy & infrastructure are all represented. If your niche isn’t listed, ask — we’ll send the closest relevant references and explain the strategy, deliverables, and production approach behind them.',
    links: [
      { label: 'Filter by industry', href: '/projects' },
      { label: 'Ask for examples', href: '/contact' },
    ],
  },
  {
    category: 'Projects',
    question: 'Do you share results, reporting, and performance outcomes?',
    answer:
      'Yes, defined against what results mean for you — qualified leads, bookings, sales, engagement, or conversion-rate lift. Campaigns and retainers get reporting on a set cadence, translated into next steps rather than dumped as a dashboard. Websites get post-launch monitoring on traffic sources, drop-off points, and form completion, which feeds the next round of improvements.',
  },
  {
    category: 'Projects',
    question: 'What deliverables come out of a typical website project?',
    answer:
      'Sitemap and page structure, UX flows, visual design with a reusable component system, developed and mobile-optimized pages, SEO foundations, analytics and conversion tracking, a launch checklist, and a documented handover. Integrations — forms, CRM and email workflows, booking, payments — are scoped in when the project needs them.',
    links: [{ label: 'Website services', href: '/services/websites' }],
  },
  {
    category: 'Projects',
    question: 'Can our project be featured — or kept private?',
    answer:
      'Your call, and we ask before anything is published. Confidential engagements stay out of the archive entirely, and we can still share the work privately for reference without it appearing anywhere on the site or on social.',
  },

  // ── Process ───────────────────────────────────────────────────────────────
  {
    category: 'Process',
    question: 'What happens after I send an inquiry?',
    answer:
      'We read it, and one of us replies with either a short list of questions or a time to talk. The call is a scoping conversation, not a pitch: goals, audience, what already exists, and what has to be true for the project to be worth doing. A written proposal follows with scope, deliverables, milestones, and a timeline.',
    links: [{ label: 'Send an inquiry', href: '/contact' }],
  },
  {
    category: 'Process',
    question: 'What does your working process look like?',
    answer:
      'Every discipline runs the same four-beat arc, named for its craft: discovery and strategy, then creation (design, shoot, or campaign build), then refinement through structured review, then launch and support. A shoot runs pre-production, production, post, delivery; a site runs discovery, design, build, launch; a marketing engagement runs audit, tracking setup, optimize, report. Each service page spells out its own version step by step.',
    links: [{ label: 'Process by service', href: '/services' }],
  },
  {
    category: 'Process',
    question: 'What should we prepare before the first call?',
    answer:
      'Your goal, your audience, what’s most urgent right now, an ideal timeline, and how you’ll judge success. If you have them: website and social links, brand guidelines or existing assets, access to current analytics and ad accounts, and two or three references you like with a note on what you like about them.',
  },
  {
    category: 'Process',
    question: 'How do revisions and approvals work?',
    answer:
      'Feedback is consolidated in one place so it’s always clear what’s changing and why, and approvals happen at defined checkpoints before anything ships. Each deliverable carries an agreed revision approach set out in the proposal. If new requests grow past the original scope we flag it early and give you options on timeline and budget rather than absorbing it quietly and slipping the date.',
  },
  {
    category: 'Process',
    question: 'How long do projects usually take?',
    answer:
      'Scope, feedback speed, and production complexity drive it, and exact milestones are dated in your proposal. As a guide: branding and design run a few weeks; website builds run several weeks to a few months depending on pages, features, and integrations; single-location productions run a few weeks from scope to delivery, while multi-visit build series span the length of the build itself. SEO and paid programs are ongoing by nature.',
  },
  {
    category: 'Process',
    question: 'How do you communicate during a project?',
    answer:
      'One primary point of contact, requests and feedback tracked in a shared system so nothing lives in a single person’s inbox, and a check-in cadence agreed at kickoff. Urgent issues — a site down, a campaign misfiring — jump the queue; routine work is scheduled and delivered against the turnaround set for your engagement.',
  },
  {
    category: 'Process',
    question: 'What do you need from us to keep things moving?',
    answer:
      'Timely feedback at the checkpoints, access to whatever we’re working on (accounts, locations, the people being filmed), and one decision-maker who can approve. Most timelines slip on review cycles rather than production — the projects that hit their dates are the ones where feedback comes back consolidated and on time.',
  },
  {
    category: 'Process',
    question: 'Do you work alongside our team or other vendors?',
    answer:
      'Often, yes. We regularly plug into an in-house marketing lead, an existing developer, or another agency running a channel we don’t. We define the seams up front — who owns what, where access sits, how handoffs happen — so nothing falls into the gap between two teams.',
  },
  {
    category: 'Process',
    question: 'What if my inquiry fails to send, or I’m offline?',
    answer:
      'Nothing is lost. If you’re offline or the connection drops mid-send, the contact form queues your submission on your device — resume file included — and sends it automatically the moment you’re back online. You’ll see a confirmation once it goes through, and resending an unchanged form won’t create a duplicate on our side.',
    links: [{ label: 'Contact form', href: '/contact' }],
  },

  // ── Pricing ───────────────────────────────────────────────────────────────
  {
    category: 'Pricing',
    question: 'Do you publish pricing or offer fixed packages?',
    answer:
      'No. Every engagement is scoped to your goals, deliverables, and timeline, so pricing is proposal-based. What we do instead is give you options at different investment levels for the same objective, so you’re choosing a scope rather than guessing at a number.',
  },
  {
    category: 'Pricing',
    question: 'Can you work within a defined budget?',
    answer:
      'Yes, and telling us the range early makes scoping faster, not worse. We shape the work around the highest-impact deliverables and phase the rest, which cleanly separates what genuinely has to happen now from what can wait without hurting the outcome.',
  },
  {
    category: 'Pricing',
    question: 'What drives the cost of a website project?',
    answer:
      'Page and template count, how much strategy and UX the project needs, custom functionality, integrations (CRM, bookings, payments, email), automation, and performance or SEO requirements. Content readiness matters as much as any of it: if copy, photography, or video still has to be created, that changes both the effort and the timeline.',
    links: [{ label: 'Website services', href: '/services/websites' }],
  },
  {
    category: 'Pricing',
    question: 'What drives the cost of video production?',
    answer:
      'Three stages, each with its own variables. Pre-production: concept, scripting, shot list, scheduling, locations. Production: shoot days, crew size, equipment, talent, permits, travel. Post-production: edit time, motion graphics, sound design, colour, and the number of final versions cut for each platform. We scope all three up front so the budget matches both the creative ambition and the distribution plan.',
    links: [{ label: 'Production services', href: '/services/production' }],
  },
  {
    category: 'Pricing',
    question: 'How does ad spend work versus your management fee?',
    answer:
      'They’re separate. Ad spend goes directly to Google, Meta, or LinkedIn and sits on accounts you own. Our fee covers strategy, campaign build, creative and copy where included, tracking and conversion setup, ongoing optimization, and reporting — measured against business outcomes like leads, bookings, and purchases, not clicks.',
  },
  {
    category: 'Pricing',
    question: 'Do you offer monthly retainers?',
    answer:
      'Yes — for ongoing marketing, content, social, and website care. A retainer sets an agreed monthly deliverable cadence, regular reporting, and continuous optimization, with priorities reset each month against results, seasonality, and what the business actually needs next.',
  },
  {
    category: 'Pricing',
    question: 'How does payment usually work?',
    answer:
      'Most projects start with an approved proposal, a signed agreement, and a deposit that reserves production time. Larger engagements are split into milestone payments tied to phases — strategy, design, development, production, launch. Retainers are billed monthly.',
  },
  {
    category: 'Pricing',
    question: 'Is there a minimum project size?',
    answer:
      'No formal minimum. Single deliverables — one shoot, one landing page, one audit — are welcome, and several of our longest engagements started exactly that way. What we will tell you honestly is when a budget can’t reach the outcome you’re describing, so you’re not spending into a result that was never going to arrive.',
  },

  // ── Contracts ─────────────────────────────────────────────────────────────
  {
    category: 'Contracts',
    question: 'How do proposals, scope, and deliverables get defined?',
    answer:
      'After discovery we translate your goals into a written scope: the exact deliverables, project milestones, timeline, and what is explicitly out of scope. Approval points and acceptance criteria go in the same document, so everyone agrees on what “done” means before production starts.',
  },
  {
    category: 'Contracts',
    question: 'Who owns the final deliverables and source files?',
    answer:
      'You own the final approved deliverables produced for you, and ownership is stated plainly in your proposal. Editable source files and raw material — project files, unused footage — are handled per the agreed scope and are often an add-on. Any third-party licensed elements (fonts, plugins, stock assets, music) stay subject to their original licence terms.',
    links: [{ label: 'Terms of service', href: '/terms-of-service' }],
  },
  {
    category: 'Contracts',
    question: 'Can you work under an NDA?',
    answer:
      'Yes. If your project needs an NDA or specific confidentiality terms, we confirm the requirements during discovery and write them into the agreement — including any restriction on showing the work publicly in our archive, on social, or in a future case study.',
  },
  {
    category: 'Contracts',
    question: 'Do you require a deposit before work begins?',
    answer:
      'Yes. An approved proposal, a signed agreement, and an initial deposit reserve production time and start the planning work. The exact structure depends on scope and timeline; larger projects move to milestone-based payments tied to each phase.',
  },
  {
    category: 'Contracts',
    question: 'What happens if we need to change scope mid-project?',
    answer:
      'Tell us early. Small adjustments inside the agreed direction are normal and absorbed. Anything that adds deliverables, revision rounds, or shoot time gets a written change with its cost and timeline impact before work continues — never a surprise line on the final invoice.',
  },
  {
    category: 'Contracts',
    question: 'What if we need to pause or cancel?',
    answer:
      'Pauses happen — a shoot gets weathered out, a launch slips, priorities move — and we reschedule where we can. Cancellation terms, including what’s owed for work already completed and any non-recoverable booking or licensing costs, are set out in your agreement so neither side is guessing after the fact.',
  },
  {
    category: 'Contracts',
    question: 'Can we reuse the photos, video, or code on this website?',
    answer:
      'Everything published here — photography, video, design, code, and copy — is owned by Perseus or licensed to us, and isn’t free to reuse. The License page sets out exactly what’s permitted, what isn’t, and how to request permission; the Terms of Service cover everything else about using the site.',
    links: [
      { label: 'License', href: '/license' },
      { label: 'Terms of service', href: '/terms-of-service' },
    ],
  },

  // ── Marketing ─────────────────────────────────────────────────────────────
  {
    category: 'Marketing',
    question: 'Do you offer SEO?',
    answer:
      'Yes — technical SEO, on-page optimization, keyword and intent research, content strategy, and local search. It’s also built into every site we ship: clean structure, fast loads, honest metadata, and structured data are part of the build rather than a phase bolted on afterwards.',
    links: [{ label: 'SEO service', href: '/services/digital-marketing/seo' }],
  },
  {
    category: 'Marketing',
    question: 'Which paid channels do you run?',
    answer:
      'Google Ads, Meta Ads, and LinkedIn Ads, scoped to where your buyers actually are rather than sold as a bundle. Search intent, paid social, and B2B targeting each solve a different problem — we’ll tell you which ones your funnel needs and, just as usefully, which ones it doesn’t.',
    links: [
      { label: 'Google Ads', href: '/services/digital-marketing/google-ads' },
      { label: 'Meta Ads', href: '/services/digital-marketing/meta-ads' },
      {
        label: 'LinkedIn Ads',
        href: '/services/digital-marketing/linkedin-ads',
      },
    ],
  },
  {
    category: 'Marketing',
    question: 'How soon should we expect results?',
    answer:
      'Honest answer, per channel: paid can move within weeks because you’re buying attention, while SEO compounds over months because you’re earning it. We set the expectation per channel at the start and report against that, not against a best case nobody planned for.',
  },
  {
    category: 'Marketing',
    question: 'How do you set up tracking and attribution?',
    answer:
      'Before spend, not after. Conversion actions are defined against real business outcomes, then implemented through analytics and tag management with lead and call attribution wired in — so reporting shows which traffic, campaigns, and pages actually create value rather than which ones generate traffic.',
    links: [
      {
        label: 'Tracking & analytics',
        href: '/services/digital-marketing/tracking-analytics',
      },
    ],
  },
  {
    category: 'Marketing',
    question: 'What conversion actions should we track?',
    answer:
      'It depends on your model, but the usual set is form submissions, quote requests, phone clicks, bookings, purchases, signups, downloads, and key button clicks. We separate primary from secondary conversions so the reporting doesn’t treat a newsletter signup the same way it treats a booked job.',
  },
  {
    category: 'Marketing',
    question: 'How do you approach CRO after launch?',
    answer:
      'As a loop, not a project. Define the conversions that matter, confirm the tracking is honest, then read real behaviour — traffic sources, drop-off points, click paths, form performance — to find where conversions leak. We prioritize the highest-impact fixes (copy, layout, UX, speed, CTAs, funnel steps) and measure each one against the outcome instead of a vanity metric.',
    links: [
      {
        label: 'Conversion rate optimization',
        href: '/services/digital-marketing/conversion-rate-optimization',
      },
    ],
  },
  {
    category: 'Marketing',
    question: 'Do you work with our existing ad and analytics accounts?',
    answer:
      'We prefer it. Accounts should stay in your name so the data, spend history, and algorithmic learning remain yours if we ever part ways. We audit what’s already there, fix the tracking, and build on it rather than opening a fresh account for our own convenience.',
  },
  {
    category: 'Marketing',
    question: 'Do we need a large budget to start?',
    answer:
      'No. Budget size matters far less than whether the tracking is honest and the spend is pointed at channels your buyers actually use. A modest budget aimed at the right intent beats a large one spread thin across every platform.',
  },
  {
    category: 'Marketing',
    question: 'How do video and visuals improve conversion?',
    answer:
      'By reducing decision friction. Good video and photography show proof — the work, the space, the process, the people — faster than any paragraph can, and they hold attention long enough for someone to act. Placed at the hero, the key service explanation, testimonials, and beside the call to action, they carry visitors through the decision. We also optimize delivery so they don’t cost you load speed.',
    links: [{ label: 'Production services', href: '/services/production' }],
  },

  // ── Technical ─────────────────────────────────────────────────────────────
  {
    category: 'Technical',
    question: 'What do you build websites on?',
    answer:
      'WordPress when a client-friendly CMS is the priority, and modern stacks — Next.js, React, TypeScript, Node — when performance, custom functionality, or scale are. The right choice depends on how you want to edit content, how fast the site has to be, and which integrations it has to carry. This site runs on the second option, so you can judge the output before committing to it.',
    links: [
      {
        label: 'Website development',
        href: '/services/websites/website-development',
      },
    ],
  },
  {
    category: 'Technical',
    question: 'Do you build web applications, not just marketing sites?',
    answer:
      'Yes — dashboards, client portals, booking and inventory tools, and custom internal systems, built on the same stack with real authentication, databases, and role-based access rather than a page builder stretched past its limits.',
    links: [
      { label: 'Web applications', href: '/services/websites/web-applications' },
    ],
  },
  {
    category: 'Technical',
    question: 'Can you migrate or rebuild an existing website?',
    answer:
      'Yes, and preserving what already works is part of the job: a content audit, improved structure, a mapped URL redirect plan so rankings survive the move, modernized design, faster loads, and a cleaner editing setup for the next few years.',
    links: [
      { label: 'Website redesign', href: '/services/websites/website-redesign' },
    ],
  },
  {
    category: 'Technical',
    question: 'Do you build integrations, automations, or AI workflows?',
    answer:
      'Yes — lead capture and routing, CRM handoffs, email and SMS notifications, booking flows, payment systems, and internal task automation. For AI-assisted workflows we set explicit guardrails around what data is used, how conversations are logged, and when a human takes over, so automation supports your team instead of quietly speaking for it.',
  },
  {
    category: 'Technical',
    question: 'Do you build accessible, mobile-friendly websites?',
    answer:
      'Mobile-first and responsive as standard, with accessibility practices aligned to the WCAG guidelines — semantic structure, keyboard operability, visible focus states, colour contrast, and meaningful alt text. Where a project needs a formal conformance target, we scope the audit and remediation explicitly rather than implying coverage we haven’t tested.',
  },
  {
    category: 'Technical',
    question: 'How do you handle site speed and Core Web Vitals?',
    answer:
      'As a build requirement, not a post-launch cleanup. Modern image formats with responsive variants, deferred non-critical JavaScript, and measured field data after launch rather than a one-off lab score. We also run performance and SEO audits as a standalone service for sites we didn’t build.',
    links: [
      {
        label: 'Performance & SEO audit',
        href: '/services/websites/performance-seo-audit',
      },
    ],
  },
  {
    category: 'Technical',
    question: 'What security measures come with a website?',
    answer:
      'SSL/TLS, hardened security response headers, role-based admin access, regular backups, and ongoing platform and dependency updates. The aim is to limit who can change what, reduce exposure to the common attacks, and make recovery quick if something does go wrong.',
  },
  {
    category: 'Technical',
    question: 'Do you implement SEO fundamentals and structured data?',
    answer:
      'Yes — semantic markup, clean URLs, accurate metadata, XML sitemaps, and schema that matches what’s actually visible on the page: Organization or LocalBusiness, services, articles, and FAQs where a real FAQ exists. We don’t mark up content that isn’t there, because that’s the kind of shortcut that costs you the listing later.',
  },
  {
    category: 'Technical',
    question: 'Do you handle hosting, domains, and DNS?',
    answer:
      'We can run hosting, DNS, SSL, and the deployment pipeline end to end, or hand the build over to infrastructure you already own. Either way, accounts stay in your name and you’re never left to wire up the technical layer alone.',
  },

  // ── Support ───────────────────────────────────────────────────────────────
  {
    category: 'Support',
    question: 'Do you offer ongoing website maintenance after launch?',
    answer:
      'Yes. Ongoing care covers platform and dependency updates, security patching, backups, uptime and basic monitoring, and performance checks — plus content edits and improvements as the business changes.',
    links: [
      {
        label: 'Website maintenance',
        href: '/services/websites/website-maintenance',
      },
    ],
  },
  {
    category: 'Support',
    question: 'What does ongoing support actually include?',
    answer:
      'Keeping the site reliable and making it better. Updates and security hygiene, backups and monitoring for stability, speed checks, and a clear workflow for requests like content edits, new sections, or campaign landing pages. Analytics signals — what people click, where they drop off, which pages convert — guide what we improve next, so changes follow behaviour rather than opinion.',
  },
  {
    category: 'Support',
    question: 'Will our team be able to edit the website after launch?',
    answer:
      'Yes. Text, images, and standard page content are yours to change without breaking the structure or the SEO foundations, and we hand over with the right access, a walkthrough, and a documented editing workflow. Structural changes, new features, and complex integrations stay development work.',
  },
  {
    category: 'Support',
    question: 'How do support requests and turnaround work?',
    answer:
      'Through a shared, tracked system rather than scattered emails, so the status of every request is visible. Urgent issues — downtime, a security problem, a broken form — are prioritized immediately; routine edits and updates are scheduled and delivered within the turnaround agreed for your engagement.',
  },
  {
    category: 'Support',
    question: 'Can support go beyond maintenance?',
    answer:
      'That’s the point of it. Ongoing engagements regularly include new landing pages, content updates, SEO refinement, speed work, conversion improvements, new integrations, and campaign-specific builds. The site is a business asset that should keep evolving, not a project that ended at launch.',
  },
  {
    category: 'Support',
    question: 'What happens if we stop working together?',
    answer:
      'You keep everything you own — accounts, domains, the site, the deliverables. We hand over access, document what lives where, and brief whoever takes it on where that’s useful. Nothing is registered in our name to make leaving harder.',
  },

  // ── Industries ────────────────────────────────────────────────────────────
  {
    category: 'Industries',
    question: 'Which industries do you work with?',
    answer:
      'The archive currently spans real estate, construction & trades, hospitality & events, sports & fitness, health & wellness, retail & e-commerce, home services, boats & yachts, and energy & infrastructure — plus personal brands and service businesses that don’t fit a tidy label.',
    links: [{ label: 'Work by industry', href: '/projects' }],
  },
  {
    category: 'Industries',
    question: 'Do you specialize in real estate marketing content?',
    answer:
      'Yes, and it’s the most represented category in our archive: listing and architectural films, MLS-ready photography, aerial coverage, 3D floor plans, and Matterport virtual tours — delivered horizontal for listings and websites, vertical for social. We can also wire the assets into listing pages and ad funnels so they drive showings rather than just views.',
    links: [
      {
        label: 'Virtual tours & Matterport',
        href: '/services/production/virtual-tours-matterport',
      },
      { label: 'Production work', href: '/projects/production' },
    ],
  },
  {
    category: 'Industries',
    question: 'Do you work with construction and renovation companies?',
    answer:
      'Yes — multi-visit build series documenting craftsmanship, progress, and before/after transformation, plus finished-project coverage that builds trust with the next client. Paired with an SEO-ready site and service-area pages, that content is what turns local searches into qualified inquiries.',
  },
  {
    category: 'Industries',
    question: 'Do you create fitness, sports, and events content?',
    answer:
      'Yes. Facility and club tours, brand commercials, event coverage, and short-form social cutdowns built for energy and community — connected to landing pages, clear booking or signup calls to action, and tracking, so you can see what actually drives sign-ups rather than what merely got views.',
  },
  {
    category: 'Industries',
    question: 'Do you support local SEO and neighbourhood targeting?',
    answer:
      'Yes: service-area and location pages, business-listing alignment, relevant local structured data, and the trust signals that matter locally — clearly stated service areas, proof of work, and reviews surfaced where buyers actually look. The goal is calls and booked jobs, not impressions.',
    links: [{ label: 'SEO service', href: '/services/digital-marketing/seo' }],
  },
  {
    category: 'Industries',
    question: 'Can you support multi-location businesses?',
    answer:
      'Yes. Each location gets its own indexable page with its own address, service area, hours, and proof of work, tied together by one clear navigation structure and consistent business listings — so locations rank for their own neighbourhoods instead of competing with each other. Reporting can be split per location so you can see which ones are actually producing.',
  },
  {
    category: 'Industries',
    question: 'Do you support multilingual or multi-regional websites?',
    answer:
      'Yes — dedicated URLs per language or region, hreflang implementation, translated page content, localized SEO metadata, and region-appropriate policy language where it’s required. We also agree the update workflow up front, so the versions don’t quietly drift apart six months after launch.',
  },
  {
    category: 'Industries',
    question: 'What if our business is niche or hard to explain?',
    answer:
      'That’s usually a positioning problem rather than a marketing one, and it’s work we enjoy. We start with the business model, the buying process, and the trust signals that matter in your category, then make the offer legible without flattening the expertise behind it.',
    links: [
      {
        label: 'Brand strategy & positioning',
        href: '/services/branding/brand-strategy-positioning',
      },
    ],
  },

  // ── Careers ───────────────────────────────────────────────────────────────
  {
    category: 'Careers',
    question: HIRING_FAQ_QUESTION,
    answer:
      'Yes — the open roles are listed on the careers page, each with location, type, level, and who it suits. Roles we’ve already filled stay on the page marked “Position filled” rather than disappearing, so you can see what the team looks like — you just can’t apply into a posting that’s closed.',
    links: [{ label: 'Open roles', href: '/contact/careers' }],
  },
  {
    category: 'Careers',
    question: 'How do I apply?',
    answer:
      'Through the “Join the team” tab on the contact page. Applying from a specific listing pre-selects the role for you. You’ll need your name, email, phone, and a resume as a PDF or Word file up to 4 MB; a portfolio link, LinkedIn, and a short cover note are optional but they do get read.',
    links: [
      { label: 'Open roles', href: '/contact/careers' },
      { label: 'Apply now', href: '/contact' },
    ],
  },
  {
    category: 'Careers',
    question: 'Can I apply when nothing on the list fits?',
    answer:
      'Yes — choose “General application” as the role and tell us what you do and where you think you’d fit. Strong applications stay on file, and we go back to them first when a role opens.',
    links: [{ label: 'General application', href: '/contact' }],
  },
  {
    category: 'Careers',
    question: REMOTE_FAQ_QUESTION,
    answer:
      'Every role we list is remote, and each listing states whether it’s full-time, part-time, or subcontract, along with its level and expected start. Production roles involve on-location work depending on where the shoot is.',
    links: [{ label: 'See role details', href: '/contact/careers' }],
  },
  {
    category: 'Careers',
    question: 'What happens after I apply?',
    answer:
      'Your application lands directly with the team — there’s no automated screening filter between you and a person. If there’s a fit, someone reaches out to arrange a conversation. We do reply, though it can take longer if a role has just closed.',
  },
  {
    category: 'Careers',
    question: 'Do you work with freelancers and subcontractors?',
    answer:
      'Yes. Several listed roles are subcontract or project-based, and we keep a bench of specialists we bring onto productions and builds. Apply through the same form and put your availability and rate expectations in the cover note.',
    links: [{ label: 'Subcontract roles', href: '/contact/careers' }],
  },

  // ── Privacy ───────────────────────────────────────────────────────────────
  {
    category: 'Privacy',
    question: 'What information does this site collect?',
    answer:
      'What you send us, plus standard analytics. The contact and careers forms collect the details you enter — name, email, phone, company or role, links, your message, and a resume for applications. The privacy policy sets out every field, how long it’s kept, and which processors receive it.',
    links: [{ label: 'Privacy policy', href: '/privacy-policy' }],
  },
  {
    category: 'Privacy',
    question: 'Do you use cookies and tracking?',
    answer:
      'Analytics and advertising tools load only after you accept them in the consent banner — Google Analytics and Tag Manager, Microsoft Clarity, and the Meta Pixel are all gated behind your choice. Vercel’s traffic and performance measurement runs without cookies. You can change your decision at any time.',
    links: [{ label: 'Cookies & tracking', href: '/privacy-policy' }],
  },
  {
    category: 'Privacy',
    question: 'Where is our data stored, and who can see it?',
    answer:
      'Form submissions are stored in a managed Postgres database and mirrored to our inbox by email. Uploaded resumes are stored privately and are only reachable by authenticated members of the team — never by a public link. The privacy policy names every processor and exactly what each one receives.',
    links: [{ label: 'Third-party processors', href: '/privacy-policy' }],
  },
  {
    category: 'Privacy',
    question: 'Can I ask you to delete my data?',
    answer:
      'Yes. Email info@perseustudio.com and we’ll delete or export what we hold. The privacy policy covers your rights under PIPEDA, Quebec’s Law 25, the GDPR, and the UK GDPR, along with how to raise a complaint if you’re not satisfied with our response.',
    links: [{ label: 'Your rights', href: '/privacy-policy' }],
  },
  {
    category: 'Privacy',
    question: 'How do you handle privacy on the websites you build?',
    answer:
      'The same principles, applied to your business. We review what personal data the site collects through forms, bookings, and payments, what tracking runs, and how consent, retention, and access are handled — then implement secure form handling, minimal collection, and a real consent setup rather than a decorative banner. For regulated work we align to the applicable regime and coordinate with your legal counsel on final policy language.',
  },
];
