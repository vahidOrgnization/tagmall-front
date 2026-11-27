"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { MobilePhoneIcon } from "@/icons";
import { isValidIranianMobile } from "@/lib/client/validations";
import { toEnglishNumber } from "@/lib/client/utils";
import {
  getAuthErrorMessage,
  getOtpExpirySeconds,
  parseAuthBoolean,
} from "@/lib/client/auth";
import { sendOtp } from "@/lib/server/actions/auth";
import toast from "react-hot-toast";

function LoginEnterPhone({
  handleNextStep,
  phoneNumber,
  setPhoneNumber,
  setOtpExpireTime,
  setIsNewUser,
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({ phone: "" });
  const requestInFlight = useRef(false);

  const handleConfirm = async () => {
    if (requestInFlight.current) return;

    const normalizedPhone = toEnglishNumber(String(phoneNumber ?? "")).replace(/[^0-9]/g, "");
    if (!normalizedPhone) {
      setErrors({ phone: "ابتدا شماره موبایل خود را وارد نمایید" });
      return;
    }

    if (!isValidIranianMobile(normalizedPhone)) {
      setErrors({ phone: "شماره موبایل معتبر نمی‌باشد" });
      return;
    }

    requestInFlight.current = true;
    setErrors({ phone: "" });
    setPhoneNumber(normalizedPhone);
    setIsLoading(true);

    try {
      const { sendOtpRes, sendOtpErr } = await sendOtp({ mobile: normalizedPhone });
      const responseData = sendOtpRes?.data;
      const isNewUser = parseAuthBoolean(responseData?.is_new_user);

      if (!responseData || isNewUser === null) {
        toast.error(getAuthErrorMessage(sendOtpErr, "پاسخ ارسال کد تأیید از سرور معتبر نیست."));
        return;
      }

      setIsNewUser(isNewUser);
      setOtpExpireTime(getOtpExpirySeconds(responseData.expires_in_seconds));
      handleNextStep();
    } catch (error) {
      toast.error(getAuthErrorMessage(error, "ارسال کد تأیید انجام نشد."));
    } finally {
      requestInFlight.current = false;
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && phoneNumber && !isLoading) {
      e.preventDefault();
      handleConfirm();
    }
  };

  return (
    <div className="flex flex-col space-y-8 select-none">
      <div className="flex justify-center items-center">
        <Image
          src="/assets/images/logo/tagmall-logo-horizontal.svg"
          width={170}
          height={66}
          alt="تگ مال"
          priority
          className="h-16.5 w-auto object-contain"
        />
      </div>

      <div className="flex flex-col gap-2 text-right">
        <h2 className="text-h4 font-semibold text-primary">ورود به حساب کاربری</h2>
        <p className="text-small text-text-muted font-normal leading-relaxed">
          جهت ورود یا ثبت‌نام، شماره موبایل خود را وارد کنید.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <div
          className={`flex items-center gap-2 h-14 px-3 rounded-[15px] border bg-surface transition-colors ${
            errors.phone
              ? "border-error focus-within:border-error"
              : "border-border-default focus-within:border-primary-400"
          }`}
        >
          <input
            id="phone"
            type="tel"
            inputMode="numeric"
            maxLength={11}
            value={phoneNumber}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9]/g, "");
              setPhoneNumber(val);
              if (errors.phone) setErrors({ phone: "" });
            }}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder="شماره موبایل"
            autoFocus
            dir="rtl"
            className="w-full bg-transparent text-body font-normal text-text-primary placeholder:text-text-disabled outline-none border-none focus:outline-none focus:ring-0"
          />
          <MobilePhoneIcon size={24} className="text-text-primary shrink-0 pointer-events-none" />
        </div>

        {errors.phone && (
          <span className="text-caption text-error font-medium px-1">{errors.phone}</span>
        )}
      </div>

      <button
        type="button"
        onClick={handleConfirm}
        disabled={!phoneNumber || isLoading}
        className={`w-full h-12.5 rounded-2xl text-h5 font-semibold transition-all duration-200 flex items-center justify-center cursor-pointer ${
          !phoneNumber || isLoading
            ? "bg-primary-300 text-text-on-primary cursor-not-allowed opacity-70"
            : "bg-primary text-text-on-primary hover:bg-primary-600 active:scale-[0.99]"
        }`}
      >
        {isLoading ? "در حال ارسال..." : "ارسال پیامکی کد تایید"}
      </button>
    </div>
  );
}

export default LoginEnterPhone;