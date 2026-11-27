"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  ArrowLeftIcon,
  BarcodeReadIcon,
  MobilePhoneIcon,
  UserIcon,
} from "@/icons";
import { Checkbox } from "@/components/ui/checkbox";
import ResponsiveModal from "@/components/ui/responsive-modal";
import { isValidIranianNationalCode } from "@/lib/client/validations";
import { formatPhoneNumber, toEnglishNumber } from "@/lib/client/utils";
import { getAuthErrorMessage, persistAuthSession } from "@/lib/client/auth";
import { registerUser } from "@/lib/server/actions/auth";
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
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [errors, setErrors] = useState({
    fullName: "",
    nationalCode: "",
    mobile: "",
    otp: "",
  });
  const requestInFlight = useRef(false);

  const setUserInfo = usePublicStore((state) => state.setUserInfo);
  const setAccessToken = usePublicStore((state) => state.setAccessToken);

  const isFormValid =
    fullName.trim().length >= 3 &&
    nationalCode.length === 10 &&
    isValidIranianNationalCode(nationalCode) &&
    acceptedTerms;

  const openTerms = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsTermsOpen(true);
  };

  const closeTerms = () => {
    setIsTermsOpen(false);
  };

  const handleConfirm = async (event) => {
    event?.preventDefault();
    if (requestInFlight.current) return;

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

    if (!acceptedTerms) {
      toast.error("پذیرش شرایط استفاده از خدمات الزامی است.");
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
      national_code: toEnglishNumber(nationalCode).replace(/[^0-9]/g, ""),
    };

    requestInFlight.current = true;
    setIsConfirming(true);

    try {
      const { registerRes, registerErr } = await registerUser(payload);

      if (registerRes?.data) {
        await persistAuthSession({
          authData: registerRes.data,
          setAccessToken,
          setUserInfo,
        });
        toast.success("ثبت‌نام با موفقیت انجام شد");
        onSuccess?.();
        router.push("/");
        return;
      }

      const apiErrors = registerErr?.response?.data?.errors;
      if (apiErrors && Object.keys(apiErrors).length > 0) {
        const fieldMap = {
          name: "fullName",
          family: "fullName",
          national_code: "nationalCode",
          mobile: "mobile",
          otp: "otp",
        };
        const mappedErrors = { ...newErrors };
        let firstApiMessage;

        Object.entries(apiErrors).forEach(([key, value]) => {
          const stateKey = fieldMap[key];
          const message = Array.isArray(value) ? value[0] : value;
          if (typeof message === "string" && !firstApiMessage) firstApiMessage = message;
          if (stateKey && typeof message === "string") {
            mappedErrors[stateKey] = message;
          }
        });

        setErrors(mappedErrors);
        if (firstApiMessage) toast.error(firstApiMessage);
      } else {
        toast.error(getAuthErrorMessage(registerErr, "ثبت‌نام انجام نشد. دوباره تلاش کنید."));
      }
    } catch (requestError) {
      toast.error(getAuthErrorMessage(requestError, "ثبت‌نام انجام نشد. دوباره تلاش کنید."));
    } finally {
      requestInFlight.current = false;
      setIsConfirming(false);
    }
  };

  return (
  <>
    <form
      className="flex flex-col space-y-6 select-none"
      onSubmit={handleConfirm}
    >
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
            disabled={isConfirming}
            className="absolute left-0 top-1/2 -translate-y-1/2 p-1 text-primary hover:text-primary-700 transition-colors cursor-pointer disabled:opacity-50"
            aria-label="بازگشت به مرحله قبل"
          >
            <ArrowLeftIcon size={24} className="text-primary" />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2 text-right">
        <h2 className="text-h4 font-semibold text-primary">ایجاد حساب کاربری</h2>
        <p className="text-small text-text-muted font-normal leading-relaxed">
          اطلاعات خود را جهت ثبت‌نام وارد کنید.
        </p>
      </div>

      <div className="flex flex-col gap-4">
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
            <span className="text-caption text-error px-1 text-right">{errors.fullName}</span>
          )}
        </div>

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
            <span className="text-caption text-error px-1 text-right">{errors.nationalCode}</span>
          )}
        </div>

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

      <Checkbox
        checked={acceptedTerms}
        onChange={setAcceptedTerms}
        label={
          <>
            <span
              role="button"
              tabIndex={0}
              onClick={openTerms}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") openTerms(e);
              }}
              className="text-primary cursor-pointer"
            >
              شرایط
            </span>{" "}
            بهره‌مندی از خدمات تگ مال را می‌پذیرم
          </>
        }
      />

      <button
        type="submit"
        disabled={isConfirming || !isFormValid}
        className={`w-full h-12.5 rounded-2xl text-h5 font-semibold transition-all duration-200 flex items-center justify-center ${
          !isConfirming && isFormValid
            ? "bg-primary text-white hover:bg-primary-600 active:scale-[0.99] cursor-pointer shadow-sm"
            : "bg-surface border border-border-default text-text-muted cursor-not-allowed opacity-80"
        }`}
      >
        {isConfirming ? "در حال ثبت نام..." : "ثبت نام"}
      </button>
    </form>

    <ResponsiveModal
      isOpen={isTermsOpen}
      onClose={closeTerms}
      title="شرایط و قوانین تگ مال"
      nested
      isHintBox
    >
      <div className="text-sm text-gray-600 leading-8 text-justify space-y-3">
        <p>
          استفاده از خدمات تگ مال به معنای پذیرش شرایط و قوانین زیر است. این متن فعلاً برای تست
          نمایش داده می‌شود و نسخه نهایی قوانین به‌زودی جایگزین آن خواهد شد.
        </p>
        <p>
          کاربران موظف‌اند اطلاعات صحیح وارد کنند و از هرگونه سوءاستفاده از سرویس خودداری نمایند.
          تگ مال حق به‌روزرسانی این شرایط را برای خود محفوظ می‌دارد.
        </p>
        <p>
          در صورت نیاز به پشتیبانی، می‌توانید از بخش پشتیبانی داخل اپلیکیشن با ما در ارتباط باشید.
        </p>
      </div>
    </ResponsiveModal>
  </>
  );
}

export default LoginUserRegisteration;