"use client";

import { useState } from "react";
import LoginEnterPhone from "./LoginEnterPhone";
import LoginOtp from "./LoginOtp";
import LoginUserRegisteration from "./LoginUserRegisteration";

function AuthCard({ onSuccess }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [enteredOtp, setEnteredOtp] = useState("");
  const [otpExpireTime, setOtpExpireTime] = useState(0);
  const [isNewUser, setIsNewUser] = useState(null);
  const [receivedOtp, setReceivedOtp] = useState("");

  const handleNextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSuccess = () => {
    if (onSuccess) onSuccess();
  };

  if (currentStep === 1) {
    return (
      <LoginEnterPhone
        handleNextStep={handleNextStep}
        phoneNumber={phoneNumber}
        setPhoneNumber={setPhoneNumber}
        setOtpExpireTime={setOtpExpireTime}
        setIsNewUser={setIsNewUser}
        setReceivedOtp={setReceivedOtp}
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
        receivedOtp={receivedOtp}
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
