import { GOOGLE_PLACE_ID } from '@/constants';

// Self-hosted Google reviews, fetched from the official Places API (New) on the
// server. The API caps reviews at 5 per place (a hard Google limit) but also
// returns the aggregate rating + total count, so the section reads honestly as
// "4.9 ★ · N reviews" and shows the 5 Google exposes.
//
// The key lives in GOOGLE_PLACES_API_KEY (server-only — never NEXT_PUBLIC_*).
// This module has no 'use client' and is only imported by the server component,
// so the key never reaches the browser bundle.

export type GoogleReview = {
  rating: number;
  text: string;
  relativeTime: string;
  publishTime: string;
  authorName: string;
  authorUrl?: string;
  authorPhoto?: string;
};

export type GoogleReviewsData = {
  rating: number;
  userRatingCount: number;
  googleMapsUri: string;
  reviews: GoogleReview[];
};

type PlacesApiReview = {
  rating?: number;
  text?: { text?: string; languageCode?: string };
  originalText?: { text?: string };
  relativePublishTimeDescription?: string;
  publishTime?: string;
  authorAttribution?: {
    displayName?: string;
    uri?: string;
    photoUri?: string;
  };
};

type PlacesApiResponse = {
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  reviews?: PlacesApiReview[];
};

const PLACES_ENDPOINT = 'https://places.googleapis.com/v1/places';
const FIELD_MASK = 'rating,userRatingCount,googleMapsUri,reviews';
// Refresh once a day. ISR caches the response so we make ~1 call/day, well
// inside the free tier, and reviews never go more than 24h stale.
const REVALIDATE_SECONDS = 60 * 60 * 24;

const devError = (...args: unknown[]) => {
  if (process.env.NODE_ENV !== 'production') console.error('[googleReviews]', ...args);
};

export async function getGoogleReviews(): Promise<GoogleReviewsData | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  // Missing key or place → silently disable the section (e.g. local dev).
  if (!apiKey || !GOOGLE_PLACE_ID) return null;

  try {
    const res = await fetch(`${PLACES_ENDPOINT}/${GOOGLE_PLACE_ID}?languageCode=en`, {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      next: { revalidate: REVALIDATE_SECONDS },
    });

    if (!res.ok) {
      devError(`Places API responded ${res.status}:`, await res.text());
      return null;
    }

    const data = (await res.json()) as PlacesApiResponse;

    const reviews: GoogleReview[] = (data.reviews ?? [])
      .map((r) => ({
        rating: r.rating ?? 0,
        text: (r.text?.text ?? r.originalText?.text ?? '').trim(),
        relativeTime: r.relativePublishTimeDescription ?? '',
        publishTime: r.publishTime ?? '',
        authorName: r.authorAttribution?.displayName ?? 'Google user',
        authorUrl: r.authorAttribution?.uri,
        authorPhoto: r.authorAttribution?.photoUri,
      }))
      .filter((r) => r.text.length > 0);

    return {
      rating: data.rating ?? 0,
      userRatingCount: data.userRatingCount ?? 0,
      googleMapsUri: data.googleMapsUri ?? '',
      reviews,
    };
  } catch (err) {
    devError('fetch failed:', err);
    return null;
  }
}
