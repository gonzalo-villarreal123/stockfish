"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

interface ReferralStats {
  referral_code: string;
  referral_count: number;
  referral_link: string;
}

export default function ReferralShareCTA() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch("/api/user/referral", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;

      const data = await res.json();
      setStats(data);
    }
    load();
  }, []);

  if (!stats) return null;

  async function handleCopy() {
    await navigator.clipboard.writeText(stats!.referral_link);
    setCopied(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).posthog?.capture("referral_link_copied", {
      referral_code: stats!.referral_code,
    });
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShare() {
    if (navigator.share) {
      await navigator.share({
        title: "Stockfish — decoración con IA",
        text: "Descubrí Stockfish: encontrá muebles y decoración con IA para tu espacio.",
        url: stats!.referral_link,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).posthog?.capture("referral_link_shared", {
        referral_code: stats!.referral_code,
      });
    } else {
      handleCopy();
    }
  }

  return (
    <div className="mt-4 p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
      <p className="text-sm text-neutral-300 mb-1">
        ¿Te gustó? Compartí Stockfish con tus amigos 🎁
      </p>
      {stats.referral_count > 0 && (
        <p className="text-xs text-neutral-500 mb-3">
          Ya invitaste a{" "}
          <span className="text-white font-medium">{stats.referral_count}</span>{" "}
          {stats.referral_count === 1 ? "persona" : "personas"}
        </p>
      )}
      <div className="flex gap-2">
        <div className="flex-1 bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-neutral-400 truncate">
          {stats.referral_link}
        </div>
        <button
          onClick={handleCopy}
          className="flex-shrink-0 bg-white text-black text-xs font-semibold px-3 py-2 rounded-xl hover:bg-neutral-200 transition-colors"
        >
          {copied ? "✓" : "Copiar"}
        </button>
        <button
          onClick={handleShare}
          className="flex-shrink-0 border border-neutral-700 text-neutral-300 text-xs font-semibold px-3 py-2 rounded-xl hover:border-neutral-500 hover:text-white transition-colors"
        >
          Compartir
        </button>
      </div>
    </div>
  );
}
