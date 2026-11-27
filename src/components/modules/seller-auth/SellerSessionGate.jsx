"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSellerPanelSession, logoutSeller } from "@/lib/server/actions/seller-auth";
import toast from "react-hot-toast";

const SellerSessionContext = createContext(null);

export function useSellerSession() {
  return useContext(SellerSessionContext);
}

let queue = Promise.resolve();
function withSellerLock(operation) {
  if (navigator.locks) return navigator.locks.request("tagmall-seller-session", operation);
  const next = queue.then(operation);
  queue = next.catch(() => {});
  return next;
}

export function SellerLogoutButton({ children, className }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function handleLogout() {
    setBusy(true);
    try {
      const result = await withSellerLock(logoutSeller);
      if (result.ok) {
        router.replace("/seller/login");
        router.refresh();
      } else toast.error(result.message);
    } catch {
      toast.error("خروج انجام نشد. دوباره تلاش کنید.");
    } finally {
      setBusy(false);
    }
  }
  return <button type="button" className={className} onClick={handleLogout} disabled={busy}>{children}</button>;
}

const steps = {
  IDENTITY: "اطلاعات هویتی",
  STORE_INFO: "اطلاعات فروشگاه",
  BANK_INFO: "اطلاعات بانکی",
  DOCUMENTS: "مدارک",
  CONTRACT: "قرارداد",
};

const stages = {
  ONBOARDING: "تکمیل اطلاعات فروشنده",
  PENDING_REVIEW: "در انتظار بررسی",
  REJECTED: "اطلاعات نیاز به اصلاح دارد",
};

export default function SellerSessionGate({ children }) {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let running = false;
    async function load() {
      if (running || cancelled) return;
      running = true;
      try {
        const result = await withSellerLock(() => cancelled ? null : getSellerPanelSession());
        if (cancelled || !result) return;
        if (result.ok) {
          setSession(result.data);
          setError("");
        } else if (result.status === 401) {
          setSession(null);
          router.replace("/seller/login");
        } else {
          setSession(null);
          setError(result.message);
        }
      } catch {
        if (!cancelled) {
          setSession(null);
          setError("بازیابی نشست فروشنده انجام نشد.");
        }
      } finally {
        running = false;
      }
    }
    void load();
    const timer = window.setInterval(() => { if (!document.hidden) void load(); }, 60000);
    function onVisible() { if (!document.hidden) void load(); }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, retry]);

  if (error) return (
    <section className="mx-auto max-w-lg space-y-4 p-6">
      <p role="alert">{error}</p>
      <button type="button" onClick={() => { setError(""); setRetry((value) => value + 1); }}>تلاش دوباره</button>
      <SellerLogoutButton className="ms-4">خروج</SellerLogoutButton>
    </section>
  );
  if (!session) return <p role="status" className="p-6">در حال بازیابی نشست فروشنده…</p>;
  if (session.onboarding) {
    const state = session.onboarding;
    return (
      <section className="theme-new mx-auto mt-8 max-w-lg space-y-4 rounded-xl bg-surface p-6">
        <h1 className="text-h4">{stages[state.status] || "وضعیت حساب فروشنده"}</h1>
        {state.verification_note && <p>{state.verification_note}</p>}
        <ol className="space-y-2">
          {state.steps?.map(({ key, completed }) => (
            <li key={key} aria-current={state.current_step === key ? "step" : undefined}>
              {steps[key] || key} · {completed ? "تکمیل شده" : state.current_step === key ? "مرحلهٔ فعلی" : "در انتظار تکمیل"}
            </li>
          ))}
        </ol>
        <SellerLogoutButton>خروج از حساب</SellerLogoutButton>
      </section>
    );
  }
  return <SellerSessionContext.Provider value={session}>{children}</SellerSessionContext.Provider>;
}
