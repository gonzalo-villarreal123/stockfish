import { supabase } from "./supabase";
import { clearStoredReferralCode, getStoredReferralCode } from "./referral";

/**
 * Call after a successful sign-up to record referral attribution.
 * Reads the pending ref code from sessionStorage and writes it to the
 * user's profile row. No-ops if there's no pending code.
 */
export async function applyReferralOnSignup(userId: string): Promise<void> {
  const referralCode = getStoredReferralCode();
  if (!referralCode) return;

  const { error } = await supabase
    .from("profiles")
    .update({ referred_by: referralCode })
    .eq("id", userId)
    .is("referred_by", null); // only apply if not already attributed

  if (!error) {
    clearStoredReferralCode();
  }
}
