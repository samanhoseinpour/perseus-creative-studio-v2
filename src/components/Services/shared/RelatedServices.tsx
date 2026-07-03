import Container from '@/components/ui/Container';
import Heading from '@/components/Heading';
import ServiceBentoCard from '@/components/Services/category/ServiceBentoCard';
import type { ServiceSummary } from '../types';

interface RelatedServicesProps {
  /** Sibling services within the same category. */
  services: ServiceSummary[];
  /** Owning category slug — builds each card's detail href. */
  categorySlug: string;
  /** Category display name, used in the eyebrow + heading. */
  categoryTitle: string;
  /** The current service's title, used in the description. */
  serviceTitle: string;
  /** Override the accent line under the heading. */
  titleAccent?: string;
}

/**
 * Shared "More <category> services" section for every service-detail template.
 * One source of truth: the photographic bento (ServiceBentoCard) first built on
 * the Production page. Renders nothing when there are no siblings. Available
 * services link to their detail page; the rest route to /contact via the card.
 */
const RelatedServices = ({
  services,
  categorySlug,
  categoryTitle,
  serviceTitle,
  titleAccent = 'From the same senior team.',
}: RelatedServicesProps) => {
  if (services.length === 0) return null;

  return (
    <section className="pb-16 sm:pb-24">
      <Heading
        titleTag="h2"
        seperatorTitle="Keep exploring"
        eyebrowRight={categoryTitle}
        title={`More ${categoryTitle.toLowerCase()} services`}
        titleAccent={titleAccent}
        description={`Other ${categoryTitle.toLowerCase()} disciplines that pair well with ${serviceTitle.toLowerCase()}.`}
        containerStyle="mb-10"
        titleStyle="max-w-3xl"
        descStyle="max-w-3xl"
      />
      <Container>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <ServiceBentoCard
              key={service.slug}
              service={service}
              categorySlug={categorySlug}
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            />
          ))}
        </div>
      </Container>
    </section>
  );
};

export default RelatedServices;
