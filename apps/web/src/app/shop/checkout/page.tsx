"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    CreditCard,
    QrCode,
    Tag,
    ArrowLeft,
    ShieldCheck,
    ShoppingBag,
    X,
    CheckCircle2,
    Loader2,
    Ticket,
    Check,
    Clock,
    AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { apiFetch } from "@/lib/api";
import { formatVND, lineTotal, LOGIN_PATH } from "@/lib/shop";

export default function CheckoutPage() {
    const router = useRouter();
    const { items, totalPrice, hydrated, remove } = useCart() as any;
    const { isAuthenticated, isLoading: authLoading } = useAuth();

    const [paymentMethod, setPaymentMethod] = useState<"WALLET" | "CARD">("WALLET");
    const [couponCode, setCouponCode] = useState("");
    const [discountAmount, setDiscountAmount] = useState(0);
    const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
    const [note, setNote] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const [showQrModal, setShowQrModal] = useState(false);
    const [pendingOrder, setPendingOrder] = useState<any>(null);
    const [showCouponModal, setShowCouponModal] = useState(false);
    const [activeCoupons, setActiveCoupons] = useState<any[]>([]);
    const [loadingCoupons, setLoadingCoupons] = useState(false);

    const finalTotal = Math.max(0, totalPrice - discountAmount);

    useEffect(() => {
        if (!isAuthenticated) return;
        setLoadingCoupons(true);
        apiFetch<any>("/coupons/active")
            .then((res) => {
                const list = Array.isArray(res) ? res : res?.data || [];
                setActiveCoupons(list);
            })
            .catch(() => setActiveCoupons([]))
            .finally(() => setLoadingCoupons(false));
    }, [isAuthenticated]);

    const applyCouponByCode = async (codeToApply: string) => {
        if (!codeToApply.trim()) return;
        try {
            const orderPrice = Number(totalPrice || 0);
            const res: any = await apiFetch("/coupons/validate", {
                method: "POST",
                body: JSON.stringify({
                    code: codeToApply.trim().toUpperCase(),
                    orderTotal: orderPrice,
                }),
            });

            const discount = Number(res?.discountAmount ?? 0);
            setDiscountAmount(discount);
            setAppliedCoupon(codeToApply.trim().toUpperCase());
            setCouponCode(codeToApply.trim().toUpperCase());
            setShowCouponModal(false);
            toast.success(`Đã áp dụng mã ${res?.code || codeToApply.toUpperCase()}: -${formatVND(discount)}`);
        } catch (err: any) {
            toast.error(err.message || "Mã giảm giá không hợp lệ");
        }
    };

    const handleRemoveCoupon = () => {
        setDiscountAmount(0);
        setAppliedCoupon(null);
        setCouponCode("");
        toast.info("Đã gỡ mã giảm giá");
    };

    const createOrder = async () => {
        const orderPayload = {
            couponCode: appliedCoupon || undefined,
            items: items.map((i: any) => ({
                productId: Number(i.productId || i.id),
                size: (i.sizeName || i.size || "M").toUpperCase(),
                quantity: Number(i.qty || 1),
                toppingIds: i.toppings?.map((t: any) => Number(t.id)) || [],
            })),
            note: note.trim() || undefined,
        };

        const orderData: any = await apiFetch("/orders", {
            method: "POST",
            body: JSON.stringify(orderPayload),
        });

        return orderData?.data ?? orderData;
    };

    // Hàm thực thi thanh toán: hỗ trợ cờ simulateFailure và sinh Idempotency Key mới cho từng lần bấm
    const executePayment = async (orderId: number, orderCode: string, simulateFailure: boolean = false) => {
        setSubmitting(true);
        const currentKey = typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `idemp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

        try {
            const res: any = await apiFetch("/payments", {
                method: "POST",
                headers: { "idempotency-key": currentKey },
                body: JSON.stringify({
                    orderId: Number(orderId),
                    method: paymentMethod,
                    amount: finalTotal,
                    idempotencyKey: currentKey,
                    simulateFailure: Boolean(simulateFailure),
                }),
            });

            // Xóa giỏ hàng local vì đơn đã được ghi nhận trên cơ sở dữ liệu
            items.forEach((item: any) => remove?.(item.key));

            // Nhánh thất bại: Chuyển hướng sang trang fail chuyên biệt
            if (simulateFailure || res?.success === false || res?.orderStatus === "PAYMENT_FAILED") {
                toast.error(res?.message || "Giao dịch thanh toán thất bại!");
                setShowQrModal(false);
                router.push(`/shop/checkout/fail?orderCode=${orderCode}&orderId=${orderId}`);
                return;
            }

            // Nhánh thành công: Chuyển hướng sang trang success
            const points = res?.loyaltyPointsEarned ?? Math.floor(finalTotal / 10000);
            toast.success(`Thanh toán thành công! Nhận được +${points} Beans`);
            setShowQrModal(false);
            router.push(`/shop/checkout/success?orderCode=${orderCode}&status=PAID`);
        } catch (error: any) {
            items.forEach((item: any) => remove?.(item.key));
            toast.error(error.message || "Thanh toán thất bại, vui lòng kiểm tra lại đơn!");
            setShowQrModal(false);
            router.push(`/shop/checkout/fail?orderCode=${orderCode}&orderId=${orderId}`);
        } finally {
            setSubmitting(false);
        }
    };

    const handleCheckoutClick = async () => {
        if (!items || items.length === 0) {
            toast.error("Giỏ hàng đang trống");
            return;
        }

        setSubmitting(true);
        try {
            const order = await createOrder();
            const orderId = order?.id;
            const orderCode = order?.orderCode || orderId;

            if (paymentMethod === "WALLET") {
                setPendingOrder({ orderId, orderCode });
                setShowQrModal(true);
                setSubmitting(false);
            } else {
                await executePayment(orderId, orderCode, false);
            }
        } catch (err: any) {
            toast.error(err.message || "Lỗi tạo đơn hàng");
            setSubmitting(false);
        }
    };

    if (!hydrated || authLoading) return <Skeleton className="h-64 rounded-2xl bg-[#E8E2D9]/50" aria-busy="true" />;

    if (!isAuthenticated) {
        return (
            <div
                className="bg-[#FFFFFF] border border-[#E8E2D9] rounded-xl py-12 text-center shadow-xs"
                style={{
                    "--text-main": "#2B2118",
                    "--text-muted": "#6B5E52",
                    "--accent": "#B45F2B",
                } as React.CSSProperties}
            >
                <ShoppingBag className="w-10 h-10 mx-auto text-[#6B5E52]/60" />
                <h1 className="text-xl font-bold mt-4 text-[#2B2118]">Vui lòng đăng nhập</h1>
                <p className="text-sm text-[#6B5E52] mt-1">Bạn cần đăng nhập để đặt và theo dõi đơn hàng.</p>
                <Button asChild className="rounded-xl mt-5 bg-[#B45F2B] hover:bg-[#9A4F22] text-white">
                    <Link href={`${LOGIN_PATH}?redirect=/shop/checkout`}>Đăng nhập ngay</Link>
                </Button>
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="bg-[#FFFFFF] border border-[#E8E2D9] rounded-xl py-12 text-center shadow-xs">
                <h1 className="text-xl font-bold text-[#2B2118]">Giỏ hàng trống</h1>
                <Button asChild className="rounded-xl mt-4 bg-[#B45F2B] hover:bg-[#9A4F22] text-white">
                    <Link href="/shop">Quay lại chọn món</Link>
                </Button>
            </div>
        );
    }

    return (
        <div
            className="w-full min-h-screen bg-[#FAF7F2] py-8 px-4 sm:px-6"
            style={{
                "--bg-page": "#FAF7F2",
                "--bg-card": "#FFFFFF",
                "--border-color": "#E8E2D9",
                "--text-main": "#2B2118",
                "--text-muted": "#6B5E52",
                "--accent": "#B45F2B",
                "--accent-hover": "#9A4F22",
                "--accent-light": "#FDF1E7",
            } as React.CSSProperties}
        >
            <div className="max-w-3xl mx-auto space-y-6 pb-12">
                {/* Header trang */}
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        asChild
                        className="rounded-xl text-[#2B2118] hover:bg-[#E8E2D9]/50 hover:text-[#2B2118]"
                    >
                        <Link href="/shop/cart" aria-label="Quay lại giỏ hàng">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                    </Button>
                    <h1 className="text-2xl font-bold tracking-tight text-[#2B2118]">
                        Thanh toán không tiền mặt
                    </h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                    {/* Cột trái: Form điều khiển */}
                    <div className="md:col-span-3 space-y-5">
                        {/* 1. Phương thức thanh toán */}
                        <div className="bg-[#FFFFFF] border border-[#E8E2D9] rounded-xl p-5 shadow-xs space-y-4">
                            <h2 className="font-semibold text-sm text-[#2B2118] flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-[#B45F2B]" />
                                Phương thức thanh toán
                            </h2>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod("WALLET")}
                                    className={`p-4 rounded-xl text-left transition-all relative ${
                                        paymentMethod === "WALLET"
                                            ? "border-2 border-[#B45F2B] bg-[#FDF1E7] shadow-xs"
                                            : "border border-[#E8E2D9] bg-[#FFFFFF] hover:border-[#B45F2B]/40 hover:bg-[#FAF7F2]"
                                    }`}
                                >
                                    <QrCode className={`w-5 h-5 mb-2.5 ${
                                        paymentMethod === "WALLET" ? "text-[#B45F2B]" : "text-[#6B5E52]"
                                    }`} />
                                    <div className="text-sm font-semibold text-[#2B2118] leading-tight">
                                        Mã QR / Ví điện tử
                                    </div>
                                    <div className="text-xs text-[#6B5E52] font-normal mt-1">
                                        VietQR, MoMo, ZaloPay
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod("CARD")}
                                    className={`p-4 rounded-xl text-left transition-all relative ${
                                        paymentMethod === "CARD"
                                            ? "border-2 border-[#B45F2B] bg-[#FDF1E7] shadow-xs"
                                            : "border border-[#E8E2D9] bg-[#FFFFFF] hover:border-[#B45F2B]/40 hover:bg-[#FAF7F2]"
                                    }`}
                                >
                                    <CreditCard className={`w-5 h-5 mb-2.5 ${
                                        paymentMethod === "CARD" ? "text-[#B45F2B]" : "text-[#6B5E52]"
                                    }`} />
                                    <div className="text-sm font-semibold text-[#2B2118] leading-tight">
                                        Thẻ ngân hàng
                                    </div>
                                    <div className="text-xs text-[#6B5E52] font-normal mt-1">
                                        ATM / Visa / Mastercard
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* 2. Mã khuyến mãi / Coupon */}
                        <div className="bg-[#FFFFFF] border border-[#E8E2D9] rounded-xl p-5 shadow-xs space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="font-semibold text-sm text-[#2B2118] flex items-center gap-2">
                                    <Tag className="w-4 h-4 text-[#B45F2B]" />
                                    Mã khuyến mãi
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setShowCouponModal(true)}
                                    className="text-xs font-semibold text-[#B45F2B] hover:text-[#9A4F22] hover:underline flex items-center gap-1.5 transition-colors"
                                >
                                    <Ticket className="w-3.5 h-3.5" />
                                    Chọn voucher ({activeCoupons.length})
                                </button>
                            </div>

                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Nhập mã giảm giá"
                                    value={couponCode}
                                    onChange={(e) => setCouponCode(e.target.value)}
                                    className="flex-1 bg-[#FFFFFF] border border-[#E8E2D9] rounded-xl px-3.5 py-2 text-sm uppercase font-semibold text-[#2B2118] placeholder:text-[#6B5E52]/60 focus:outline-none focus:border-[#B45F2B] focus:ring-2 focus:ring-[#B45F2B]/20 transition-all"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="rounded-xl font-semibold border-[#E8E2D9] text-[#2B2118] hover:bg-[#FAF7F2] hover:text-[#2B2118] transition-colors"
                                    onClick={() => applyCouponByCode(couponCode)}
                                >
                                    Áp dụng
                                </Button>
                            </div>

                            {appliedCoupon && (
                                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2 text-xs">
                                    <span className="font-semibold text-emerald-900 flex items-center gap-2">
                                        <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                                        Đã áp dụng mã <span className="font-bold underline">{appliedCoupon}</span> (-{formatVND(discountAmount)})
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handleRemoveCoupon}
                                        className="text-[#6B5E52] hover:text-rose-600 p-0.5 rounded transition-colors"
                                        title="Gỡ mã giảm giá"
                                    >
                                        <X className="w-4 h-4 stroke-[2.5]" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* 3. Ghi chú cho quán */}
                        <div className="bg-[#FFFFFF] border border-[#E8E2D9] rounded-xl p-5 shadow-xs space-y-2">
                            <label className="font-semibold text-sm text-[#2B2118]">
                                Ghi chú cho Barista
                            </label>
                            <textarea
                                rows={2}
                                placeholder="Ít ngọt, ít đá, mang đi..."
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                className="w-full bg-[#FFFFFF] border border-[#E8E2D9] rounded-xl p-3 text-sm text-[#2B2118] placeholder:text-[#6B5E52]/60 focus:outline-none focus:border-[#B45F2B] focus:ring-2 focus:ring-[#B45F2B]/20 transition-all resize-none"
                            />
                        </div>
                    </div>

                    {/* Cột phải: Tóm tắt đơn */}
                    <div className="md:col-span-2 space-y-5">
                        <div className="bg-[#FFFFFF] border border-[#E8E2D9] rounded-xl p-5 shadow-xs space-y-4">
                            <h2 className="font-semibold text-base border-b border-[#E8E2D9] pb-3 text-[#2B2118]">
                                Tóm tắt đơn ({items.length} món)
                            </h2>
                            <ul className="divide-y divide-[#E8E2D9] text-sm max-h-56 overflow-y-auto pr-1 space-y-2">
                                {items.map((i: any) => (
                                    <li key={i.key} className="pt-2 first:pt-0 flex justify-between items-start">
                                        <div>
                                            <p className="font-medium text-[#2B2118]">{i.name} x{i.qty}</p>
                                            {i.sizeName && <p className="text-xs text-[#6B5E52]">Size {i.sizeName}</p>}
                                        </div>
                                        <span className="font-semibold text-[#2B2118]">{formatVND(lineTotal(i))}</span>
                                    </li>
                                ))}
                            </ul>

                            <div className="space-y-2 pt-3 border-t border-[#E8E2D9] text-sm">
                                <div className="flex justify-between text-[#6B5E52]">
                                    <span>Tạm tính:</span>
                                    <span className="font-medium">{formatVND(totalPrice)}</span>
                                </div>
                                {discountAmount > 0 && (
                                    <div className="flex justify-between text-emerald-800 font-semibold">
                                        <span>Giảm giá:</span>
                                        <span>-{formatVND(discountAmount)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-baseline pt-2 border-t border-[#E8E2D9]">
                                    <span className="font-bold text-base text-[#2B2118]">Tổng thanh toán:</span>
                                    <span className="font-extrabold text-xl text-[#B45F2B] tracking-tight">
                                        {formatVND(finalTotal)}
                                    </span>
                                </div>
                            </div>

                            <Button
                                className="w-full rounded-xl py-6 font-bold text-base bg-[#B45F2B] hover:bg-[#9A4F22] text-white shadow-md shadow-[#B45F2B]/20 transition-all focus:outline-none focus:ring-4 focus:ring-[#B45F2B]/25 active:scale-[0.99]"
                                disabled={submitting}
                                onClick={handleCheckoutClick}
                            >
                                {submitting ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" /> Đang xử lý...
                                    </span>
                                ) : paymentMethod === "WALLET" ? (
                                    `Mở mã QR · ${formatVND(finalTotal)}`
                                ) : (
                                    `Thanh toán thẻ · ${formatVND(finalTotal)}`
                                )}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* MODAL 1: BẢNG CHỌN COUPON */}
                {showCouponModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4 animate-in fade-in duration-200">
                        <div className="bg-[#FFFFFF] border border-[#E8E2D9] w-full max-w-md rounded-xl p-6 shadow-xl relative space-y-4">
                            <div className="flex items-center justify-between border-b border-[#E8E2D9] pb-3">
                                <div className="flex items-center gap-2">
                                    <Ticket className="w-5 h-5 text-[#B45F2B]" />
                                    <h3 className="font-bold text-base text-[#2B2118]">Chọn mã ưu đãi BrewLite</h3>
                                </div>
                                <button
                                    onClick={() => setShowCouponModal(false)}
                                    className="text-[#6B5E52] hover:text-[#2B2118] p-1 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="max-h-80 overflow-y-auto space-y-2.5 pr-1">
                                {loadingCoupons ? (
                                    <div className="space-y-2 py-4">
                                        <Skeleton className="h-16 w-full rounded-xl bg-[#E8E2D9]/50" />
                                        <Skeleton className="h-16 w-full rounded-xl bg-[#E8E2D9]/50" />
                                    </div>
                                ) : activeCoupons.length === 0 ? (
                                    <div className="text-center py-8 text-[#6B5E52] text-sm">
                                        Hiện chưa có mã giảm giá nào đang áp dụng.
                                    </div>
                                ) : (
                                    activeCoupons.map((coupon: any) => {
                                        const isEligible = totalPrice >= coupon.minOrderValue;
                                        const isCurrent = appliedCoupon === coupon.code;
                                        const diffToOrder = coupon.minOrderValue - totalPrice;

                                        return (
                                            <div
                                                key={coupon.id}
                                                className={`p-3.5 rounded-xl transition-all relative ${
                                                    isCurrent
                                                        ? "border-2 border-[#B45F2B] bg-[#FDF1E7]"
                                                        : isEligible
                                                            ? "border border-[#E8E2D9] bg-[#FFFFFF] hover:border-[#B45F2B]/40"
                                                            : "border border-[#E8E2D9] bg-[#FAF7F2] opacity-60"
                                                }`}
                                            >
                                                <div className="flex justify-between items-start gap-2">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono font-bold text-xs tracking-wider text-[#B45F2B] bg-[#FDF1E7] border border-[#B45F2B]/30 px-2 py-0.5 rounded-md">
                                                                {coupon.code}
                                                            </span>
                                                            <span className="text-xs font-bold text-emerald-800">
                                                                {coupon.type === "PERCENT"
                                                                    ? `Giảm ${coupon.value}%`
                                                                    : `Giảm ${formatVND(coupon.value)}`}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-[#6B5E52] mt-1.5">
                                                            Đơn tối thiểu {formatVND(coupon.minOrderValue)}
                                                            {coupon.maxDiscount ? ` · Tối đa ${formatVND(coupon.maxDiscount)}` : ""}
                                                        </p>
                                                        <p className="text-[11px] text-[#6B5E52] mt-1 flex items-center gap-1">
                                                            <Clock className="w-3 h-3 text-[#B45F2B]" /> HSD: {new Date(coupon.expiresAt).toLocaleDateString("vi-VN")}
                                                        </p>
                                                    </div>

                                                    <div>
                                                        {isCurrent ? (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="rounded-lg text-xs h-8 border-[#B45F2B] text-[#B45F2B] hover:bg-[#FDF1E7]"
                                                                onClick={handleRemoveCoupon}
                                                            >
                                                                Bỏ chọn
                                                            </Button>
                                                        ) : isEligible ? (
                                                            <Button
                                                                size="sm"
                                                                className="rounded-lg bg-[#B45F2B] hover:bg-[#9A4F22] text-white text-xs font-semibold h-8"
                                                                onClick={() => applyCouponByCode(coupon.code)}
                                                            >
                                                                Dùng ngay
                                                            </Button>
                                                        ) : (
                                                            <span className="text-[10px] text-[#6B5E52] font-medium block text-right pt-1">
                                                                Mua thêm {formatVND(diffToOrder)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL 2: MÃ QR THANH TOÁN (VIETQR) */}
                {showQrModal && pendingOrder && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
                        <div className="bg-[#FFFFFF] border border-[#E8E2D9] w-full max-w-sm rounded-xl p-6 shadow-2xl relative space-y-4 text-center">
                            <button
                                onClick={() => {
                                    items.forEach((item: any) => remove?.(item.key));
                                    setShowQrModal(false);
                                    router.push(`/shop/checkout/fail?orderCode=${pendingOrder.orderCode}&orderId=${pendingOrder.orderId}`);
                                }}
                                className="absolute right-4 top-4 text-[#6B5E52] hover:text-[#2B2118] p-1"
                                title="Đóng và xem đơn hàng"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="space-y-1">
                                <span className="text-xs uppercase font-bold text-[#B45F2B] tracking-wider">
                                    Quét mã chuyển khoản
                                </span>
                                <h3 className="text-lg font-bold text-[#2B2118]">VietQR Cà Phê BrewLite</h3>
                                <p className="text-xs text-[#6B5E52]">
                                    Quét bằng app Ngân hàng bất kỳ hoặc MoMo/ZaloPay
                                </p>
                            </div>

                            <div className="bg-[#FFFFFF] p-3 rounded-xl border border-[#E8E2D9] inline-block shadow-2xs mx-auto">
                                <img
                                    src={`https://api.vietqr.io/image/970422-0901234567-compact2.jpg?amount=${finalTotal}&addInfo=BREWLITE%20${pendingOrder.orderCode}&accountName=BREWLITE%20COFFEE`}
                                    alt="Mã VietQR"
                                    className="w-52 h-52 object-contain mx-auto"
                                />
                            </div>

                            <div className="bg-[#FAF7F2] rounded-xl p-3 text-xs text-left space-y-1 border border-[#E8E2D9]">
                                <div className="flex justify-between">
                                    <span className="text-[#6B5E52]">Mã đơn:</span>
                                    <span className="font-mono font-bold text-[#2B2118]">#{pendingOrder.orderCode}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[#6B5E52]">Số tiền:</span>
                                    <span className="font-bold text-[#B45F2B]">{formatVND(finalTotal)}</span>
                                </div>
                            </div>

                            <div className="space-y-2.5 pt-1">
                                {/* 1. Nút thanh toán thành công (Xanh lá) */}
                                <Button
                                    className="w-full rounded-xl py-5 font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2"
                                    disabled={submitting}
                                    onClick={() => executePayment(pendingOrder.orderId, pendingOrder.orderCode, false)}
                                >
                                    {submitting ? (
                                        <span className="flex items-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin" /> Đang hoàn tất đơn hàng...
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-white" /> Xác nhận đã chuyển khoản (Demo)
                                        </span>
                                    )}
                                </Button>

                                {/* 2. Nút giả lập thanh toán thất bại (Nền đỏ nổi bật đồng bộ) */}
                                <Button
                                    type="button"
                                    disabled={submitting}
                                    onClick={() => executePayment(pendingOrder.orderId, pendingOrder.orderCode, true)}
                                    className="w-full rounded-xl py-5 font-bold bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/20 flex items-center justify-center gap-2 transition-all"
                                >
                                    <AlertTriangle className="w-4 h-4 text-white" />
                                    <span>Giả lập thanh toán thất bại (Demo)</span>
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}