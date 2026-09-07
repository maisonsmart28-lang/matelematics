"use client";

import Footer from "@/components/Footer";
import DemoModal from "@/components/DemoModal";
import { DemoModalProvider } from "@/components/DemoContext";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DemoModalProvider>
      <main className="min-h-screen bg-white">
        {children}
      </main>

      <Footer />

      <DemoModal />
    </DemoModalProvider>
  );
}