/**
 * JSON-LD structured data for SEO: LocalBusiness, Service, and Review schemas.
 * Rendered in <head> via a small inline script so search engines can index
 * the workshop as a real physical location with services and social proof.
 */
export function StructuredData() {
  const localBusiness = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'ДРАТВА — мастерская реставрации кожи',
    image: 'https://dratva.ru/og-cover.jpg',
    '@id': 'dratva-workshop',
    url: 'https://dratva.ru',
    telephone: '+78462700000',
    priceRange: '₽₽',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'ул. Революционная, 70',
      addressLocality: 'Самара',
      addressRegion: 'Самарская область',
      postalCode: '443011',
      addressCountry: 'RU',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 53.1959,
      longitude: 50.1006,
    },
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      opens: '09:00',
      closes: '19:00',
    },
    sameAs: [],
  };

  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: 'Реставрация кожи',
    provider: { '@id': 'dratva-workshop' },
    areaServed: {
      '@type': 'City',
      name: 'Самара',
    },
    hasOfferCatalog: {
      '@type': 'Catalog',
      name: 'Услуги мастерской',
      itemCount: 5,
    },
  };

  const reviewSchema = {
    '@context': 'https://schema.org',
    '@type': 'Review',
    reviewBody:
      'Сняли старую заливку на ручках, пересобрали урез и подобрали оттенок точь-в-точь. Кромка как литая, не липнет в жару.',
    author: { '@type': 'Person', name: 'Елена Морозова' },
    reviewRating: {
      '@type': 'Rating',
      ratingValue: 5,
      bestRating: 5,
    },
    datePublished: '2026-10-18',
    itemReviewed: {
      '@type': 'Product',
      name: 'Сумка Furla из зернистой кожи',
    },
  };

  const jsonLd = JSON.stringify([localBusiness, serviceSchema, reviewSchema]);

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLd }}
    />
  );
}