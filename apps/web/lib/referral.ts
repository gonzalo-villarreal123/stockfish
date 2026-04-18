const REF_KEY = "stockfish_ref";
const UTM_KEY = "stockfish_utm";

export interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}

export function captureReferralParam(): void {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);

  const ref = params.get("ref");
  if (ref) {
    sessionStorage.setItem(REF_KEY, ref);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).posthog?.capture("referral_landing_visited", {
      referral_code: ref,
    });
  }

  // Capture UTM parameters for campaign attribution
  const utm: UTMParams = {};
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const) {
    const val = params.get(key);
    if (val) utm[key] = val;
  }
  if (Object.keys(utm).length > 0) {
    sessionStorage.setItem(UTM_KEY, JSON.stringify(utm));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).posthog?.capture("campaign_landing", utm);
  }
}

export function getStoredReferralCode(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(REF_KEY);
}

export function clearStoredReferralCode(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(REF_KEY);
}

export function getStoredUTM(): UTMParams | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(UTM_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UTMParams;
  } catch {
    return null;
  }
}

export function clearStoredUTM(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(UTM_KEY);
}
