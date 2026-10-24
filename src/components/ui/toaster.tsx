"use client";
import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      toastOptions={{
        className: "!rounded-xl !border !border-line !bg-surface !text-foreground !font-sans !shadow-lg",
      }}
    />
  );
}
