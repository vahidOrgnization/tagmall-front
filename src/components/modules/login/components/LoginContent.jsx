"use client";

import { useCallback, useRef, useState } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import DialogWrapper from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import AuthCard from "./AuthCard";

function LoginContent({ isOpen, setIsOpen }) {
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [authStep, setAuthStep] = useState(1);
  const goBackRef = useRef(null);

  const close = () => {
    setIsOpen(false);
    setAuthStep(1);
    goBackRef.current = null;
  };

  const handleStepChange = useCallback((step, handlePreviousStep) => {
    setAuthStep(step);
    goBackRef.current = step === 2 ? handlePreviousStep : null;
  }, []);

  const authCard = (
    <AuthCard onSuccess={close} onStepChange={handleStepChange} />
  );

  return isDesktop ? (
    <DialogWrapper
      ariaTitle="ورود به حساب کاربری"
      onBack={
        authStep === 2
          ? () => {
              goBackRef.current?.();
            }
          : null
      }
      isOpen={isOpen}
      onClose={close}
      showCloseButton={false}
      className="p-10 max-w-[460px] rounded-[28px] border-border-default shadow-modal lg:p-10 lg:max-w-[460px]"
    >
      {authCard}
    </DialogWrapper>
  ) : (
    <Drawer open={isOpen} onOpenChange={close}>
      <DrawerContent
        className="z-100! h-[96%]! px-[10px]"
        overlayClassName="z-100"
        aria-describedby={undefined}
      >
        <DrawerTitle className="sr-only">ورود به حساب کاربری</DrawerTitle>
        {authCard}
      </DrawerContent>
    </Drawer>
  );
}

export default LoginContent;