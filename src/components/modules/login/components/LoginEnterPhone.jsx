"use client";

import { useState } from "react";
import Image from "next/image";
import { MobilePhoneIcon } from "@/icons";
import { isValidIranianMobile } from "@/lib/client/validations";
import { sendOtp } from "@/lib/server/actions/auth";

function LoginEnterPhone({
  handleNextStep,
  phoneNumber,
  setPhoneNumber,
  setOtpExpireTime,
  setIsNewUser,
  setReceivedOtp,
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({ phone: "" });

  const handleConfirm = async () => {
    if (!phoneNumber) {
      setErrors({ ...errors, phone: "ابتدا شماره موبایل خود را وارد نمایید" });
      return;
    }

    if (!isValidIranianMobile(phoneNumber)) {
      setErrors({ ...errors, phone: "شماره موبایل معتبر نمی‌باشد" });
      return;
    }

    setErrors({ ...errors, phone: "" });
    setIsLoading(true);
    const { sendOtpRes, sendOtpErr } = await sendOtp({ mobile: phoneNumber });
    if (sendOtpRes) {
      console.log(sendOtpRes);
      setReceivedOtp(sendOtpRes.data.otp);
      setIsNewUser(sendOtpRes.data.is_new_user);
      setOtpExpireTime(sendOtpRes.data.expires_in_seconds);
      handleNextStep();
    } else if (sendOtpErr) {
      console.log(sendOtpErr);
    }
    setIsLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && phoneNumber && !isLoading) {
      e.preventDefault();
      handleConfirm();
    }
  };

  return (
    <div className="flex flex-col space-y-8 select-none">
      {/* 1. Logo */}
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

      {/* 2. Header (Title + Description) */}
      <div className="flex flex-col gap-2 text-right">
        <h2 className="text-h4 font-semibold text-primary">
          ورود به حساب کاربری
        </h2>
        <p className="text-small text-text-muted font-normal leading-relaxed">
          جهت ورود یا ثبت‌نام، شماره موبایل خود را وارد کنید.
        </p>
      </div>

      {/* 3. Form Input */}
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
              if (errors.phone) setErrors({ ...errors, phone: "" });
            }}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder="شماره موبایل"
            autoFocus
            dir="rtl"
            className="w-full bg-transparent text-body font-normal text-text-primary placeholder:text-text-disabled outline-none border-none focus:outline-none focus:ring-0"
          />
          <MobilePhoneIcon
            size={24}
            className="text-text-primary shrink-0 pointer-events-none"
          />
        </div>

        {errors.phone && (
          <span className="text-caption text-error font-medium px-1">
            {errors.phone}
          </span>
        )}
      </div>

      {/* 4. Action Button */}
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
