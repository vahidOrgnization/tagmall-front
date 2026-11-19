"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { isValidIranianMobile, isValidIranianNationalCode } from "@/lib/client/validations";
import { toEnglishNumber } from "@/lib/client/utils";
import styles from "./FigmaSellerAuthSteps.module.css";

const AUTH_LOGO = "/assets/figma-seller-auth/legal-seller-logo.svg";

function toDigits(value) {
  return toEnglishNumber(String(value ?? ""))
    .replace(/[٠-٩]/g, (digit) => "٠١٢٣٤٥٦٧٨٩".indexOf(digit))
    .replace(/[^0-9]/g, "");
}

function toPersianDigits(value) {
  return String(value).replace(/[0-9]/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
}

function normalizeIranianMobile(value) {
  return toEnglishNumber(String(value ?? "").trim())
    .replace(/[٠-٩]/g, (digit) => "٠١٢٣٤٥٦٧٨٩".indexOf(digit))
    .replace(/^(?:\+98|0098)(?=9)/, "0")
    .replace(/[^0-9]/g, "");
}

function SellerAuthHeader({ title, description, variant }) {
  return (
    <div
      className={styles.header}
      data-figma-node={
        variant === "otp"
          ? "240:2247"
          : variant === "registration-individual"
            ? "240:2364"
            : "240:2423"
      }
      data-variant={variant}
    >
      <div
        className={styles.logoSlot}
        data-figma-node={variant === "otp" ? "240:2248" : "240:2424"}
      >
        <Image
          src={AUTH_LOGO}
          alt="تگ مال"
          width={170.18}
          height={65.8995285}
          unoptimized
          className={styles.logo}
        />
      </div>
      <div className={styles.headerCopy}>
        <h1 className={styles.title} dir="rtl">
          {title}
        </h1>
        <p className={styles.description} dir="rtl">
          {description}
        </p>
      </div>
    </div>
  );
}

function OtpFields({ length, disabled, error, onVerify }) {
  const [code, setCode] = useState(() => Array(length).fill(""));
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRefs = useRef([]);
  const submittedCode = useRef("");

  useEffect(() => {
    if (!disabled) inputRefs.current[0]?.focus();
  }, [disabled]);

  function commitCharacters(startIndex, rawValue) {
    const digits = toDigits(rawValue);
    if (!digits) {
      const characters = [...code];
      characters[startIndex] = "";
      setCode(characters);
      submittedCode.current = "";
      return;
    }

    const characters = [...code];
    digits
      .slice(0, length - startIndex)
      .split("")
      .forEach((digit, offset) => {
        characters[startIndex + offset] = digit;
      });
    const nextCode = characters.join("");
    setCode(characters);
    setActiveIndex(Math.min(startIndex + digits.length, length - 1));

    if (digits.length === 1 && startIndex < length - 1) {
      inputRefs.current[startIndex + 1]?.focus();
    }

    if (characters.every(Boolean) && submittedCode.current !== nextCode) {
      submittedCode.current = nextCode;
      onVerify(nextCode);
    }
  }

  function handleChange(index, event) {
    commitCharacters(index, event.target.value);
  }

  function handlePaste(index, event) {
    event.preventDefault();
    commitCharacters(index, event.clipboardData.getData("text"));
  }

  return (
    <div className={styles.otpFields} data-length={length} dir="ltr" role="group" aria-label="کد تأیید پیامکی">
      {Array.from({ length }, (_, index) => {
        const selected = activeIndex === index;
        const boxClassName = [
          styles.otpBox,
          selected ? styles.otpBoxActive : "",
          index === 3 ? styles.otpBoxFourth : "",
          error ? styles.otpBoxError : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <input
            key={index}
            ref={(element) => {
              inputRefs.current[index] = element;
            }}
            aria-label={`رقم ${index + 1} کد تأیید`}
            autoComplete={index === 0 ? "one-time-code" : "off"}
            className={boxClassName}
            disabled={disabled}
            inputMode="numeric"
            maxLength={index === 0 ? length : 1}
            onChange={(event) => handleChange(index, event)}
            onFocus={() => setActiveIndex(index)}
            onKeyDown={(event) => {
              if (event.key === "Backspace" && !code[index] && index > 0) {
                setActiveIndex(index - 1);
                inputRefs.current[index - 1]?.focus();
              }
            }}
            onPaste={(event) => handlePaste(index, event)}
            type="text"
            value={code[index]}
          />
        );
      })}
    </div>
  );
}

export function FigmaSellerOtpStep({
  resendAt,
  maskedMobile,
  length,
  isBusy = false,
  error = "",
  onBack,
  onResend,
  onVerify,
  resetKey = 0,
}) {
  return (
    <div className={styles.otpStep} data-figma-node="240:2243">
      <div className={styles.backRow} data-figma-node="240:2244" dir="ltr">
        <button
          type="button"
          className={styles.backButton}
          aria-label="بازگشت و ویرایش اطلاعات"
          onClick={onBack}
          disabled={isBusy}
        >
          <Image
            src="/assets/figma-seller-auth/otp-back.svg"
            alt=""
            aria-hidden
            width={25}
            height={25}
            unoptimized
            className={styles.backIcon}
          />
        </button>
      </div>

      <SellerAuthHeader
        variant="otp"
        title="تأیید ورود به حساب"
        description="برای ورود به پنل فروشندگان، کد پیامک‌شده را وارد کنید."
      />

      <div className={styles.otpForm} data-figma-node="240:2278">
        <OtpFields key={resetKey} length={length} disabled={isBusy} error={Boolean(error)} onVerify={onVerify} />
        <div className={styles.otpHelperRow} dir="ltr">
          <p
            className={error ? styles.otpHelperError : styles.otpHelper}
            dir="rtl"
            aria-live="polite"
          >
            {error || (maskedMobile ? "کد به شمارهٔ " + maskedMobile + " ارسال شد." : "کد تأیید پیامک شد.")}
          </p>
          <Image
            src="/assets/figma-auth/message-text.svg"
            alt=""
            aria-hidden
            width={20}
            height={20}
            unoptimized
            className={styles.messageIcon}
          />
        </div>
      </div>

      <OtpTimerControl
        key={resendAt}
        until={resendAt}
        isBusy={isBusy}
        onResend={onResend}
      />
    </div>
  );
}

function useSecondsLeft(until) {
  const remaining = () => Math.max(0, Math.ceil((until - Date.now()) / 1000));
  const [seconds, setSeconds] = useState(remaining);
  useEffect(() => {
    if (!until || seconds <= 0) return;
    const timer = window.setTimeout(() => setSeconds(remaining()), 1000);
    return () => window.clearTimeout(timer);
  });
  return seconds;
}

export function SellerRequestWait({ until }) {
  return <RequestWait key={until} until={until} />;
}

function RequestWait({ until }) {
  const seconds = useSecondsLeft(until);
  return seconds > 0 ? <p role="status">تا درخواست بعدی {toPersianDigits(seconds)} ثانیه صبر کنید.</p> : null;
}

function OtpTimerControl({ until, isBusy, onResend }) {
  const secondsLeft = useSecondsLeft(until);

  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const seconds = String(secondsLeft % 60).padStart(2, "0");

  return secondsLeft > 0 ? (
    <button type="button" className={styles.timerButton} disabled aria-live="off">
      <span dir="rtl">
        ارسال مجدد کد تایید تا{" "}
        <span className={styles.timerDigits}>{toPersianDigits(minutes + ":" + seconds)}</span> دیگر
      </span>
    </button>
  ) : (
    <button type="button" className={styles.resendButton} onClick={onResend} disabled={isBusy}>
      ارسال مجدد کد تایید
    </button>
  );
}

const individualFields = [
  ["name", "نام و نام خانوادگی مالک کسب و کار", "text", "user.svg", "name"],
  ["national_code", "کد ملی مالک کسب و کار", "text", "barcode-read.svg", "off"],
  ["mobile", "شماره موبایل", "tel", "mobile.svg", "tel"],
];

const legalCompanyFields = [
  ["company_name", "نام شرکت", "text", "user.svg", "organization"],
  ["company_national_id", "شناسه ملی شرکت", "text", "barcode-read.svg", "off"],
];

const legalManagerFields = [
  ["ceo_full_name", "نام و نام خانوادگی مدیر عامل", "text", "user.svg", "name"],
  ["ceo_national_code", "کد ملی مدیر عامل", "text", "barcode-read.svg", "off"],
  ["mobile", "شماره موبایل", "tel", "mobile.svg", "tel"],
];

const errorFields = {
  NATIONAL_CODE_EXISTS: "national_code",
  EMAIL_EXISTS: "email",
  COMPANY_NATIONAL_ID_EXISTS: "company_national_id",
  MOBILE_COMPANY_MISMATCH: "company_national_id",
};

export function FigmaSellerRegistrationStep({
  sellerType, initialCompanyNationalId, initialMobile, isBusy, error, onBack, onRegister,
}) {
  const isLegal = sellerType === "legal";
  const [localErrors, setLocalErrors] = useState({});
  const fields = isLegal
    ? [...legalCompanyFields, ...legalManagerFields]
    : individualFields;

  function handleSubmit(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const payload = Object.fromEntries(fields.map(([name]) => [
      name,
      name === "national_code" || name === "ceo_national_code" || name === "company_national_id"
        ? toDigits(data.get(name))
        : name === "mobile"
          ? normalizeIranianMobile(data.get(name))
          : String(data.get(name) ?? "").trim(),
    ]));
    const errors = {};
    const nationalCodeField = isLegal ? "ceo_national_code" : "national_code";
    if (!isValidIranianNationalCode(payload[nationalCodeField])) errors[nationalCodeField] = "کد ملی معتبر نیست.";
    if (!isValidIranianMobile(payload.mobile)) errors.mobile = "شماره موبایل معتبر نیست.";
    if (isLegal) {
      if (payload.company_national_id.length !== 11) errors.company_national_id = "شناسهٔ ملی شرکت باید ۱۱ رقم باشد.";
    }
    setLocalErrors(errors);
    if (!Object.keys(errors).length) onRegister(payload);
  }

  return (
    <form className={styles.registrationStep} onSubmit={handleSubmit}>
      <SellerAuthHeader variant={isLegal ? "registration-legal" : "registration-individual"}
        title={isLegal ? "ثبت نام فروشنده حقوقی" : "ثبت نام فروشنده حقیقی"}
        description={isLegal
          ? "اطلاعات شرکت و مدیر عامل را برای ساخت حساب وارد کنید."
          : "مالک کسب و کار محترم لطفا اطلاعات هویتی خود را ثبت کنید"} />
      {isLegal ? (
        <>
          <RegistrationFieldGroup title="اطلاعات هویتی شرکت" fields={legalCompanyFields}
            initialCompanyNationalId={initialCompanyNationalId} localErrors={localErrors} error={error}
            isBusy={isBusy} />
          <div className={styles.legalManagerAndSubmit}>
            <RegistrationFieldGroup title="اطلاعات هویتی مدیر عامل" fields={legalManagerFields}
              initialMobile={initialMobile} localErrors={localErrors} error={error} isBusy={isBusy} />
            <RegistrationSubmitButton disabled={isBusy} />
          </div>
        </>
      ) : (
        <div className={styles.individualFieldsAndSubmit}>
          <RegistrationFieldGroup fields={individualFields} initialMobile={initialMobile}
            localErrors={localErrors} error={error} isBusy={isBusy} individual />
          <RegistrationSubmitButton disabled={isBusy} />
        </div>
      )}
      {error && !error.errors && !errorFields[error.code] && <p role="alert">{error.message}</p>}
      <button type="button" className="sr-only" disabled={isBusy} onClick={onBack}>
        بازگشت و دریافت کد تازه
      </button>
    </form>
  );
}

function RegistrationFieldGroup({
  title, fields, initialCompanyNationalId, initialMobile, localErrors, error, isBusy,
  individual = false,
}) {
  return (
    <fieldset disabled={isBusy} className={`${styles.fieldGroup} ${individual ? styles.individualFields : ""}`}>
      {title && <p className={styles.fieldGroupTitle}>{title}</p>}
      <div className={styles.fieldGroupInputs}>
        {fields.map(([name, placeholder, type, icon, autoComplete]) => {
          const message = localErrors[name] || error?.errors?.[name]?.[0] ||
            (errorFields[error?.code] === name ? error.message : "");
          return (
            <label key={name} className={styles.registrationField} data-invalid={Boolean(message)}>
              <input name={name} type={type} autoComplete={autoComplete} aria-label={placeholder}
                aria-invalid={Boolean(message)} inputMode={name.includes("national_code") || name === "company_national_id" ? "numeric" : undefined}
                defaultValue={name === "company_national_id" ? initialCompanyNationalId : name === "mobile" ? normalizeIranianMobile(initialMobile) : undefined}
                placeholder={placeholder} maxLength={{ national_code: 10, ceo_national_code: 10, company_national_id: 11, mobile: 15 }[name]}
                required />
              <Image src={`/assets/figma-auth/${icon}`} alt="" aria-hidden width={24} height={24}
                unoptimized className={name === "mobile" ? styles.mobileFieldIcon : styles.fieldIcon} />
              {message && <span role="alert" className={styles.registrationError}>{message}</span>}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function RegistrationSubmitButton({ disabled }) {
  return (
    <button type="submit" className={styles.registrationSubmit} disabled={disabled} dir="ltr">
      <Image
        src="/assets/figma-seller-auth/arrow-left.svg"
        alt=""
        aria-hidden
        width={24}
        height={24}
        unoptimized
        className={styles.submitIcon}
      />
      <span dir="rtl">ادامه ثبت‌نام</span>
    </button>
  );
}
