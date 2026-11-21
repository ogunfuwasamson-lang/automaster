import { MessageCircle } from "lucide-react";
import { CHANNELS } from "@/lib/site";

// the "Global Scholarship by Ivyward AI" whatsapp channel: 5 scholarship and funding posts a day. a card where
// someone is looking for funding, a line where space is short.
export function WhatsAppChannel({ variant = "card", className = "" }: { variant?: "card" | "compact"; className?: string }) {
  if (variant === "compact")
    return (
      <a href={CHANNELS.whatsapp} target="_blank" rel="noopener" className={`group flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-[13.5px] leading-snug transition-colors hover:border-[#25D366]/50 ${className}`}>
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#25D366]/12 text-[#128C7E]">
          <MessageCircle className="size-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">5 scholarships a day on WhatsApp</span>
          <span className="block text-muted">Follow Global Scholarship by Ivyward AI</span>
        </span>
        <span className="shrink-0 font-medium text-[#128C7E] group-hover:underline">Follow</span>
      </a>
    );
  return (
    <section aria-label="Scholarships on WhatsApp" className={`flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 shadow-card sm:flex-row sm:items-center ${className}`}>
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#25D366]/12 text-[#128C7E]">
        <MessageCircle className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-serif text-[19px] leading-snug">New scholarships every day, on WhatsApp</p>
        <p className="mt-1 text-[14px] leading-relaxed text-muted">
          Follow Global Scholarship by Ivyward AI: 5 scholarship and funding opportunities a day for study in the US, UK, Canada, Germany and more, each with its deadline.
        </p>
      </div>
      <a href={CHANNELS.whatsapp} target="_blank" rel="noopener" className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[#128C7E] px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-[#0f7a6e]">
        Follow the channel
      </a>
    </section>
  );
}
