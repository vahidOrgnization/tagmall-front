"use client";

import { StrokeArrowLeftIcon } from "@/icons";
import { toEnglishNumber } from "@/lib/client/utils";
import { useRef, useState } from "react";

function OtpInput({
  label,
  value,
  setValue,
  length = 5,
  error = "",
  disabled = false,
  onBack,
  className,
  containerClassName,
  variant = "default", // "default" | "boxes"
}) {
  const inputRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);

  const handleEnter = (e) => {
    const v = toEnglishNumber(e.target.value).replace(/[^0-9]/g, "");
    if (v.length <= length) setValue(v);
  };

  const handleContainerClick = () => {
    if (!disabled) inputRef.current?.focus();
  };

  if (variant === "boxes") {
    return (
      <div className={`flex flex-col gap-2 ${containerClassName ?? ""}`}>
        {label && (
          <div className="flex items-center justify-between">
            <label
              htmlFor="otp"
              className={`text-base transition-colors text-text-primary ${
                error ? "text-error" : ""
              }`}
            >
              {label}
            </label>
            {onBack ? (
              <StrokeArrowLeftIcon className="ml-4 cursor-pointer" onClick={onBack} size={20} />
            ) : null}
          </div>
        )}

        <div
          onClick={handleContainerClick}
          className={`relative w-full ${
            disabled ? "opacity-40 cursor-not-allowed" : "cursor-text"
          } ${className ?? ""}`}
        >
          {/* Hidden input */}
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            pattern="\d*"
            value={value}
            onChange={handleEnter}
            maxLength={length}
            className="absolute opacity-0 w-full h-full inset-0 z-10 cursor-text"
            autoComplete="one-time-code"
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={disabled}
          />

          {/* Individual OTP Boxes (Figma 60x60, rounded-2xl, border-border-default / border-primary) */}
          <div dir="ltr" className="flex items-center justify-between gap-3 w-full">
            {Array.from({ length }).map((_, index) => {
              const active = isFocused && value.length === index;
              const hasVal = Boolean(value[index]);

              let borderClass = "border-border-default";
              if (error) {
                borderClass = "border-error";
              } else if (active) {
                borderClass = "border-primary";
              } else if (hasVal) {
                borderClass = "border-primary-400";
              }

              return (
                <div
                  key={index}
                  className={`w-[60px] h-[60px] rounded-2xl border bg-surface flex items-center justify-center relative transition-colors ${borderClass}`}
                >
                  <span className="text-h4 font-bold text-text-primary select-none">
                    {value[index] || ""}
                  </span>

                  {active && !hasVal && (
                    <div className="absolute w-[2px] h-6 bg-primary animate-pulse" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {error && <p className="text-caption text-error px-1">{error}</p>}
      </div>
    );
  }

  // Default (Classic single container with lines) - Frozen & safe for mobile
  return (
    <div className={`flex flex-col gap-2 ${containerClassName ?? ""}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label
            htmlFor="otp"
            className={`text-base transition-colors text-gray-600 ${
              error ? "text-error-medium" : ""
            }`}
          >
            {label}
          </label>
          {onBack ? (
            <StrokeArrowLeftIcon className="ml-4" onClick={onBack} size={20} />
          ) : null}
        </div>
      )}

      {/* OtpInput box */}
      <div
        onClick={handleContainerClick}
        className={`relative w-full h-12 rounded-lg bg-gray-200 flex items-center justify-center transition-colors
          ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-text"}
           ${className ?? ""}`}
      >
        {/* Hidden input */}
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="\d*"
          value={value}
          onChange={handleEnter}
          maxLength={length}
          className="absolute opacity-0 w-full h-full"
          autoComplete="one-time-code"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
        />

        {/* Boxes */}
        <div dir="ltr" className="flex items-center gap-2">
          {Array.from({ length }).map((_, index) => {
            const active = isFocused && value.length === index;

            return (
              <div
                key={index}
                className="flex flex-col items-center w-8 relative"
              >
                {/* number */}
                <span className="text-xl font-medium h-6">
                  {value[index] ? value[index] : ""}
                </span>

                {/* Cursor */}
                {active && (
                  <div className="absolute bottom-1.5 w-[2px] h-4 bg-gray-800 animate-bounce" />
                )}

                {/* Line */}
                <div
                  className={`w-4 h-0.5 rounded-full transition-colors ${
                    value[index]
                      ? error
                        ? "bg-error-medium"
                        : "bg-primary"
                      : error
                        ? "bg-error-medium"
                        : "bg-gray-400"
                  }`}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Error message */}
      {error && <p className="text-xs text-error-medium mt-1">{error}</p>}
    </div>
  );
}

export default OtpInput;
