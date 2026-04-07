const REF_KEY = "stockfish_ref";

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
}

export function getStoredReferralCode(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(REF_KEY);
}

export function clearStoredReferralCode(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(REF_KEY);
}
