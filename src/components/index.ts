// Gateway for Components

// General Components
export { default as NotFoundComp } from './NotFoundComp';
export { default as Heading } from './Heading';
export { default as FilterRail } from './FilterRail';
export { default as Breadcrumb } from './Breadcrumb';
export type { Crumb } from './Breadcrumb';
export { default as PrevNextNav } from './PrevNextNav';
export type { PrevNextItem } from './PrevNextNav';
export { default as PaginationScroll } from './PaginationScroll';
export { default as ResultCount } from './ResultCount';
export { default as SpotLight } from './ui/SpotLight';
export { default as TextShimmer } from './ui/TextShimmer';
export { default as BorderBeam } from './ui/BorderBeam';
export { default as Navbar } from './Navbar';
export { default as ThemeProvider } from './ThemeProvider';
export { default as ThemeSwitcher } from './ThemeSwitcher';
export { default as ThemedShader } from './ui/ThemedShader';
export { default as ImageKit } from './ImageKit';
export { default as VideoKit } from './VideoKit';
export { default as Stats } from './Stats';
export { default as Button } from './Button';
export { default as Faqs } from './Faqs';
export { default as Testimonials } from './Testimonials';
export { default as HeroTextAnimation } from './ui/HeroTextAnimation';
export { default as WobbleCard } from './ui/WobbleCard';
export { default as Container } from './ui/Container';
export { default as CountUp } from './ui/CountUp';
export { default as ScrollProgress } from './ui/ScrollProgress';
export { default as ProgressiveBlur } from './ui/ProgressiveBlur';
export { default as InfiniteSlider } from './ui/InfiniteSlider';
export { default as IGFeed } from './IGFeed';
export { default as GoogleGeminiEffect } from './ui/GoogleGeminiEffect';
export { default as Team } from './Team';
export { default as Globe } from './Globe';
export { default as LayoutTextFlip } from './ui/LayoutTextFlip';
export { default as YouTube } from './YouTube';
export { default as Footer } from './Footer';
export { default as StickyToc } from './StickyToc';
export type { StickyTocSection } from './StickyToc';
export { ConsentProvider, useConsent } from './ConsentProvider';
export type { ConsentState } from './ConsentProvider';
export { default as ConsentBanner } from './ConsentBanner';
export { default as ConsentGatedAnalytics } from './ConsentGatedAnalytics';
export { ServiceWorkerRegister, OfflineBanner } from './Pwa';

// Shared sections (used across multiple routes)
export { default as Partners } from './Partners';
export { default as GoogleReviews } from './GoogleReviews';

// Home Components
export { default as Hero } from './Home/Hero';
export { default as HomeWelcome } from './Home/HomeWelcome';
export { default as FeatureProjects } from './Home/FeatureProjects';
export { default as HomeTestimonials } from './Home/HomeTestimonials';

// Contact Components
export { default as ContactForm } from './Contact/ContactForm';
export { default as ContactInfo } from './Contact/ContactInfo';

// Projects Components
// hub — /projects
export { default as ArchiveStacks } from './Projects/hub/ArchiveStacks';
// category — /projects/[category]
export { default as CaseFileIndex } from './Projects/category/CaseFileIndex';
export { default as ProjectCategoryServices } from './Projects/category/ProjectCategoryServices';
export { default as CategoryComingSoon } from './Projects/category/CategoryComingSoon';
export { default as OtherProjectCategories } from './Projects/category/OtherProjectCategories';
export { default as CategoryProof } from './Projects/category/CategoryProof';
// detail — /projects/[category]/[project] removed (to be rebuilt later)
// shared — closing band on every /projects page
export { default as NextFileCta } from './Projects/NextFileCta';

// Mdx Components
export { default as SmartLink } from './Mdx/SmartLink';
export { default as Instagram } from './Mdx/Instagram';
export { default as Image } from './Mdx/Image';
// About Components
export { default as AboutHero } from './About/AboutHero';
export { default as AboutParallaxContent } from './About/AboutParallaxContent';
export { default as Timeline } from './About/AboutTimeline';
export { default as AboutCta } from './About/AboutCta';
export { default as AboutProcess } from './About/AboutProcess';
export { default as AboutServices } from './About/AboutServices';
export { default as AboutWhyUs } from './About/AboutWhyUs';

// Services Components
// overview — /services landing page sections
export { ServicesHero } from './Services/overview/ServicesHero';
export { ServicesCategories } from './Services/overview/ServicesCategories';
export { ServicesProduction } from './Services/overview/ServicesProduction';
export { ServicesSocial } from './Services/overview/ServicesSocial';
export { ServicesEditting } from './Services/overview/ServicesEditting';
export { ServicesAds } from './Services/overview/ServicesAds';
export { ServicesWebsites } from './Services/overview/ServicesWebsites';
export { ServicesBranding } from './Services/overview/ServicesBranding';
export { ServicesCta } from './Services/overview/ServicesCta';
// category — /services/[category]
export { default as CategoryHero } from './Services/category/CategoryHero';
export { default as ServiceCategoryBento } from './Services/category/ServiceCategoryBento';
export { default as CategoryProcess } from './Services/category/CategoryProcess';
export { default as ServiceBentoCard } from './Services/category/ServiceBentoCard';
export { default as CategoryFit } from './Services/category/CategoryFit';
export { default as CategoryStats } from './Services/category/CategoryStats';
export { default as CategoryWhyUs } from './Services/category/CategoryWhyUs';
export { default as CategoryTestimonials } from './Services/category/CategoryTestimonials';
export { default as CategoryJournal } from './Services/category/CategoryJournal';
export { default as CategoryCta } from './Services/category/CategoryCta';
export { default as OtherCategories } from './Services/category/OtherCategories';
export { default as PrevNextCategory } from './Services/category/PrevNextCategory';
// detail — /services/[category]/[service]
export { ServiceDetail } from './Services/detail';
export { default as StackDiagram } from './Services/detail/StackDiagram';
export { default as MetricGauge } from './Services/detail/MetricGauge';
export { default as BuildTimeline } from './Services/detail/BuildTimeline';
export { default as BeforeAfterSlider } from './Services/detail/BeforeAfterSlider';
export { default as FlightPathMap } from './Services/detail/FlightPathMap';
export { default as ResponsiveShowcase } from './Services/detail/ResponsiveShowcase';
export { default as SerpRankClimb } from './Services/detail/SerpRankClimb';
export { default as AdPreviewCard } from './Services/detail/AdPreviewCard';
export { default as CreatorRoster } from './Services/detail/CreatorRoster';
export { default as IdentitySheet } from './Services/detail/IdentitySheet';
export { default as StorefrontMock } from './Services/detail/StorefrontMock';
export { default as FunnelChart } from './Services/detail/FunnelChart';
export { default as PillarMap } from './Services/detail/PillarMap';
export { default as GuidelinesSpread } from './Services/detail/GuidelinesSpread';
export { default as CodeToUI } from './Services/detail/CodeToUI';
export { default as ConversionAnatomy } from './Services/detail/ConversionAnatomy';
export { default as DashboardMock } from './Services/detail/DashboardMock';
export { default as UptimeMonitor } from './Services/detail/UptimeMonitor';
export { default as CoreWebVitals } from './Services/detail/CoreWebVitals';
export { default as PositioningMap } from './Services/detail/PositioningMap';
export { default as VoiceScale } from './Services/detail/VoiceScale';
export { default as Moodboard } from './Services/detail/Moodboard';
export { default as EventFlow } from './Services/detail/EventFlow';
export { default as InsightsBoard } from './Services/detail/InsightsBoard';
export { default as ContactSheet } from './Services/detail/ContactSheet';
export { default as TurntableViewer } from './Services/detail/TurntableViewer';
export { default as DollhouseTour } from './Services/detail/DollhouseTour';
export { default as MarketingSnapshotHero } from './Services/detail/MarketingSnapshotHero';
export { default as SocialFeedHero } from './Services/detail/SocialFeedHero';
export { default as BrandSpecimenHero } from './Services/detail/BrandSpecimenHero';
export { default as SiteViewport } from './Services/detail/SiteViewport';
export { default as ContentCalendar } from './Services/detail/ContentCalendar';
export { default as MarketingLevers } from './Services/detail/MarketingLevers';
export { default as ReportingPreview } from './Services/detail/ReportingPreview';
export { default as ProductionCallSheet } from './Services/detail/ProductionCallSheet';
export { default as SocialScopeBoard } from './Services/detail/SocialScopeBoard';
export { default as SocialOutcomes } from './Services/detail/SocialOutcomes';
export { default as BrandDeliverables } from './Services/detail/BrandDeliverables';
// shared — cross-page
export { default as RelatedServices } from './Services/shared/RelatedServices';
export { default as OtherCategoryServices } from './Services/shared/OtherCategoryServices';
export { default as ServicesList } from './Services/shared/ServicesList';

// Blogs Components
// listing — /blogs
export { default as BlogGrid } from './Blogs/listing/BlogGrid';
export { default as BlogHeader } from './Blogs/listing/BlogHeader';
export { default as BlogCta } from './Blogs/listing/BlogCta';
// post — /blogs/[blog]
export { default as ShareBlogs } from './Blogs/post/ShareBlogs';
export { default as TableOfContents } from './Blogs/post/TableOfContents';
export { default as SidebarCta } from './Blogs/post/SidebarCta';
// shared — blog card reused across routes + home teaser
export { default as BlogPost } from './Blogs/shared/BlogPost';
export { default as BlogPostSkleton } from './Blogs/shared/BlogPostSkleton';
export { default as FromTheBlog } from './Blogs/shared/FromTheBlog';

// Blog Post Component
