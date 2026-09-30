'use client';

import { CONZEX_CLOUD_PRODUCTION_URL } from '@idrac/shared';

/** Customer-facing cloud URL in Conzex SaaS (never localhost in UI). */
export function displayCloudUrl(apiUrl?: string | null): string {
  if (!apiUrl || apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1')) {
    return CONZEX_CLOUD_PRODUCTION_URL;
  }
  return apiUrl.replace(/\/$/, '');
}
