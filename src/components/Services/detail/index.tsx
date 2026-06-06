import type { ServiceDetailContent } from '../types';
import ProductionServiceDetail from './ProductionServiceDetail';
import WebsitesServiceDetail from './WebsitesServiceDetail';
import MarketingServiceDetail from './MarketingServiceDetail';
import SocialServiceDetail from './SocialServiceDetail';
import BrandingServiceDetail from './BrandingServiceDetail';

/**
 * Picks the per-category detail component for /services/[category]/[service].
 * Switching on the `categorySlug` discriminant narrows the union, so each
 * component receives its exact content type with no casts. Add a category =
 * add its content type + a case here.
 */
export function ServiceDetail({ data }: { data: ServiceDetailContent }) {
  switch (data.categorySlug) {
    case 'production':
      return <ProductionServiceDetail data={data} />;
    case 'websites':
      return <WebsitesServiceDetail data={data} />;
    case 'digital-marketing':
      return <MarketingServiceDetail data={data} />;
    case 'social':
      return <SocialServiceDetail data={data} />;
    case 'branding':
      return <BrandingServiceDetail data={data} />;
  }
}
