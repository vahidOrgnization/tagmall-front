"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { MessageTextIcon, ArrowLeftIcon } from "@/icons";
import toast from "react-hot-toast";
import { formatTime } from "@/lib/client/utils";
import {
  checkAuthValidation,
  registerUser,
  sendOtp,
} from "@/lib/server/actions/auth";
import usePublicStore from "@/app/store/publicStore";
import { saveToken, saveUser } from "@/lib/server/cookies";
import { OtpInput } from "@/components/ui/otp";

function LoginOtp({
  handleNextStep,
  handlePreviousStep,
  phoneNumber,
  setEnteredOtp,
  otpExpireTime,
  isNewUser,
  receivedOtp,
  onSuccess,
}) {
  const initialTime = otpExpireTime || 120;
  const [otp, setOtp] = useState("");
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [isResendActive, setIsResendActive] = useState(initialTime <= 0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const setUserInfo = usePublicStore((state) => state.setUserInfo);
  const setAccessToken = usePublicStore((state) => state.setAccessToken);
  const setLoginOpen = usePublicStore((state) => state.setLoginOpen);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timerId = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsResendActive(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerId);
  }, [timeLeft]);

  const handleResend = async () => {
    if (!isResendActive) return;
    setError("");
    const { sendOtpRes, sendOtpErr } = await sendOtp({ mobile: phoneNumber });
    if (sendOtpRes) {
      const expires = sendOtpRes.data.expires_in_seconds || 120;
      setTimeLeft(expires);
      setIsResendActive(expires <= 0);
      toast.success("کد تایید مجدداً ارسال شد");
    } else if (sendOtpErr) {
      toast.error("خطا در ارسال مجدد کد تایید");
    }
  };

  const handleCheckOtp = async (codeToVerify) => {
    const code = codeToVerify || otp;
    if (code.length !== 5 || isLoading) return;

    setIsLoading(true);
    setError("");

    const { checkRes, checkErr } = await checkAuthValidation({
      otp: code,
      mobile: phoneNumber,
    });

    if (checkRes) {
      if (checkRes.data?.valid) {
        if (!isNewUser) {
          const payload = {
            mobile: phoneNumber,
            otp: code,
          };
          const { registerRes, registerErr } = await registerUser(payload);
          if (registerRes) {
            setAccessToken(registerRes?.data?.token);
            setUserInfo(registerRes?.data?.user);
            await saveToken(registerRes?.data?.token);
            await saveUser(JSON.stringify(registerRes?.data?.user));
            toast.success("ورود با موفقیت انجام شد");
            if (onSuccess) onSuccess();
            setLoginOpen(false);
          } else if (registerErr) {
            toast.error("مشکلی در ورود به سامانه پیش آمده است");
          }
        } else {
          setEnteredOtp(code);
          handleNextStep();
        }
      } else {
        setError("کد تایید وارد شده صحیح نمی‌باشد.");
        setOtp("");
      }
    } else if (checkErr) {
      setError("خطایی در ارتباط با سرور رخ داده است.");
    }
    setIsLoading(false);
  };

  const handleOtpChange = (val) => {
    setOtp(val);
    if (error) setError("");
    if (val.length === 5) {
      handleCheckOtp(val);
    }
  };

  return (
    <div className="flex flex-col space-y-8 select-none">
      {/* 1. Header (Logo + Back Arrow button) */}
      <div className="relative flex justify-center items-center w-full">
        <Image
          src="/assets/images/logo/tagmall-logo-horizontal.svg"
          width={170}
          height={66}
          alt="تگ مال"
          priority
          className="h-16.5 w-auto object-contain"
        />
        {handlePreviousStep && (
          <button
            type="button"
            onClick={handlePreviousStep}
            className="absolute left-0 top-1/2 -translate-y-1/2 p-1 text-primary hover:text-primary-700 transition-colors cursor-pointer"
            aria-label="بازگشت به مرحله قبل"
          >
            <ArrowLeftIcon size={24} className="text-primary" />
          </button>
        )}
      </div>

      {/* 2. Header (Title + Description) */}
      <div className="flex flex-col gap-2 text-right">
        <h2 className="text-h4 font-semibold text-primary">
          ورود به حساب کاربری {receivedOtp ? `(${receivedOtp})` : ""}
        </h2>
        <p className="text-small text-text-muted font-normal leading-relaxed">
          کد ارسال شده به شماره خود را وارد نمایید.
        </p>
      </div>

      {/* 3. Form (5-digit OTP + Helper message) */}
      <div className="flex flex-col gap-3">
        <OtpInput
          variant="boxes"
          value={otp}
          setValue={handleOtpChange}
          length={5}
          error={error}
          disabled={isLoading}
        />

        {error ? (
          <span className="text-caption text-error font-medium text-right px-1">
            {error}
          </span>
        ) : (
          <div className="flex items-center justify-start gap-2 text-text-muted mt-1">
            <MessageTextIcon size={20} className="text-text-muted shrink-0" />
            <p className="text-small font-normal text-text-muted leading-relaxed">
              کد تایید به شماره شما پیامک شده است.
            </p>
          </div>
        )}
      </div>

      {/* 4. Action Button (Timer / Resend) */}
      <button
        type="button"
        onClick={handleResend}
        disabled={!isResendActive || isLoading}
        className={`w-full h-12.5 rounded-2xl text-h5 font-semibold transition-all duration-200 flex items-center justify-center ${
          isResendActive && !isLoading
            ? "border border-primary text-primary hover:bg-primary-50 cursor-pointer active:scale-[0.99]"
            : "border border-border-default text-text-muted bg-surface cursor-not-allowed opacity-90"
        }`}
      >
        {isResendActive ? (
          "ارسال مجدد کد تایید"
        ) : (
          <div className="flex items-center gap-1.5" dir="rtl">
            <span>ارسال مجدد کد تایید تا</span>
            <span className="text-error font-semibold inline-block font-mono min-w-11 text-center">
              {formatTime(timeLeft)}
            </span>
            <span>دیگر</span>
          </div>
        )}
      </button>
    </div>
  );
}

export default LoginOtp;
