import { useCallback } from 'react';

// Vendor-agnostic analytics shim.
//
// Currently a no-op + console.debug in dev so events are visible while
// developing. Swap the implementation later to forward to PostHog,
// Mixpanel, Amplitude, GA4, Segment, etc. without touching call sites.
//
// Conventions:
// - Event names use snake_case with a domain prefix: `dashboard_cta_click`.
// - Properties are flat (one level), values are JSON-serialisable primitives.

export type AnalyticsEvent =
  | 'dashboard_view'
  | 'dashboard_cta_click'
  | 'dashboard_widget_action'
  | 'dashboard_customize_open'
  | 'dashboard_customize_toggle'
  | 'dashboard_customize_reorder'
  | 'dashboard_customize_reset'
  | 'dashboard_vehicle_open'
  | 'dashboard_add_vehicle'
  | 'language_change';

interface AnalyticsAPI {
  track: (event: AnalyticsEvent, props?: Record<string, unknown>) => void;
  identify: (userId: string | null, traits?: Record<string, unknown>) => void;
}

declare global {
  interface Window {
    // Allow downstream apps / runtime injection to provide a real client.
    __analytics?: AnalyticsAPI;
  }
}

const isDev = typeof import.meta !== 'undefined'
  && (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV;

export const useAnalytics = () => {
  const track = useCallback<AnalyticsAPI['track']>((event, props) => {
    if (typeof window !== 'undefined' && window.__analytics) {
      window.__analytics.track(event, props);
      return;
    }
    if (isDev) {
      console.debug('[analytics]', event, props ?? {});
    }
  }, []);

  const identify = useCallback<AnalyticsAPI['identify']>((userId, traits) => {
    if (typeof window !== 'undefined' && window.__analytics) {
      window.__analytics.identify(userId, traits);
    }
  }, []);

  return { track, identify };
};
