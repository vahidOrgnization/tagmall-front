"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeftIcon, MessageTextIcon } from "@/icons";
import toast from "react-hot-toast";
import { formatTime } from "@/lib/client/utils";
import {
  getAuthErrorMessage,
  getOtpExpirySeconds,
  parseAuthBoolean,
  persistAuthSession,
} from "@/lib/client/auth";
import { checkAuthValidation, registerUser, sendOtp } from "@/lib/server/actions/auth";
import usePublicStore from "@/app/store/publicStore";
import { OtpInput } from "@/components/ui/otp";

function LoginOtp({
  handleNextStep,
  handlePreviousStep,
  phoneNumber,
  setEnteredOtp,
  otpExpireTime,
  isNewUser,
  onSuccess,
}) {
  const [otp, setOtp] = useState("");
  const [timeLeft, setTimeLeft] = useState(() => getOtpExpirySeconds(otpExpireTime));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const isResendActive = timeLeft === 0;
  const verificationInFlight = useRef(false);
  const resendInFlight = useRef(false);
  const lastSubmittedOtp = useRef("");

  const setUserInfo = usePublicStore((state) => state.setUserInfo);
  const setAccessToken = usePublicStore((state) => state.setAccessToken);
  const setLoginOpen = usePublicStore((state) => state.setLoginOpen);

  useEffect(() => {
    if (timeLeft <= 0) {
      return undefined;
    }

    const timerId = window.setTimeout(() => {
      setTimeLeft((previous) => Math.max(0, previous - 1));
    }, 1000);

    return () => window.clearTimeout(timerId);
  }, [timeLeft]);

  const handleResend = async () => {
    if (!isResendActive || resendInFlight.current || isLoading) return;
    resendInFlight.current = true;

    try {
      const { sendOtpRes, sendOtpErr } = await sendOtp({ mobile: phoneNumber });
      const responseData = sendOtpRes?.data;
      if (!responseData) {
        toast.error(getAuthErrorMessage(sendOtpErr, "ارسال مجدد کد انجام نشد."));
        return;
      }

      const duration = getOtpExpirySeconds(responseData.expires_in_seconds);
      setOtp("");
      setError("");
      setTimeLeft(duration);
      toast.success("کد تایید مجدداً ارسال شد");
    } catch (requestError) {
      toast.error(getAuthErrorMessage(requestError, "ارسال مجدد کد انجام نشد."));
    } finally {
      resendInFlight.current = false;
    }
  };

  const handleCheckOtp = useCallback(async () => {
    if (verificationInFlight.current || otp.length !== 5) return;
    verificationInFlight.current = true;
    setIsLoading(true);
    setError("");

    try {
      const { checkRes, checkErr } = await checkAuthValidation({ otp, mobile: phoneNumber });
      const valid = parseAuthBoolean(checkRes?.data?.valid);

      if (!checkRes?.data || valid === null) {
        setError(getAuthErrorMessage(checkErr, "بررسی کد تأیید انجام نشد."));
        setOtp("");
        return;
      }

      if (!valid) {
        setError("کد تایید وارد شده صحیح نمی‌باشد.");
        setOtp("");
        return;
      }

      if (isNewUser) {
        setEnteredOtp(otp);
        handleNextStep();
        return;
      }

      const { registerRes, registerErr } = await registerUser({ mobile: phoneNumber, otp });
      if (!registerRes?.data) {
        toast.error(getAuthErrorMessage(registerErr, "ورود به سامانه انجام نشد."));
        setOtp("");
        return;
      }

      await persistAuthSession({
        authData: registerRes.data,
        setAccessToken,
        setUserInfo,
      });
      toast.success("ورود با موفقیت انجام شد");
      onSuccess?.();
      setLoginOpen(false);
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError, "ورود به سامانه انجام نشد."));
      setOtp("");
    } finally {
      verificationInFlight.current = false;
      setIsLoading(false);
    }
  }, [
    handleNextStep,
    isNewUser,
    onSuccess,
    otp,
    phoneNumber,
    setAccessToken,
    setEnteredOtp,
    setLoginOpen,
    setUserInfo,
  ]);

  useEffect(() => {
    if (otp.length < 5) {
      lastSubmittedOtp.current = "";
      return;
    }

    if (lastSubmittedOtp.current !== otp) {
      lastSubmittedOtp.current = otp;
      handleCheckOtp();
    }
  }, [handleCheckOtp, otp]);

  const handleOtpChange = (val) => {
    setOtp(val);
    if (error) setError("");
  };

  return (
    <div className="flex flex-col space-y-8 select-none">
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
            disabled={isLoading}
            className="absolute left-0 top-1/2 -translate-y-1/2 p-1 text-primary hover:text-primary-700 transition-colors cursor-pointer disabled:opacity-50"
            aria-label="بازگشت به مرحله قبل"
          >
            <ArrowLeftIcon size={24} className="text-primary" />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2 text-right">
        <h2 className="text-h4 font-semibold text-primary">ورود به حساب کاربری</h2>
        <p className="text-small text-text-muted font-normal leading-relaxed">
          کد ارسال شده به شماره خود را وارد نمایید.
        </p>
      </div>

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
          <span className="text-caption text-error font-medium text-right px-1">{error}</span>
        ) : (
          <div className="flex items-center justify-start gap-2 text-text-muted mt-1">
            <MessageTextIcon size={20} className="text-text-muted shrink-0" />
            <p className="text-small font-normal text-text-muted leading-relaxed">
              کد تایید به شماره شما پیامک شده است.
            </p>
          </div>
        )}
      </div>

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