"use client";

import { useMediaQuery } from "@/hooks/useMediaQuery";
import DialogWrapper from "@/components/ui/dialog";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import AuthCard from "./AuthCard";

function LoginContent({ isOpen, setIsOpen }) {
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const close = () => {
    setIsOpen(false);
  };

  return isDesktop ? (
    <DialogWrapper
      isOpen={isOpen}
      onClose={close}
      showCloseButton={false}
      className="p-10 max-w-[460px] rounded-[28px] border-border-default shadow-modal lg:p-10 lg:max-w-[460px]"
    >
      <AuthCard onSuccess={close} />
    </DialogWrapper>
  ) : (
    <Drawer open={isOpen} onOpenChange={close}>
      <DrawerContent
        className="z-100! h-[96%]! px-[10px]"
        overlayClassName="z-100"
      >
        <AuthCard onSuccess={close} />
      </DrawerContent>
    </Drawer>
  );
}

export default LoginContent;
