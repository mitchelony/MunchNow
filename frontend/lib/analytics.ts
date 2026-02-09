"use client";

import posthog from "posthog-js";

export type AnalyticsEvent =
  | "page_view"
  | "place_card_viewed"
  | "place_clicked"
  | "vote_cast"
  | "category_selected"
  | "sort_mode_selected"
  | "shuffle_click"
  | "open_in_maps_clicked"
  | "campus_selected"
  | "beta_onboarding_view"
  | "beta_onboarding_identity_submitted"
  | "beta_onboarding_open_app_clicked"
  | "beta_onboarding_apple_guide_clicked"
  | "beta_onboarding_go_trending_clicked";

export type AnalyticsContext = {
  campus?: string;
  campus_id?: number;
  sort_mode?: "best" | "closest" | "trending";
  category?: string | null;
  session_id?: string | null;
  app_version?: string | null;
};

type PlaceProps = {
  place_id: string | number;
  distance_miles?: number | null;
  rank_position?: number;
};

type EventPropsByName = {
  page_view: { pathname: string; url: string };
  place_card_viewed: PlaceProps;
  place_clicked: PlaceProps;
  vote_cast: PlaceProps & {
    vote: "worth_it" | "mid" | "skip";
  };
  category_selected: {
    category: string | null;
    previous_category?: string | null;
    sort_mode: "best" | "closest" | "trending";
  };
  sort_mode_selected: {
    sort_mode: "best" | "closest" | "trending";
    previous_sort_mode?: "best" | "closest" | "trending";
  };
  shuffle_click: { surface: string };
  open_in_maps_clicked: PlaceProps & { provider?: string };
  campus_selected: {
    campus: string;
    campus_id?: number;
    source: "onboarding" | "settings" | "prompt";
    is_first_time: boolean;
  };
  beta_onboarding_view: {
    path: string;
    referrer?: string;
    user_agent?: string;
    tester_name?: string;
    tester_email?: string;
  };
  beta_onboarding_identity_submitted: {
    tester_name: string;
    tester_email: string;
  };
  beta_onboarding_open_app_clicked: {
    tester_name?: string;
    tester_email?: string;
    onboarding_complete?: boolean;
  };
  beta_onboarding_apple_guide_clicked: Record<string, never>;
  beta_onboarding_go_trending_clicked: {
    tester_name?: string;
    tester_email?: string;
  };
};

const isProduction = process.env.NODE_ENV === "production";
let analyticsContext: AnalyticsContext = {};

export function setAnalyticsContext(update: Partial<AnalyticsContext>) {
  analyticsContext = { ...analyticsContext, ...update };
}

export function getAnalyticsContext() {
  return analyticsContext;
}

export function trackEvent<EventName extends AnalyticsEvent>(
  event: EventName,
  props?: EventPropsByName[EventName]
) {
  try {
    const payload = { ...analyticsContext, ...(props ?? {}) };
    if (!isProduction) {
      // Avoid polluting PostHog with local dev events.
      // eslint-disable-next-line no-console
      console.info(`[analytics] ${event}`, payload);
      return;
    }
    posthog.capture(event, payload);
  } catch {
    // Analytics should never break the app.
  }
}

export function trackPageView(pathname: string, url: string) {
  trackEvent("page_view", { pathname, url });
}
