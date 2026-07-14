'use client';

import dynamic from 'next/dynamic';

/**
 * Lazy boundaries for every `'use client'` visual mock on the service-detail
 * pages. Import the mocks from HERE, never by direct path.
 *
 * Why this file exists — Turbopack merges every *eagerly referenced* client
 * module in the app into one chunk group that EVERY route loads. These 31 mocks
 * are reached from the five (server) category components, so before this file
 * existed the home page, /blogs, /projects and every other route downloaded
 * FlightPathMap, DashboardMock, FunnelChart, ContentCalendar and the rest —
 * ~30 motion-heavy components that only ever render on a handful of
 * /services/<category>/<service> pages. (Verified: the home page's HTML listed
 * the chunk containing FlightPathMap.)
 *
 * A `next/dynamic` call inside a *Server* Component does NOT fix this — there's
 * no client-side async boundary, so the client leaves stay in the route's entry
 * chunk group. The boundary has to live in a client module, which is what this
 * file is: each `dynamic()` below gets its own async chunk, fetched only by the
 * page that actually renders it.
 *
 * SSR stays on (the default). The server still renders the real markup, so the
 * HTML, the LCP image preload in SiteViewport and the JSON-LD are all unchanged
 * — only the JS payload moves off the critical path.
 */

export const AdPreviewCard = dynamic(() => import('./AdPreviewCard'));
export const BeforeAfterSlider = dynamic(() => import('./BeforeAfterSlider'));
export const BrandDeliverables = dynamic(() => import('./BrandDeliverables'));
export const BrandSpecimenHero = dynamic(() => import('./BrandSpecimenHero'));
export const BuildTimeline = dynamic(() => import('./BuildTimeline'));
export const CodeToUI = dynamic(() => import('./CodeToUI'));
export const ContentCalendar = dynamic(() => import('./ContentCalendar'));
export const CreatorRoster = dynamic(() => import('./CreatorRoster'));
export const DashboardMock = dynamic(() => import('./DashboardMock'));
export const DollhouseTour = dynamic(() => import('./DollhouseTour'));
export const EventFlow = dynamic(() => import('./EventFlow'));
export const FlightPathMap = dynamic(() => import('./FlightPathMap'));
export const FunnelChart = dynamic(() => import('./FunnelChart'));
export const GuidelinesSpread = dynamic(() => import('./GuidelinesSpread'));
export const IdentitySheet = dynamic(() => import('./IdentitySheet'));
export const InsightsBoard = dynamic(() => import('./InsightsBoard'));
export const MarketingLevers = dynamic(() => import('./MarketingLevers'));
export const MarketingSnapshotHero = dynamic(
  () => import('./MarketingSnapshotHero'),
);
export const MetricGauge = dynamic(() => import('./MetricGauge'));
export const PillarMap = dynamic(() => import('./PillarMap'));
export const PositioningMap = dynamic(() => import('./PositioningMap'));
export const ReportingPreview = dynamic(() => import('./ReportingPreview'));
export const SerpRankClimb = dynamic(() => import('./SerpRankClimb'));
export const SiteViewport = dynamic(() => import('./SiteViewport'));
export const SocialFeedHero = dynamic(() => import('./SocialFeedHero'));
export const SocialOutcomes = dynamic(() => import('./SocialOutcomes'));
export const SocialScopeBoard = dynamic(() => import('./SocialScopeBoard'));
export const StackDiagram = dynamic(() => import('./StackDiagram'));
export const StorefrontMock = dynamic(() => import('./StorefrontMock'));
export const TurntableViewer = dynamic(() => import('./TurntableViewer'));
export const VoiceScale = dynamic(() => import('./VoiceScale'));
