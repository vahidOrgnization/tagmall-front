"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthCard } from "@/components/modules/login";

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSuccess = () => {
    const redirectUrl = searchParams.get("redirect") || "/";
    router.push(redirectUrl);
  };

  return (
    <main className="min-h-screen w-full flex flex-col justify-between items-center py-8 sm:py-12 px-4 bg-white select-none">
      {/* Spacer to balance vertical centering */}
      <div className="h-4 sm:h-8" aria-hidden="true" />

      {/* Center Auth Card (Figma Node 121:19035) */}
      <div className="w-full max-w-[460px] bg-white rounded-[28px] border border-border-default p-6 sm:p-10 shadow-sm">
        <AuthCard onSuccess={handleSuccess} />
      </div>

      {/* Footer text (Figma Node 121:19034) */}
      <footer className="w-full max-w-[810px] text-center mt-8 px-4">
        <p className="text-small text-text-muted leading-relaxed">
          با ورود و یا ثبت نام در تگ مال شما{" "}
          <Link
            href="/terms"
            className="text-primary font-medium hover:underline transition-colors"
          >
            شرایط و قوانین
          </Link>{" "}
          استفاده از سرویس‌های سایت و{" "}
          <Link
            href="/privacy"
            className="text-primary font-medium hover:underline transition-colors"
          >
            قوانین حریم خصوصی
          </Link>{" "}
          آن را می‌پذیرید.
        </p>
      </footer>
    </main>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen w-full flex items-center justify-center bg-white">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </main>
      }
    >
      <AuthPageContent />
    </Suspense>
  );
}
