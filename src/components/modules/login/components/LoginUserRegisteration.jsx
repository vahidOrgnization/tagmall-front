"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { UserIcon, BarcodeReadIcon, MobilePhoneIcon, ArrowLeftIcon } from "@/icons";
import { isValidIranianNationalCode } from "@/lib/client/validations";
import { registerUser } from "@/lib/server/actions/auth";
import { saveToken, saveUser } from "@/lib/server/cookies";
import { formatPhoneNumber, toEnglishNumber } from "@/lib/client/utils";
import usePublicStore from "@/app/store/publicStore";

function LoginUserRegisteration({
  phoneNumber,
  enteredOtp,
  handlePreviousStep,
  onSuccess,
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [nationalCode, setNationalCode] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const [errors, setErrors] = useState({
    fullName: "",
    nationalCode: "",
    mobile: "",
    otp: "",
  });

  const setUserInfo = usePublicStore((state) => state.setUserInfo);
  const setAccessToken = usePublicStore((state) => state.setAccessToken);

  const parts = fullName.trim().split(/\s+/);
  const isFormValid =
    fullName.trim().length >= 3 &&
    nationalCode.length === 10 &&
    isValidIranianNationalCode(nationalCode);

  const handleConfirm = async () => {
    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    const newErrors = {
      fullName: "",
      nationalCode: "",
      mobile: "",
      otp: "",
    };

    let hasError = false;

    if (!firstName) {
      newErrors.fullName = "لطفا نام و نام خانوادگی را وارد نمایید";
      hasError = true;
    } else if (!lastName) {
      newErrors.fullName = "لطفا نام خانوادگی را نیز وارد نمایید";
      hasError = true;
    }

    if (!isValidIranianNationalCode(nationalCode)) {
      newErrors.nationalCode = "شناسه / کد ملی وارد شده نامعتبر است";
      hasError = true;
    }

    if (hasError) {
      setErrors(newErrors);
      return;
    }

    const payload = {
      mobile: phoneNumber,
      otp: enteredOtp,
      name: firstName,
      family: lastName,
      national_code: nationalCode,
    };

    setIsConfirming(true);

    const { registerRes, registerErr } = await registerUser(payload);

    if (registerRes) {
      toast.success("ثبت‌نام با موفقیت انجام شد");
      setAccessToken(registerRes?.data?.token);
      setUserInfo(registerRes?.data?.user);
      await saveToken(registerRes?.data?.token);
      await saveUser(JSON.stringify(registerRes?.data?.user));
      if (onSuccess) onSuccess();
      router.push("/");
    } else if (registerErr) {
      const apiErrors = registerErr?.response?.data?.errors;

      if (apiErrors) {
        const mappedErrors = { ...newErrors };
        if (apiErrors.name || apiErrors.family) {
          mappedErrors.fullName = apiErrors.name?.[0] || apiErrors.family?.[0];
        }
        if (apiErrors.national_code) {
          mappedErrors.nationalCode = apiErrors.national_code[0];
        }
        setErrors(mappedErrors);

        if (apiErrors.mobile) {
          toast.error(apiErrors.mobile[0]);
        }
        if (apiErrors.otp) {
          toast.error(apiErrors.otp[0]);
        }
      } else {
        toast.error("خطا در برقراری ارتباط با سرور");
      }
    }

    setIsConfirming(false);
  };

  return (
    <div className="flex flex-col space-y-6 select-none">
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
          ایجاد حساب کاربری
        </h2>
        <p className="text-small text-text-muted font-normal leading-relaxed">
          اطلاعات خود را جهت ثبت‌نام وارد کنید.
        </p>
      </div>

      {/* 3. Form (Full Name, National Code, Mobile) */}
      <div className="flex flex-col gap-4">
        {/* Full Name */}
        <div className="flex flex-col gap-1">
          <div
            className={`w-full h-14 rounded-2xl border bg-surface flex items-center px-4 transition-all duration-200 ${
              errors.fullName
                ? "border-error focus-within:ring-2 focus-within:ring-error/20"
                : "border-border-default focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10"
            }`}
          >
            <UserIcon size={24} className="text-primary shrink-0" />
            <input
              type="text"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (errors.fullName) {
                  setErrors((prev) => ({ ...prev, fullName: "" }));
                }
              }}
              disabled={isConfirming}
              placeholder="نام و نام خانوادگی"
              className="w-full h-full bg-transparent pr-3 pl-1 text-h5 font-medium text-text-primary placeholder:text-text-placeholder outline-none text-right"
            />
          </div>
          {errors.fullName && (
            <span className="text-caption text-error px-1 text-right">
              {errors.fullName}
            </span>
          )}
        </div>

        {/* National Code / شناسه ملی */}
        <div className="flex flex-col gap-1">
          <div
            className={`w-full h-14 rounded-2xl border bg-surface flex items-center px-4 transition-all duration-200 ${
              errors.nationalCode
                ? "border-error focus-within:ring-2 focus-within:ring-error/20"
                : "border-border-default focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10"
            }`}
          >
            <BarcodeReadIcon size={24} className="text-primary shrink-0" />
            <input
              type="text"
              inputMode="numeric"
              pattern="\d*"
              maxLength={10}
              value={nationalCode}
              onChange={(e) => {
                const val = toEnglishNumber(e.target.value).replace(/\D/g, "");
                if (val.length <= 10) setNationalCode(val);
                if (errors.nationalCode) {
                  setErrors((prev) => ({ ...prev, nationalCode: "" }));
                }
              }}
              disabled={isConfirming}
              placeholder="شناسه ملی"
              className="w-full h-full bg-transparent pr-3 pl-1 text-h5 font-medium text-text-primary placeholder:text-text-placeholder outline-none text-right"
            />
          </div>
          {errors.nationalCode && (
            <span className="text-caption text-error px-1 text-right">
              {errors.nationalCode}
            </span>
          )}
        </div>

        {/* Mobile Number (Read-only / verified from step 1) */}
        <div className="flex flex-col gap-1">
          <div className="w-full h-14 rounded-2xl border border-border-default bg-surface/70 opacity-80 flex items-center px-4 cursor-not-allowed">
            <MobilePhoneIcon size={24} className="text-primary shrink-0" />
            <input
              type="text"
              value={phoneNumber ? formatPhoneNumber(phoneNumber) : ""}
              readOnly
              disabled
              placeholder="شماره موبایل"
              className="w-full h-full bg-transparent pr-3 pl-1 text-h5 font-medium text-text-muted outline-none text-right cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* 4. Action Button (ثبت نام) */}
      <button
        type="button"
        onClick={handleConfirm}
        disabled={isConfirming || !isFormValid}
        className={`w-full h-12.5 rounded-2xl text-h5 font-semibold transition-all duration-200 flex items-center justify-center ${
          !isConfirming && isFormValid
            ? "bg-primary text-white hover:bg-primary-600 active:scale-[0.99] cursor-pointer shadow-sm"
            : "bg-surface border border-border-default text-text-muted cursor-not-allowed opacity-80"
        }`}
      >
        {isConfirming ? "در حال ثبت نام..." : "ثبت نام"}
      </button>
    </div>
  );
}

export default LoginUserRegisteration;
