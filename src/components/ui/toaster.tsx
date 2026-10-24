"use client";
import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      toastOptions={{
        className: "!rounded-2xl !border !border-line !bg-surface !text-foreground !font-sans !font-medium !shadow-lift",
      }}
    />
  );
}
