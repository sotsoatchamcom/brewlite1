"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

interface NotificationItem {
    id: number;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
    orderId?: number;
    data?: { orderId?: number };
}

export default function NotificationBell() {
    const { user, isAuthenticated } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const loadData = useCallback(async () => {
        if (!isAuthenticated || !user?.id) return;

        try {
            // Truyền đúng query param ?userId= theo yêu cầu của NotificationsController
            const [countRes, listRes] = await Promise.all([
                apiFetch<{ count: number }>(`/notifications/me/unread-count?userId=${user.id}`).catch(() => ({ count: 0 })),
                apiFetch<any>(`/notifications/me?userId=${user.id}`).catch(() => ({ data: [] })),
            ]);

            setUnreadCount(countRes?.count ?? 0);

            // Xử lý đúng cấu trúc phân trang { data: [...], meta: {...} } của Backend
            const items = Array.isArray(listRes)
                ? listRes
                : Array.isArray(listRes?.data)
                    ? listRes.data
                    : [];

            setNotifications(items);
        } catch {
            // Bỏ qua lỗi ngầm khi mạng chập chờn
        }
    }, [isAuthenticated, user?.id]);

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 10000); // Tự động làm mới mỗi 10 giây
        return () => clearInterval(interval);
    }, [loadData]);

    // Đóng dropdown khi click ra ngoài
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const markAsRead = async (id: number) => {
        if (!user?.id) return;
        try {
            await apiFetch(`/notifications/me/${id}/read?userId=${user.id}`, { method: "PATCH" });
            setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
            setUnreadCount((c) => Math.max(0, c - 1));
        } catch (err: any) {
            toast.error(err.message || "Không thể cập nhật trạng thái");
        }
    };

    const markAllRead = async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            await apiFetch(`/notifications/me/read-all?userId=${user.id}`, { method: "PATCH" });
            setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
            setUnreadCount(0);
            toast.success("Đã đánh dấu đã đọc tất cả");
        } catch (err: any) {
            toast.error(err.message || "Lỗi thao tác");
        } finally {
            setLoading(false);
        }
    };

    // Xử lý khi click vào 1 dòng thông báo
    const handleItemClick = (item: NotificationItem) => {
        // 1. Đánh dấu đã đọc nếu chưa đọc
        if (!item.isRead) {
            markAsRead(item.id);
        }

        // 2. Bóc tách orderId từ property hoặc từ chuỗi "#50" trong title/message
        const orderId =
            item.orderId ??
            item.data?.orderId ??
            item.title?.match(/#(\d+)/)?.[1] ??
            item.message?.match(/#(\d+)/)?.[1];

        setOpen(false);

        if (!orderId) return;

        const targetAnchor = `order-${orderId}`;

        // 3. Nếu đang ở sẵn trang lịch sử đơn -> cuộn mượt và nhấp nháy viền
        if (pathname === "/shop/orders") {
            const el = document.getElementById(targetAnchor);
            if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
                el.classList.add("ring-2", "ring-[#B45F2B]", "shadow-lg");
                setTimeout(() => {
                    el.classList.remove("ring-2", "ring-[#B45F2B]", "shadow-lg");
                }, 3000);
            } else {
                window.location.hash = targetAnchor;
            }
        } else {
            // 4. Nếu đang ở trang khác -> điều hướng về trang orders kèm hash
            router.push(`/shop/orders#${targetAnchor}`);
        }
    };

    if (!isAuthenticated) return null;

    return (
        <div className="relative" ref={dropdownRef}>
            <Button
                variant="ghost"
                size="icon"
                className="relative rounded-xl text-[#2B2118] hover:bg-[#FAF7F2] hover:text-[#2B2118] transition-colors"
                aria-label="Thông báo đơn hàng"
                onClick={() => setOpen(!open)}
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#A12B1F] text-white text-[11px] font-bold h-5 min-w-[20px] px-1 rounded-full flex items-center justify-center ring-2 ring-[#FFFFFF] animate-pulse">
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                )}
            </Button>

            {open && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#FFFFFF] border border-[#E8E2D9] rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    <div className="flex items-center justify-between p-3.5 border-b border-[#E8E2D9] bg-[#FAF7F2]">
                        <span className="font-semibold text-sm text-[#2B2118]">Thông báo của bạn</span>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllRead}
                                disabled={loading}
                                className="text-xs text-[#B45F2B] hover:text-[#9A4F22] hover:underline flex items-center gap-1 font-semibold disabled:opacity-50 transition-colors"
                            >
                                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
                                Đọc tất cả
                            </button>
                        )}
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-[#E8E2D9]">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-xs text-[#6B5E52]">
                                Bạn chưa có thông báo nào
                            </div>
                        ) : (
                            notifications.map((item) => (
                                <div
                                    key={item.id}
                                    onClick={() => handleItemClick(item)}
                                    className={`p-3.5 transition-colors cursor-pointer text-left ${
                                        item.isRead ? "bg-[#FFFFFF] opacity-75" : "bg-[#FDF1E7]/50 hover:bg-[#FDF1E7]"
                                    }`}
                                >
                                    <div className="flex justify-between items-start gap-2">
                                        <p className={`text-xs ${item.isRead ? "font-medium text-[#2B2118]" : "font-bold text-[#2B2118]"}`}>
                                            {item.title}
                                        </p>
                                        {!item.isRead && (
                                            <span className="w-2 h-2 rounded-full bg-[#B45F2B] shrink-0 mt-1" />
                                        )}
                                    </div>
                                    <p className="text-xs text-[#6B5E52] mt-1 leading-relaxed">
                                        {item.message}
                                    </p>
                                    <span className="text-[10px] text-[#6B5E52]/80 mt-1.5 block">
                                        {new Date(item.createdAt).toLocaleTimeString("vi-VN", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                            day: "2-digit",
                                            month: "2-digit",
                                        })}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}