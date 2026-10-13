import { GlobeIcon, MailIcon, MessageCircleIcon, PhoneIcon, SendIcon } from "lucide-react"
import type { PageContacts } from "@/lib/page"

// The contacts' icons, shared by the page, the editor and the booking page.

function InstagramGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export const CONTACT_ICON: Record<keyof PageContacts, React.ReactNode> = {
  instagram: <InstagramGlyph />,
  telegram: <SendIcon className="size-4" />,
  viber: <MessageCircleIcon className="size-4" />,
  whatsapp: <MessageCircleIcon className="size-4" />,
  phone: <PhoneIcon className="size-4" />,
  email: <MailIcon className="size-4" />,
  website: <GlobeIcon className="size-4" />,
}
