import type { ReactNode } from "react";
import { Clock, Coffee, Mail, MapPin, Phone } from "lucide-react";

const CONTACT = {
    address: "273 An Dương Vương, Phường 3, Quận 5, TP. Hồ Chí Minh",
    phone: "0900 000 000",
    email: "hello@brewlite.example",
    hours: "07:00 – 22:00 mỗi ngày",
};

const SOCIALS: { label: string; href: string; icon: ReactNode }[] = [
    {
        label: "Facebook", href: "https://facebook.com",
        icon: <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />,
    },
    {
        label: "Instagram", href: "https://instagram.com",
        icon: (<><rect x="2" y="2" width="20" height="20" rx="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></>),
    },
    {
        label: "YouTube", href: "https://youtube.com",
        icon: (<><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" /><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" /></>),
    },
];

export default function ShopFooter() {
    return (
        <footer className="mt-10 border-t border-[#E8E2D9] bg-white">
            <div className="max-w-6xl mx-auto px-6 py-8">
                <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                    {/* Thương hiệu */}
                    <div className="max-w-xs space-y-2">
                        <div className="inline-flex items-center gap-2">
                            <span className="w-8 h-8 rounded-full bg-[#B45F2B] flex items-center justify-center">
                                <Coffee className="w-4 h-4 text-white" />
                            </span>
                            <span className="text-lg font-black tracking-tight text-[#2B2118]">
                                Brew<span className="text-[#B45F2B]">Lite</span>
                            </span>
                        </div>
                        <p className="text-xs text-[#6B5E52] leading-relaxed">
                            Đặt trà và cà phê nhanh gọn, thanh toán không cần tiền mặt.
                        </p>
                    </div>

                    {/* Liên hệ + giờ mở cửa */}
                    <address className="not-italic grid grid-cols-1 gap-2.5 text-sm text-[#2B2118] sm:grid-cols-2 sm:gap-x-8">
                        <p className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-[#B45F2B]" />
                            <span className="leading-snug">{CONTACT.address}</span>
                        </p>
                        <p className="flex items-center gap-2">
                            <Clock className="w-4 h-4 shrink-0 text-[#B45F2B]" />
                            <span>{CONTACT.hours}</span>
                        </p>
                        <p className="flex items-center gap-2">
                            <Phone className="w-4 h-4 shrink-0 text-[#B45F2B]" />
                            <a href={`tel:${CONTACT.phone.replace(/\s/g, "")}`}>{CONTACT.phone}</a>
                        </p>
                        <p className="flex items-center gap-2">
                            <Mail className="w-4 h-4 shrink-0 text-[#B45F2B]" />
                            <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
                        </p>
                    </address>

                    {/* Mạng xã hội */}
                    <div className="flex items-center gap-2">
                        {SOCIALS.map((s) => (
                            <a
                                key={s.label}
                                href={s.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={s.label}
                                className="w-10 h-10 rounded-full border border-[#E8E2D9] flex items-center justify-center text-[#2B2118] hover:bg-[#B45F2B] hover:border-[#B45F2B] hover:text-white transition-colors"
                            >
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    {s.icon}
                                </svg>
                            </a>
                        ))}
                    </div>
                </div>

                <p className="mt-6 border-t border-[#E8E2D9] pt-4 text-center text-[11px] text-[#6B5E52] md:text-left">
                    © {new Date().getFullYear()} BrewLite — Đồ án môn Công nghệ Phần mềm, Đại học Sài Gòn (SGU)
                </p>
            </div>
        </footer>
    );
}
