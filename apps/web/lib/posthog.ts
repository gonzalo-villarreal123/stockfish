import posthog from "posthog-js";

let initialized = false;

export function initPostHog() {
  if (initialized || typeof window === "undefined") return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key || key.startsWith("phc_REEMPLAZAR")) return;

  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com",
    autocapture: false,
    capture_pageview: false,
    persistence: "localStorage",
  });
  initialized = true;
}

export function capture(
  event: string,
  properties?: Record<string, unknown>
) {
  if (typeof window === "undefined") return;
  posthog.capture(event, properties);
}
