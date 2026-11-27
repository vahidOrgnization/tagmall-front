"use client";

import { useCallback, useEffect, useState } from "react";
import LoginEnterPhone from "./LoginEnterPhone";
import LoginOtp from "./LoginOtp";
import LoginUserRegisteration from "./LoginUserRegisteration";

function AuthCard({ onSuccess, onStepChange }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [enteredOtp, setEnteredOtp] = useState("");
  const [otpExpireTime, setOtpExpireTime] = useState(0);
  const [isNewUser, setIsNewUser] = useState(null);

  const handleNextStep = useCallback(() => {
    setCurrentStep((step) => (step < 3 ? step + 1 : step));
  }, []);

  const handlePreviousStep = useCallback(() => {
    setCurrentStep((step) => (step > 1 ? step - 1 : step));
  }, []);

  const handleSuccess = useCallback(() => {
    onSuccess?.();
  }, [onSuccess]);

  useEffect(() => {
    onStepChange?.(currentStep, handlePreviousStep);
  }, [currentStep, handlePreviousStep, onStepChange]);

  if (currentStep === 1) {
    return (
      <LoginEnterPhone
        handleNextStep={handleNextStep}
        phoneNumber={phoneNumber}
        setPhoneNumber={setPhoneNumber}
        setOtpExpireTime={setOtpExpireTime}
        setIsNewUser={setIsNewUser}
      />
    );
  }

  if (currentStep === 2) {
    return (
      <LoginOtp
        handleNextStep={handleNextStep}
        handlePreviousStep={handlePreviousStep}
        phoneNumber={phoneNumber}
        setEnteredOtp={setEnteredOtp}
        otpExpireTime={otpExpireTime}
        isNewUser={isNewUser}
        onSuccess={handleSuccess}
      />
    );
  }

  return (
    <LoginUserRegisteration
      phoneNumber={phoneNumber}
      enteredOtp={enteredOtp}
      handlePreviousStep={handlePreviousStep}
      onSuccess={handleSuccess}
    />
  );
}

export default AuthCard;