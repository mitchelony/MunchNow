"use client";

import posthog from "posthog-js";

export type AnalyticsEvent =
  | "page_view"
  | "places_impression"
  | "place_open_modal"
  | "vote_cast"
  | "shuffle_click"
  | "open_in_maps";

type PlaceProps = {
  place_id: string | number;
  place_name?: string;
  section?: "top_3" | "more_places";
  tags?: string[];
  price_tier?: number | string | null;
  distance_miles?: number | null;
};

type EventPropsByName = {
  page_view: { pathname: string; url: string };
  places_impression: PlaceProps;
  place_open_modal: PlaceProps;
  vote_cast: PlaceProps & {
    verdict: "worth_it" | "mid" | "skip";
    surface: "card" | "modal";
  };
  shuffle_click: { surface: string };
  open_in_maps: PlaceProps & { provider?: string };
};

const isProduction = process.env.NODE_ENV === "production";

export function track<EventName extends AnalyticsEvent>(
  event: EventName,
  props?: EventPropsByName[EventName]
) {
  try {
    if (!isProduction) {
      // Avoid polluting PostHog with local dev events.
      // eslint-disable-next-line no-console
      console.info(`[analytics] ${event}`, props ?? {});
      return;
    }
    posthog.capture(event, props ?? {});
  } catch {
    // Analytics should never break the app.
  }
}

export function trackPageView(pathname: string, url: string) {
  track("page_view", { pathname, url });
}
