import { redirect } from "next/navigation";
import { hasSellerSession } from "@/lib/server/actions/seller-auth";
import SellerSessionGate from "@/components/modules/seller-auth/SellerSessionGate";
import {
  SellerSidebar,
  SellerBottomNav,
  SellerNavigationProvider,
} from "@/components/modules/seller-panel";

export const metadata = {
  title: "پنل فروشندگان | تگ مال",
  description: "پنل مدیریت فروشگاه و پیشخوان فروشندگان تگ مال",
};


export default async function SellerLayout({ children }) {
  if (!(await hasSellerSession())) redirect("/seller/login");
  return (
    <SellerSessionGate>
      <SellerNavigationProvider>
        <div className="theme-new min-h-screen bg-surface-muted bg-pattern-diagonal text-text-primary flex flex-col lg:flex-row">
          {/* Sidebar navigation (renders on right side in RTL on desktop, top bar + drawer on mobile) */}
          <SellerSidebar />

          {/* Main page content area (renders on left side in RTL) */}
          <main className="flex-1 min-w-0 flex flex-col">{children}</main>

          {/* Mobile fixed bottom navigation bar (Figma PWA 44:39566) */}
          <SellerBottomNav />
        </div>
      </SellerNavigationProvider>
    </SellerSessionGate>
  );
}
