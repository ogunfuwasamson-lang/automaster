import { IVYWARD_WHATSAPP } from "@/lib/whatsapp-rules";

// starting on WhatsApp instead of the website (lib/whatsapp-onboard): the chat opens with a hello already typed, and
// an invite code they arrived with goes along so the friend who invited them is credited
export function whatsappStartUrl(ref?: string | null) {
  const text = `Hi Ivyward${ref && /^[a-z0-9]{4,16}$/i.test(ref) ? ` (ref: ${ref.toLowerCase()})` : ""}`;
  return `https://wa.me/${IVYWARD_WHATSAPP}?text=${encodeURIComponent(text)}`;
}

export function WhatsAppStart({ refCode, className = "" }: { refCode?: string | null; className?: string }) {
  return (
    <p className={`text-[13px] text-muted ${className}`}>
      Rather use WhatsApp?{" "}
      <a href={whatsappStartUrl(refCode)} target="_blank" rel="noopener noreferrer" className="font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-ink">
        Start on WhatsApp
      </a>{" "}
      and set up in the chat.
    </p>
  );
}
