// Gateway for Components

// General Components
export { default as NotFoundComp } from './NotFoundComp';
export { default as Heading } from './Heading';
export { default as Breadcrumb } from './Breadcrumb';
export type { Crumb } from './Breadcrumb';
export { default as PrevNextNav } from './PrevNextNav';
export { default as PaginationScroll } from './PaginationScroll';
export { default as ResultCount } from './ResultCount';
// SpotLight is deliberately NOT re-exported: consumers import
// '@/components/ui/SpotLightLazy' (desktop-gated ssr:false boundary) so its
// motion springs stay out of phones' eager chunk — same rule as GlobeLazy.
export { default as TextShimmer } from './ui/TextShimmer';
export { default as BorderBeam } from './ui/BorderBeam';
export { default as Navbar } from './Navbar';
export { default as ThemeProvider } from './ThemeProvider';
export { default as Img } from './Img';
// Stats is deliberately NOT re-exported: the home page renders it through
// DeferredStats (client ssr:false + scroll-gated boundary) so its motion
// arcs/CountUp springs stay out of the eager chunk — same rule as GlobeLazy
// and SpotLightLazy.
export { default as Button } from './Button';
export { default as Faqs } from './Faqs';
export { default as Container } from './ui/Container';
export { default as ScrollProgress } from './ui/ScrollProgress';
export { default as RouteProgress } from './ui/RouteProgress';
export { default as ScrollToTop } from './ui/ScrollToTop';
export { default as IGFeed } from './IGFeed';
export { default as Team } from './Team';
// The cobe globe is deliberately NOT re-exported: consumers import
// '@/components/GlobeLazy' (client ssr:false boundary) so cobe/WebGL stays out
// of the shared eager chunk — a barrel re-export re-pins it there.
export { default as SmartLenis } from './SmartLenis';
export { default as YouTube } from './YouTube';
export { default as Footer } from './Footer';
export { default as StickyToc } from './StickyToc';
export { ConsentProvider } from './ConsentProvider';
export { default as ConsentBanner } from './ConsentBanner';
export { default as ConsentGatedAnalytics } from './ConsentGatedAnalytics';
export { ServiceWorkerRegister, OfflineBanner } from './Pwa';

// Shared sections (used across multiple routes)
export { default as DeferredPartners } from './DeferredPartners';
export { default as GoogleReviews } from './GoogleReviews';

// Home Components
export { default as Hero } from './Home/Hero';
export { default as HomeWelcome } from './Home/HomeWelcome';
export { default as FeatureProjects } from './Home/FeatureProjects';
export { default as DeferredSocialProof } from './Home/DeferredSocialProof';
export { default as DeferredStats } from './Home/DeferredStats';

// Contact Components
// (Deliberately not barrel-exported — the contact page imports ContactHubLazy,
// ContactIntro and ContactDetails by direct path, same as GlobeLazy.)

// Projects Components
// hub — /projects
export { default as ArchiveStacks } from './Projects/hub/ArchiveStacks';
// category — /projects/[category]
export { default as CaseFileIndex } from './Projects/category/CaseFileIndex';
export { default as ProjectCategoryServices } from './Projects/category/ProjectCategoryServices';
export { default as CategoryComingSoon } from './Projects/category/CategoryComingSoon';
export { default as OtherProjectCategories } from './Projects/category/OtherProjectCategories';
export { default as CategoryProof } from './Projects/category/CategoryProof';
// detail — /projects/[category]/[project] (DB-driven case-study pages)
export { default as ProjectCover } from './Projects/ProjectCover';
export { default as ProjectSlateHeader } from './Projects/detail/ProjectSlateHeader';
export { default as ProjectDossier } from './Projects/detail/ProjectDossier';
export { default as ProjectGallery } from './Projects/detail/ProjectGallery';
export { default as ProjectEmbeds } from './Projects/detail/ProjectEmbeds';
export { default as RelatedProjects } from './Projects/detail/RelatedProjects';
export { default as ProjectLocalNav } from './Projects/detail/ProjectLocalNav';
export { default as ProjectHighlights } from './Projects/detail/ProjectHighlights';
export { default as ProjectFootnotes } from './Projects/detail/ProjectFootnotes';
export { default as NextFileFooter } from './Projects/detail/NextFileFooter';
// shared — closing band on every /projects page
export { default as NextFileCta } from './Projects/NextFileCta';
// showcase — cross-route "latest projects" band (about / blog / service pages)
export { default as ProjectShowcase } from './Projects/showcase/ProjectShowcase';

// Mdx Components
export { default as SmartLink } from './Mdx/SmartLink';
export { default as Instagram } from './Mdx/Instagram';
export { default as Image } from './Mdx/Image';
export { default as HowTo, Step } from './Mdx/HowTo';
export { default as ProsCons, Pros, Cons } from './Mdx/ProsCons';
// About Components
export { default as AboutHero } from './About/AboutHero';
export { default as AboutParallaxContent } from './About/AboutParallaxContent';
export { default as Timeline } from './About/AboutTimeline';
export { default as AboutCta } from './About/AboutCta';
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
// shared — cross-page
export { default as ServicesList } from './Services/shared/ServicesList';

// Blogs Components
// listing — /blogs
export { default as BlogGrid } from './Blogs/listing/BlogGrid';
// post — /blogs/[blog]
export { default as ShareBlogs } from './Blogs/post/ShareBlogs';
export { default as TableOfContents } from './Blogs/post/TableOfContents';
export { default as SidebarCta } from './Blogs/post/SidebarCta';
export { default as KeyTakeaways } from './Blogs/post/KeyTakeaways';
export { default as SourcesList } from './Blogs/post/SourcesList';
export { default as ArticleFeedback } from './Blogs/post/ArticleFeedback';
// shared — post body + home teaser
export { default as BlogPost } from './Blogs/shared/BlogPost';
export { default as FromTheBlog } from './Blogs/shared/FromTheBlog';
