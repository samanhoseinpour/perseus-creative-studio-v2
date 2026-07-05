// FAQ page copy. Split out of constants/index.ts so the client-bundled FaqList
// (and every route, via the shared chunk group) stops shipping the full Q&A set;
// the /frequently-asked-questions page passes these to <FaqList items={...}>.
import type { FAQItem } from '@/components/FaqList';

export const faqItems: FAQItem[] = [
  // Services Questions
  {
    category: 'Services',
    question: 'What services does Perseus Creative Studio offer?',
    answer:
      'Perseus Creative Studio brings together brand strategy and identity, website design/development, photo and video production, and also highlights SEO, Google Ads, Meta Ads, LinkedIn Ads, tracking/analytics, CRO, and social media management—so strategy, creative, performance, reporting, and multi-channel digital marketing.',
  },
  {
    category: 'Services',
    question: 'Do you provide brand strategy and positioning?',
    answer:
      'Yes, Perseus provides Brand Strategy & Identity and describes positioning work that clarifies what you sell, who you’re for, and why customers should choose you. The goal is consistency across your website, ads, and social presence, so brand decisions translate into measurable outcomes instead of disconnected creative. ',
  },
  {
    category: 'Services',
    question: 'Can you create a full brand identity (logo + guidelines)?',
    answer:
      'Perseus’s services include logo/visual identity and branding deliverables designed to keep your brand consistent everywhere it shows up. We also provide “visual identity systems” and brand guidelines—useful if you need a complete identity package rather than a single logo file.',
  },
  {
    category: 'Services',
    question: 'What types of websites do you build?',
    answer:
      'Perseus delivers custom website development across WordPress and modern stacks, such as Next.js/Node.js, with a focus on performance, conversion, SEO-ready structure, funnel optimization, automation/workflows, analytics, and ongoing support, so the site can function as a growth channel, not a static brochure.',
  },
  {
    category: 'Services',
    question: 'Do you handle UX and website strategy before design?',
    answer:
      'Yes. Perseus explicitly provides “Website Strategy & UX” as part of the website lifecycle, framing it as clarifying goals, structuring pages, and designing journeys that turn visitors into qualified leads.',
  },
  {
    category: 'Services',
    question: 'Do you offer SEO services?',
    answer:
      'Perseus lists SEO as one of its core marketing services and positions web builds as “SEO-ready,” incorporating clean URLs, metadata, and performance considerations. The SEO service itself focuses on keyword research, on-page optimization, technical SEO audits, and ongoing strategy to improve search rankings and organic traffic.',
  },
  {
    category: 'Services',
    question: 'Do you manage paid ads like Google Ads and Meta Ads?',
    answer:
      'Yes. Perseus’s Services page explicitly lists Google Ads, Meta Ads, and LinkedIn Ads under “SEO & Paid Ads,” alongside tracking/analytics, CRO, Data-driven optimization, audience targeting, and conversion-focused campaigns across digital platforms.',
  },
  {
    category: 'Services',
    question: 'Do you offer social media management?',
    answer:
      'Perseus lists Social Media Management and describes a structured approach: social strategy and content pillars, content calendars/scheduling, posting and community management, creator collaborations, and reporting/insights.',
  },
  {
    category: 'Services',
    question: 'Do you produce video and photography (including drone)?',
    answer:
      'Yes. Perseus promotes cinematic videography, photography, aerial production, and post-production services, positioning content as “built for distribution” across websites, ads, and social.',
  },
  {
    category: 'Services',
    question: 'Do you create 3D models and 360° tours (Matterport)?',
    answer:
      'Perseus offers “3D Models & 360 Tours” among production services, and specifically real-estate deliverables such as MLS imagery, 3D floor plans, and virtual tours.',
  },
  {
    category: 'Services',
    question: 'Do you set up analytics, tracking, and reporting?',
    answer:
      'Perseus sets up “Tracking & Analytics” on your Website and includes “Performance & Analytics” within the website lifecycle, positioning measurement as part of the build, not an afterthought.',
  },
  {
    category: 'Services',
    question: 'Can you help us choose which services we need first?',
    answer:
      'Yes. We help prioritize the right starting point based on your goals, current brand assets, website performance, content needs, and marketing channels. Some clients need strategy and positioning first, while others benefit most from a stronger website, better creative assets, paid ads, SEO, or ongoing content. We’ll recommend a practical sequence so the work builds momentum instead of becoming scattered.',
  },
  // About Questions
  {
    category: 'About',
    question: 'Where is Perseus based, and where do you work?',
    answer:
      'Perseus is based in Vancouver, with the studio available by appointment. From there we work with clients across seven countries—either in person when it makes sense or fully remotely with clear scheduling across time zones.',
  },
  {
    category: 'About',
    question: 'When was Perseus founded?',
    answer:
      'Perseus was founded in January 2024. We started with a clear mission: helping small businesses and personal brands stand out through creativity, strategy, and storytelling—and we’ve grown from early design and media projects into broader, full-service work across industries and locations, including travel for production.',
  },
  {
    category: 'About',
    question: 'What industries do you work with?',
    answer:
      'We work across real estate, construction, fitness, events, hospitality, lifestyle and luxury, health and beauty/wellness, as well as retail and showroom brands—including specialized projects like boats and yachts, venues, and other service-based businesses.  ',
  },
  {
    category: 'About',
    question: 'What is your project process from start to finish?',
    answer:
      'Our process follows six clear phases: Discover, Strategize, Create, Develop, Refine, and Deliver & Support. We start by understanding your goals, audience, and brand, then build a strategy and scope with timelines and priorities. Next, we create the concepts and content, develop the final assets (like websites, campaigns, or media), and refine everything through structured feedback and approvals. After launch, we support delivery with updates, performance tracking, and ongoing optimization options so the work keeps improving—not just going live.',
  },
  {
    category: 'About',
    question: 'What makes Perseus different from a traditional agency?',
    answer:
      'Perseus combines strategy, creative production, website development, and performance marketing under one studio model. That means the same team can connect brand direction, content, web experience, analytics, and campaigns instead of treating them as separate deliverables. The focus is practical execution with a high creative standard and clear business outcomes.',
  },
  // Projects Questions
  {
    category: 'Projects',
    question: 'Where can I see examples of your work?',
    answer:
      'You can see examples of our work in the Projects section, where we share curated highlights across industries like construction, real estate, fitness, events, and retail/showrooms. If you want examples tailored to your niche and the exact deliverables you need (web, media, branding, or ads), contact us and we’ll share the most relevant references.',
  },
  {
    category: 'Projects',
    question:
      'What deliverables do you typically provide for a website project?',
    answer:
      'For a typical website project, we deliver the full set of assets needed to plan, build, launch, and grow the site: sitemap and page structure, wireframes and UX flows, visual design (including a design system/components), fully developed pages, mobile optimization, SEO foundations, and analytics/tracking setup. We also provide a launch checklist and post-launch support, and if needed we can include automations and integrations like forms, CRM/email workflows, booking tools, and other third-party systems.',
  },
  {
    category: 'Projects',
    question: 'How long do projects usually take?',
    answer:
      'Timelines depend on scope, feedback speed, and production complexity, but we set clear ranges upfront and confirm exact milestones in your proposal. As a general guide: branding and design projects often take a few weeks; website builds typically take several weeks to a few months depending on pages, features, and integrations; and video/photo productions usually run a few weeks from planning through filming and post-production.',
  },
  {
    category: 'Projects',
    question: 'Do you share results, reporting, or performance outcomes?',
    answer:
      'Yes. We track performance based on what “results” mean for your goals—such as qualified leads and inquiries, bookings, sales actions, engagement, or conversion rate improvements. For campaigns and ongoing work, we share reporting on a regular cadence and translate the data into clear next steps. For websites, we also monitor post-launch behavior and use insights (traffic sources, drop-off points, form completion, and key actions) to guide refinements and conversion improvements over time.',
  },
  {
    category: 'Projects',
    question: 'Do you offer testimonials or client feedback references?',
    answer:
      'Yes. We can share client testimonials and feedback, and we can also provide relevant references when appropriate—matched to your industry and the type of work you’re considering (website, branding, media, or marketing).',
  },
  {
    category: 'Projects',
    question: 'Can you create a custom case study for a specific industry?',
    answer:
      'Yes. If you are evaluating work in a specific industry or service category, we can share relevant project examples and explain the strategy, deliverables, production approach, and outcomes behind them. This helps you understand how a similar engagement could be structured for your business rather than reviewing generic portfolio work.',
  },
  {
    category: 'Projects',
    question: 'Do you integrate projects with other tools and platforms?',
    answer:
      'Yes. We can connect websites, landing pages, forms, campaigns, and reporting systems with the tools your business already uses, such as CRMs, booking platforms, email marketing tools, payment systems, analytics platforms, and automation workflows. Integrations are scoped based on the level of access, technical requirements, and the reliability needed after launch.',
  },
  // Contracts Questions
  {
    category: 'Contracts',
    question: 'How do we start a project with Perseus?',
    answer:
      'To start a project, send an inquiry with your goals and the type of support you need (branding/strategy, website, video/photo, social media, advertising, partnership, or hiring). After we review your request, we’ll follow up with the next steps and a tailored proposal aligned to your scope, timeline, and priorities.',
  },
  {
    category: 'Contracts',
    question: 'What information should we prepare before the first call?',
    answer:
      'Before the first call, it helps to have your goals (what you want to achieve), your target audience, your priorities and scope (what’s most important right now), your ideal timeline, and how you’ll measure success (leads, bookings, sales, engagement, etc.). If available, bring your website and social links, any brand guidelines or existing assets, access to current analytics/ads accounts, and a few competitor or reference examples you like (and what you like about them).',
  },
  {
    category: 'Contracts',
    question: 'How do proposals, scope, and deliverables get defined?',
    answer:
      'After discovery, we translate your goals into a defined scope that lists the exact deliverables, project milestones, timeline, and what’s included vs. out of scope. We also set clear approval points and acceptance criteria—so everyone agrees on what “done” means before production starts.',
  },
  {
    category: 'Contracts',
    question: 'How do revisions and approvals work?',
    answer:
      'We keep revisions structured and easy to manage. Feedback is collected in a single, consolidated place so it’s clear what’s changing and why, and approvals happen at defined checkpoints before anything goes live. Each project includes an agreed revision approach per deliverable (outlined in your proposal), and if new requests expand beyond the original scope, we flag it early and provide options for adjusting timeline and budget.',
  },
  {
    category: 'Contracts',
    question: 'Who owns the final deliverables and source files?',
    answer:
      'Ownership is defined clearly in your proposal/SOW. In most cases, you own the final approved deliverables we produce for you, while access to editable source files and raw materials is handled based on the agreed scope. Any third-party licensed elements (like fonts, plugins, stock assets, or music) remain subject to their original license terms.',
  },
  {
    category: 'Contracts',
    question: 'Can you work under an NDA or confidentiality requirements?',
    answer:
      'Yes. If your project requires an NDA or specific confidentiality terms, we can accommodate that as part of the engagement. We’ll confirm the requirements during discovery and include them in the written agreement, including any restrictions around sharing the work publicly (portfolio, case studies, or social media).',
  },
  {
    category: 'Contracts',
    question: 'Do you require a deposit before work begins?',
    answer:
      'Yes. Most projects begin with an approved proposal, signed agreement, and an initial deposit to reserve production time and start planning. The payment structure depends on the scope and timeline, and larger projects may be split into milestone-based payments tied to phases like strategy, design, development, production, and launch.',
  },
  // Pricing Questions
  {
    category: 'Pricing',
    question: 'Do you publish pricing or offer fixed packages?',
    answer:
      'We don’t publish fixed package pricing because every project is scoped to your goals, deliverables, and timeline. Pricing is proposal-based, and we can provide options at different investment levels so you can choose the scope that fits your priorities.',
  },
  {
    category: 'Pricing',
    question: 'What impacts the cost of a website project?',
    answer:
      'Website cost depends on scope and complexity—especially the number of pages/templates, the level of strategy and UX required, custom functionality, integrations (CRM, bookings, payments, email tools), automation/workflows, and performance or SEO requirements. Content readiness also matters: if copy, photos, or video need to be created, that changes the effort and timeline. Platform choice is based on your goals and how you’ll manage updates—some projects benefit from a flexible CMS setup, while others need a more custom build for speed, scalability, or unique features.',
  },
  {
    category: 'Pricing',
    question: 'What impacts the cost of video production?',
    answer:
      'Video production cost depends on the scope across three stages: pre-production (concept, scripting, shot list, scheduling), production (filming days, crew size, equipment, locations, talent, and any travel), and post-production (editing time, motion graphics, sound design, color grading, and the number of final deliverables/versions for different platforms). We scope everything transparently upfront so the budget matches the creative ambition and the distribution plan.',
  },
  {
    category: 'Pricing',
    question: 'How does paid ad spend work versus management fees?',
    answer:
      'Ad spend and management are separate. Ad spend is the budget paid directly to platforms like Google, Meta, or LinkedIn to run the ads. Our management fees cover strategy, campaign setup, creative and copy (if included), tracking and conversion setup, ongoing optimization, and reporting. We measure performance against business outcomes—like leads, bookings, purchases, or qualified inquiries—not just clicks.',
  },
  {
    category: 'Pricing',
    question: 'Do you offer monthly retainers for marketing or content?',
    answer:
      'Yes. We offer monthly retainers for ongoing marketing, content, and support—such as social media management, paid ads optimization, and website maintenance. A retainer typically includes an agreed monthly deliverable cadence, regular reporting, and continuous optimization, with priorities set each month based on results, seasonality, and your business goals.',
  },
  {
    category: 'Pricing',
    question: 'Can we bundle branding, website, and ongoing marketing?',
    answer:
      'Yes. We can bundle branding, website, and ongoing marketing into one integrated engagement. Bundling keeps the brand consistent across every touchpoint, speeds up iteration because the same team owns strategy and execution, and makes performance tracking more useful because web, ads, and social share the same analytics and goals. It also lets us reuse creative efficiently across channels—so your content works harder and stays aligned with the bigger brand story.',
  },
  {
    category: 'Pricing',
    question: 'Can you work within a defined budget?',
    answer:
      'Yes. If you have a defined budget range, we can shape the scope around the highest-priority deliverables and recommend phased options. This helps separate what should be done now from what can be added later, so the project remains realistic, focused, and aligned with the return you expect from the work.',
  },

  // Technical Questions
  {
    category: 'Technical',
    question: 'What tech stack do you use for websites?',
    answer:
      'We build on WordPress for flexible, client-friendly content management, and we also develop custom sites using modern frameworks like Next.js and Node.js when you need higher performance, advanced functionality, or a more tailored build. The right stack depends on how you want to edit content, how fast the site needs to be, what features you need, and which integrations or automations (CRM, forms, email, booking, payments) are required.',
  },
  {
    category: 'Technical',
    question: 'Do you build automations, integrations, or AI workflows?',
    answer:
      'Yes. We build automations, integrations, and AI-enabled workflows when they improve speed and consistency—such as lead capture and routing, CRM handoffs, email/SMS notifications, booking flows, and internal task automation. For AI workflows (including chatbots where appropriate), we set clear guardrails around what data is used, how conversations are logged, and when a human handoff is required—so automation supports your team without compromising quality or control.',
  },
  {
    category: 'Technical',
    question: 'What security measures do you include on websites?',
    answer:
      'We include practical security measures that protect the site after launch, not just on day one. This typically includes SSL/TLS, hardened security headers, role-based admin access, regular backups, and ongoing updates/patching. The goal is to reduce exposure to common attacks, limit who can make changes, and ensure you can recover quickly if anything goes wrong.',
  },
  {
    category: 'Technical',
    question: 'How do you handle privacy and data protection?',
    answer:
      'We treat privacy and data protection as part of the build, not an afterthought. We review what personal data your site collects (forms, bookings, payments), what tracking is used (cookies, analytics, pixels), and how consent, retention, and access are handled. Then we implement practical safeguards—like secure form handling, minimal data collection where possible, and clear cookie/consent setups when required. If your business operates across regions, we align the setup to the applicable requirements and can coordinate with your legal counsel for final compliance language and policies.',
  },
  {
    category: 'Technical',
    question: 'Do you build accessible, mobile-friendly websites?',
    answer:
      'Yes. We build websites to be mobile-first, responsive, and performance-focused as a standard. We also follow accessibility best practices aligned with WCAG guidelines—so key pages, navigation, and interactive elements are usable for a wider range of people and devices.',
  },
  {
    category: 'Technical',
    question: 'Do you implement SEO fundamentals and structured data?',
    answer:
      'Yes. We implement core SEO foundations—clean site structure, optimized metadata, fast performance, and search-friendly URLs—along with structured data where it makes sense. Common schema setups include Organization or LocalBusiness, key service pages, and other relevant markup that matches what’s visibly on the site. If you publish an FAQ hub, we can also implement FAQ structured data in a way that follows search engine guidelines and stays consistent with on-page content.',
  },
  {
    category: 'Technical',
    question: 'Can you migrate or rebuild an existing website?',
    answer:
      'Yes. We can migrate, redesign, or rebuild an existing website while preserving what already works. This can include reviewing current content, improving page structure, redirecting old URLs where needed, protecting SEO value, modernizing design, improving performance, and setting up a cleaner CMS or custom stack for future growth.',
  },

  // CRO Questions
  {
    category: 'CRO',
    question: 'Do you build landing pages and funnels designed to convert?',
    answer:
      'Yes. We build high-converting landing pages and funnels tailored to your offer—designed to turn traffic into inquiries, booked calls, and purchases. We align strategy, copy and design, development, tracking, and (when needed) automations so the funnel performs as a measurable growth channel, not just a page.',
  },
  {
    category: 'CRO',
    question: 'How do you approach CRO after launch?',
    answer:
      'After launch, we treat CRO as an ongoing improvement loop. First, we define the conversion actions that matter to your business (qualified leads, booked calls, purchases, key form submissions) and ensure tracking is set up correctly. Then we review real user behavior—traffic sources, drop-off points, click paths, and form performance—to identify where conversions are being lost. From there, we prioritize the highest-impact opportunities, implement changes (copy, layout, UX, speed, CTAs, funnel steps), and measure results over time so optimization is tied to outcomes, not vanity metrics.',
  },
  {
    category: 'CRO',
    question: 'How do video and visuals improve conversion?',
    answer:
      'High-quality video and visuals increase conversion by building trust faster and reducing decision friction. They help people understand your offer quickly, show proof of quality (work, environment, process, results), and keep visitors engaged long enough to take action. When placed strategically—hero sections, key service explanations, testimonials, and calls-to-action—visuals guide users through the journey from interest to inquiry. We also optimize media delivery so strong visuals support performance without slowing down the site.',
  },
  {
    category: 'CRO',
    question: 'What conversion actions should we track?',
    answer:
      'The right conversion actions depend on your business model, but common examples include form submissions, booked calls, phone clicks, quote requests, purchases, newsletter signups, downloads, and key button clicks. We help define primary and secondary conversions so reporting shows which traffic and pages are actually creating business value.',
  },

  // Maintenance Questions
  {
    category: 'Maintenance',
    question: 'Do you offer ongoing website maintenance after launch?',
    answer:
      'Yes. After launch, we offer ongoing maintenance to keep your site secure, fast, and up to date. This typically includes platform and plugin/framework updates, security patching, backups, uptime/basic monitoring, and performance checks—plus optional improvements and content updates as your business evolves.',
  },
  {
    category: 'Maintenance',
    question: 'What does “Care & Ongoing Support” typically include?',
    answer:
      '“Care & Ongoing Support” usually includes keeping the site reliable and improving it over time. That means ongoing updates and security hygiene, backups and monitoring for stability, performance checks to maintain speed, and a clear workflow for requests like content edits, new sections, or landing pages. We also use analytics signals—what people click, where they drop off, and which pages convert—to guide improvements so changes are driven by real user behavior, not guesswork.',
  },
  {
    category: 'Maintenance',
    question: 'Will our team be able to edit the website after launch?',
    answer:
      'Yes. Your team can edit website content after launch—things like text, images, basic pages, and updates—without breaking the site structure or SEO foundations. More advanced changes (new features, complex integrations, or structural redesigns) are handled as development work. We include a handover with the right access, a clear editing workflow, and basic guidance so you can update confidently.',
  },
  {
    category: 'Maintenance',
    question: 'How do you handle support requests and communication?',
    answer:
      'We keep communication simple and organized. You’ll have a primary point of contact, and requests are tracked in a shared system so tasks, feedback, and approvals stay clear—especially with multiple stakeholders. Turnaround depends on the request type: urgent issues (like security or site downtime) are prioritized immediately, while routine edits and updates are scheduled and delivered within an agreed timeframe based on scope and workload.',
  },
  {
    category: 'Maintenance',
    question:
      'Can you improve the website after launch instead of only maintaining it?',
    answer:
      'Yes. Maintenance can cover stability and updates, but ongoing support can also include strategic improvements such as new landing pages, content updates, SEO refinements, speed optimization, conversion improvements, integrations, and campaign-specific changes. We treat the site as a business asset that should keep evolving after launch.',
  },

  // Industries Questions
  {
    category: 'Industries',
    question: 'Do you specialize in real estate marketing content?',
    answer:
      'Yes. We produce real estate marketing content such as high-end listing and walkthrough videos, MLS-ready photography, and virtual tour assets (including 3D floor plans where needed). Deliverables can be created in multiple formats—horizontal for websites/YouTube and vertical cutdowns for social—so your content performs across channels. We can also integrate the assets into listing pages and ad funnels to drive inquiries and booked showings with a clear turnaround plan set at the start of the project.',
  },
  {
    category: 'Industries',
    question: 'Do you work with construction and renovation companies?',
    answer:
      'Yes. We work with construction and renovation companies, creating content that highlights craftsmanship, process, progress, and before/after transformations—plus finished project coverage designed to build trust. When combined with an SEO-ready website and location-targeted service pages, this content also supports local discovery and helps turn searches into qualified inquiries.',
  },
  {
    category: 'Industries',
    question: 'Do you create fitness and sports content?',
    answer:
      'Yes. We create fitness and sports content designed to capture energy, community, and performance—ranging from brand commercials to social-first short-form edits. We also connect the content to conversion by pairing it with landing pages, clear booking or inquiry calls-to-action, and performance tracking for paid social and ads so you can measure what drives sign-ups.',
  },
  {
    category: 'Industries',
    question: 'Do you support local SEO and neighborhood targeting?',
    answer:
      'Yes. We support local SEO and neighborhood-level targeting by building service-area and location pages, aligning on-page information with your business listings, and adding relevant local structured data where appropriate. We also strengthen trust signals—clear service areas, proof of work, and review/social proof integration—so local searches translate into calls, bookings, and qualified inquiries.',
  },
  {
    category: 'Industries',
    question: 'Can you support multi-location businesses?',
    answer:
      'Yes. Your team can edit website content after launch—things like text, images, basic pages, and updates—without breaking the site structure or SEO foundations. More advanced changes (new features, complex integrations, or structural redesigns) are handled as development work. We include a handover with the right access, a clear editing workflow, and basic guidance so you can update confidently.',
  },
  {
    category: 'Industries',
    question: 'Do you support multilingual or multi-regional websites?',
    answer:
      'Yes. We can build multilingual and multi-regional websites with a structure that serves the right language and region to the right visitors. That typically includes dedicated URLs per language/region, hreflang implementation, translated page content, localized SEO metadata (titles, descriptions, headings), and region-appropriate policy/compliance language where needed. We also set a clear update workflow so content changes stay consistent across all versions over time.',
  },
  {
    category: 'Industries',
    question: 'Can you adapt your work for niche or specialized businesses?',
    answer:
      'Yes. We start by learning the business model, audience, sales process, and trust signals that matter in your category. For niche or specialized industries, we focus on making the offer clear, building credibility quickly, and creating content or web experiences that explain the value without oversimplifying the expertise behind it.',
  },
];
