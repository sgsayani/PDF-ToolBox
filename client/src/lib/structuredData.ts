import { absoluteUrl, SITE_NAME } from './seo';

/**
 * Schema.org builders used by `<Seo jsonLd={...}>`. Every value here comes
 * from real product facts (name, description, URL) — no ratings, review
 * counts or usage numbers, since we don't have any to report honestly.
 */

interface WebApplicationLdInput {
  name: string;
  description: string;
  path: string;
}

/** One tool's `WebApplication` entry. Free to use, no account required. */
export function webApplicationLd({ name, description, path }: WebApplicationLdInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name,
    description,
    url: absoluteUrl(path),
    applicationCategory: 'Utilities',
    operatingSystem: 'Any (runs in the browser)',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    isPartOf: {
      '@type': 'WebSite',
      name: SITE_NAME,
      url: absoluteUrl('/'),
    },
  };
}

export interface BreadcrumbItem {
  name: string;
  path: string;
}

export function breadcrumbLd(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export interface FaqItem {
  question: string;
  answer: string;
}

/** Only pass genuinely useful, product-accurate Q&A — never filler. */
export function faqPageLd(items: FaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}
