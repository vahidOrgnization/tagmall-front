"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  FigmaAuthField,
  FigmaAuthHeader,
  FigmaAuthPrimaryButton,
} from "@/components/ui/figma-auth";
import { FigmaSellerOtpStep, FigmaSellerRegistrationStep, SellerRequestWait } from "./FigmaSellerAuthSteps";
import { startSellerOtp, resendSellerOtp, verifySellerOtp, registerSeller } from "@/lib/server/actions/seller-auth";
import { isValidIranianMobile } from "@/lib/client/validations";
import { toEnglishNumber } from "@/lib/client/utils";
import styles from "./FigmaSellerLegalLoginPage.module.css";

function normalizeDigits(value) {
  return toEnglishNumber(value).replace(/[٠-٩]/g, (digit) => "٠١٢٣٤٥٦٧٨٩".indexOf(digit));
}

const legalTermsAlt =
  "با ورود و یا ثبت نام در تگ مال شما شرایط و قوانین استفاده از سرویس‌های سایت و قوانین حریم خصوصی آن را می‌پذیرید.";

function RebrandAnnouncement() {
  return (
    <header className={styles.announcementBar}>
      <div className={styles.announcement} dir="ltr">
        <Image
          src="/assets/figma-seller-auth/rebrand-mark.svg"
          alt=""
          aria-hidden
          width={24}
          height={24}
          unoptimized
          className="block size-6 shrink-0"
        />
        <span
          dir="rtl"
          className="h-6 w-[76px] shrink-0 whitespace-nowrap text-left font-[YekanBakh,sans-serif] text-base [font-weight:450] leading-6 text-white"
        >
          نسخه جدید
        </span>
        <span
          aria-hidden="true"
          className="h-[26px] w-[5px] shrink-0 whitespace-nowrap font-[Meem,YekanBakh,sans-serif] text-base font-normal leading-[26px] text-white"
        >
          |
        </span>
        <span
          dir="rtl"
          className="h-[26px] w-[121px] shrink-0 whitespace-nowrap text-left font-[YekanBakh,sans-serif] text-base [font-weight:325] leading-[26px] text-white"
        >
          تگ مال ریبرند کرد
        </span>
      </div>
    </header>
  );
}

function SellerTypeTabs({ value, onChange, disabled }) {
  const sellerTypes = [
    { id: "legal", label: "فروشنده حقوقی", labelClassName: styles.legalTabLabel },
    { id: "individual", label: "فروشنده حقیقی", labelClassName: styles.individualTabLabel },
  ];

  return (
    <div
      aria-label="نوع فروشنده"
      className={styles.sellerTypeTabs}
      data-figma-node="240:1789"
      dir="ltr"
      role="tablist"
    >
      {sellerTypes.map((sellerType) => {
        const selected = value === sellerType.id;

        return (
          <button
            key={sellerType.id}
            aria-selected={selected}
            disabled={disabled}
            className={`${styles.sellerTypeTab} ${
              selected ? styles.sellerTypeTabSelected : styles.sellerTypeTabIdle
            } ${sellerType.id === "legal" ? styles.legalTab : styles.individualTab}`}
            onClick={() => onChange(sellerType.id)}
            role="tab"
            type="button"
          >
            <span dir="rtl" className={sellerType.labelClassName}>
              {sellerType.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function LegalSellerField({
  label,
  placeholder,
  icon,
  type = "text",
  inputMode,
  autoComplete,
  maxLength,
  onChange,
  value,
  hideIconOnMobile = false,
}) {
  return (
    <div className={styles.field} data-hide-icon-on-mobile={hideIconOnMobile ? "true" : undefined}>
      <label className={styles.fieldLabel}>{label}</label>
      <FigmaAuthField
        ariaLabel={label}
        autoComplete={autoComplete}
        icon={icon}
        inputMode={inputMode}
        maxLength={maxLength}
        onChange={onChange}
        placeholder={placeholder}
        placeholderTone="disabled"
        type={type}
        value={value}
      />
    </div>
  );
}

function MobileSubmitButton({ label, disabled }) {
  return (
    <button className={styles.mobileSubmitButton} type="submit" disabled={disabled}>
      <Image
        src="/assets/figma-seller-auth/arrow-left-mobile.svg"
        alt=""
        aria-hidden
        width={18}
        height={18}
        unoptimized
        className={styles.mobileSubmitIcon}
      />
      <span className={styles.mobileSubmitLabel} dir="rtl">
        {label}
      </span>
    </button>
  );
}

export function FigmaSellerLegalLoginPage() {
  const router = useRouter();
  const [sellerType, setSellerType] = useState("legal");
  const [stage, setStage] = useState("credentials");
  const [companyNationalId, setCompanyNationalId] = useState("");
  const [phone, setPhone] = useState("");
  const [challenge, setChallenge] = useState(null);
  const [preview, setPreview] = useState(null);
  const [retryUntil, setRetryUntil] = useState(0);
  const [otpResetKey, setOtpResetKey] = useState(0);
  const [otpError, setOtpError] = useState("");
  const [error, setError] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const isLegalSeller = sellerType === "legal";
  const submitLabel = "ارسال پیامکی کد تایید";

  function handleBackToCredentials() {
    setStage("credentials");
    setChallenge(null);
    setPreview(null);
    setOtpError("");
    setError(null);
  }

  function acceptChallenge(data) {
    setChallenge({ ...data, expiresAt: Date.now() + data.expires_in * 1000 });
    setRetryUntil(Date.now() + data.resend_after * 1000);
    setOtpResetKey((key) => key + 1);
    setOtpError("");
    setStage("otp");
  }

  async function runRequest(operation) {
    if (isBusy) return;
    setIsBusy(true);
    try {
      return await operation();
    } catch {
      toast.error("ارتباط برقرار نشد. دوباره تلاش کنید.");
    } finally {
      setIsBusy(false);
    }
  }

  function deviceId() {
    try {
      const key = "tagmall-seller-device";
      const id = localStorage.getItem(key) || crypto.randomUUID();
      localStorage.setItem(key, id);
      return id;
    } catch {
      return undefined;
    }
  }

  function handleCredentialsSubmit(event) {
    event.preventDefault();
    if (Date.now() < retryUntil) return;
    const mobile = phone.replace(/^(?:\+98|0098)(?=9)/, "0");
    if (!isValidIranianMobile(mobile)) return toast.error("شماره موبایل معتبر نیست.");
    if (isLegalSeller && !/^\d{11}$/.test(companyNationalId)) {
      return toast.error("شناسهٔ ملی شرکت باید ۱۱ رقم باشد.");
    }
    return runRequest(async () => {
      setError(null);
      const result = await startSellerOtp({
        seller_type: isLegalSeller ? "LEGAL" : "INDIVIDUAL",
        mobile,
        company_national_id: companyNationalId,
        deviceId: deviceId(),
      });
      if (result.ok) acceptChallenge(result.data);
      else {
        setError(result);
        if (result.retryAfter) setRetryUntil(Date.now() + result.retryAfter * 1000);
      }
    });
  }

  function handleOtpFailure(result) {
    if ([410, 423].includes(result.status)) {
      handleBackToCredentials();
      setError(result);
      return;
    }
    if (result.retryAfter) setRetryUntil(Date.now() + result.retryAfter * 1000);
    const attempts = Number.isInteger(result.attempts)
      ? " تلاش باقی‌مانده: " + result.attempts.toLocaleString("fa-IR")
      : "";
    setOtpError((result.errors?.code?.[0] || result.message) + attempts);
    setOtpResetKey((key) => key + 1);
  }

  function handleVerifyOtp(code) {
    if (!challenge) return;
    if (Date.now() >= challenge.expiresAt) {
      setOtpError("کد منقضی شده است. کد تازه بگیرید.");
      return;
    }
    return runRequest(async () => {
      const result = await verifySellerOtp({ challenge_id: challenge.challenge_id, code });
      if (!result.ok) return handleOtpFailure(result);
      if (result.data.status === "REGISTRATION_REQUIRED") {
        setPreview(result.data.seller_preview);
        setStage("register");
      } else router.replace("/seller");
    });
  }

  function handleResendOtp() {
    if (!challenge || Date.now() < retryUntil) return;
    return runRequest(async () => {
      const result = await resendSellerOtp({
        challenge_id: challenge.challenge_id,
        deviceId: deviceId(),
      });
      if (result.ok) acceptChallenge(result.data);
      else handleOtpFailure(result);
    });
  }

  function handleRegister(fields) {
    return runRequest(async () => {
      setError(null);
      const result = await registerSeller(preview?.seller_type === "LEGAL" ? "legal" : "individual", fields);
      if (result.ok) return router.replace("/seller");
      if (result.code === "REGISTRATION_TOKEN_INVALID") handleBackToCredentials();
      setError(result);
    });
  }

  return (
    <main className={styles.page} data-figma-node="240:1746" dir="rtl">
      <div aria-hidden="true" className={styles.backgroundPattern} />
      <RebrandAnnouncement />

      <section
        aria-label="ورود فروشنده"
        className={styles.card}
        data-figma-node={
          stage === "credentials"
            ? isLegalSeller
              ? "240:1757"
              : "240:1821"
            : stage === "otp"
              ? "240:2243"
              : isLegalSeller
                ? "240:2422"
                : "240:2363"
        }
        data-auth-stage={stage === "credentials" ? undefined : stage}
        data-seller-type={sellerType}
        data-feedback={stage === "credentials" && Boolean(error) ? "true" : undefined}
      >
        {stage === "credentials" ? (
          <form className={styles.credentialsForm} onSubmit={handleCredentialsSubmit}>
            <div className={styles.headingBlock} data-figma-node="240:1758">
              <div className={styles.logoSlot} data-figma-node="240:1759">
                <Image
                  src="/assets/figma-seller-auth/legal-seller-logo.svg"
                  alt="تگ مال"
                  width={170.18}
                  height={65.8995285}
                  unoptimized
                  className={styles.logo}
                  data-figma-node="240:1760"
                />
              </div>

              <div className={styles.titleContainer} dir="ltr">
                <FigmaAuthHeader
                  title="ورود به حساب کاربری"
                  titleClassName="w-[195px]"
                  description="جهت ورود یا ثبت‌نام، شماره موبایل خود را وارد کنید."
                  descriptionClassName="w-[305px]"
                />
              </div>

              <SellerTypeTabs disabled={isBusy} value={sellerType} onChange={(type) => { setSellerType(type); setError(null); }} />
            </div>

            <div
              className={styles.fields}
              data-figma-node={isLegalSeller ? "240:1793" : "240:1857"}
              data-seller-type={sellerType}
            >
              {isLegalSeller && (
                <LegalSellerField
                  label="شناسه ملی شرکت"
                  placeholder="شناسه ملی شرکت را وارد کنید"
                  icon="/assets/figma-seller-auth/company-id.svg"
                  inputMode="numeric"
                  maxLength={11}
                  value={companyNationalId}
                  onChange={(event) =>
                    setCompanyNationalId(
                      normalizeDigits(event.target.value)
                        .replace(/[^0-9]/g, "")
                        .slice(0, 11),
                    )
                  }
                  hideIconOnMobile
                />
              )}
              <LegalSellerField
                label="شماره موبایل"
                placeholder="شماره موبایل خود را وارد کنید"
                icon="/assets/figma-seller-auth/mobile.svg"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                maxLength={15}
                value={phone}
                onChange={(event) =>
                  setPhone(
                    normalizeDigits(event.target.value)
                      .replace(/[^+0-9]/g, "")
                      .slice(0, 15),
                  )
                }
                hideIconOnMobile={isLegalSeller}
              />
            </div>

            {error && <p role="alert">{error.errors?.mobile?.[0] || error.errors?.company_national_id?.[0] || error.message}</p>}
            <SellerRequestWait until={retryUntil} />
            <div className={styles.submitArea}>
              <FigmaAuthPrimaryButton
                label={submitLabel}
                labelWidth="w-[169px]"
                icon="/assets/figma-seller-auth/arrow-left.svg"
                type="submit"
                disabled={isBusy}
              />
              <MobileSubmitButton label={submitLabel} disabled={isBusy} />
            </div>
          </form>
        ) : stage === "otp" ? (
          <FigmaSellerOtpStep
            resendAt={retryUntil}
            length={challenge.code_length}
            maskedMobile={challenge.mobile_masked}
            error={otpError}
            resetKey={otpResetKey}
            isBusy={isBusy}
            onBack={handleBackToCredentials}
            onResend={handleResendOtp}
            onVerify={handleVerifyOtp}
          />
        ) : (
          <FigmaSellerRegistrationStep
            sellerType={preview?.seller_type === "LEGAL" ? "legal" : "individual"}
            initialCompanyNationalId={preview?.company_national_id || companyNationalId}
            initialMobile={phone}
            error={error}
            onBack={handleBackToCredentials}
            isBusy={isBusy}
            onRegister={handleRegister}
          />
        )}
      </section>

      <footer className={styles.legalTermsDesktop}>
        <Image
          src="/assets/figma-seller-auth/legal-terms.svg"
          alt={legalTermsAlt}
          width={810}
          height={26}
          unoptimized
          className={styles.legalTermsDesktopImage}
          data-figma-node="240:1809"
        />
      </footer>

      <footer className={styles.legalTermsMobile} data-auth-stage={stage}>
        <Image
          src="/assets/figma-seller-auth/legal-terms-mobile.svg"
          alt={legalTermsAlt}
          width={358}
          height={44}
          unoptimized
          className={styles.legalTermsMobileImage}
          data-figma-node="240:1926"
        />
      </footer>
    </main>
  );
}

export default FigmaSellerLegalLoginPage;
