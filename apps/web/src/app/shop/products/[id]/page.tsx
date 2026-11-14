"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft,
    Coffee,
    Minus,
    Plus,
    ShoppingBag,
    Check,
    AlertCircle,
    RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import OptionFields from "@/components/shop/OptionFields";
import { useCart } from "@/contexts/CartContext";
import { apiFetch, getImageUrl } from "@/lib/api";
import { calcUnitPrice, formatVND, sortedSizes } from "@/lib/shop";
import type { Product, Topping } from "@/lib/types";

function QuantitySelector({
                              qty,
                              setQty,
                              max,
                              size = "lg",
                          }: {
    qty: number;
    setQty: React.Dispatch<React.SetStateAction<number>>;
    max: number | null;
    size?: "sm" | "lg";
}) {
    const atMax = max !== null && qty >= max;
    const btn = size === "lg" ? "h-11 w-11" : "h-10 w-10";
    const cls = `${btn} inline-flex items-center justify-center rounded-full text-[#2B2118] transition-colors hover:bg-[#FAF7F2] active:scale-95 disabled:opacity-40 disabled:hover:bg-transparent`;

    return (
        <div className="flex shrink-0 items-center rounded-full border border-[#E8E2D9] bg-white p-0.5">
            <button
                type="button"
                className={cls}
                aria-label="Giảm số lượng"
                disabled={qty <= 1}
                onClick={() => setQty((q) => Math.max(1, q - 1))}
            >
                <Minus className="w-4 h-4" />
            </button>
            <span className="w-8 text-center text-sm font-bold text-[#2B2118]" aria-live="polite">
                {qty}
            </span>
            <button
                type="button"
                className={cls}
                aria-label="Tăng số lượng"
                disabled={atMax}
                onClick={() => setQty((q) => q + 1)}
            >
                <Plus className="w-4 h-4" />
            </button>
        </div>
    );
}

export default function ProductDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { addItem } = useCart();

    const [product, setProduct] = useState<Product | null>(null);
    const [toppings, setToppings] = useState<Topping[]>([]);
    const [suggestedProducts, setSuggestedProducts] = useState<Product[]>([]);

    const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
    const [error, setError] = useState("");
    const [sizeId, setSizeId] = useState<number | null>(null);
    const [pickedIds, setPickedIds] = useState<number[]>([]);
    const [qty, setQty] = useState(1);
    const [adding, setAdding] = useState(false);
    const [added, setAdded] = useState(false);
    const [imgError, setImgError] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        if (!id) return;
        let alive = true;
        setStatus("loading");
        setError("");
        setPickedIds([]);
        setQty(1);
        setImgError(false);
        setAdded(false);

        Promise.all([
            apiFetch<Product>(`/products/${id}`),
            apiFetch<Topping[]>("/toppings?limit=100"),
            apiFetch<any>("/products?limit=8").catch(() => []),
        ])
            .then(([p, t, suggestData]) => {
                if (!alive) return;
                setProduct(p);
                setToppings(Array.isArray(t) ? t : []);
                setSizeId(sortedSizes(p)[0]?.id ?? null);

                const list = Array.isArray(suggestData) ? suggestData : (suggestData?.data || []);
                const filtered = list.filter((item: Product) => item.id !== p.id).slice(0, 4);
                setSuggestedProducts(filtered);

                setStatus("ready");
            })
            .catch((e: Error) => {
                if (!alive) return;
                setError(e.message);
                setStatus("error");
            });

        return () => {
            alive = false;
        };
    }, [id, reloadKey]);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }, [id]);

    useEffect(() => {
        if (!product) return;
        const prev = document.title;
        document.title = `${product.name} — Menu`;
        return () => {
            document.title = prev;
        };
    }, [product]);

    // Lọc danh sách topping hợp lệ theo danh mục của sản phẩm
    const availableToppings = useMemo(() => {
        if (!product) return [];

        // 1. Ưu tiên lấy toppings do backend trả về gắn liền với category
        const categoryToppings = (product as any).category?.toppings;
        if (Array.isArray(categoryToppings)) {
            return categoryToppings;
        }

        // 2. Dự phòng theo tên danh mục chuẩn nghiệp vụ
        const catName = (product.category?.name || "").toLowerCase();
        if (catName.includes("cà phê") || catName.includes("coffee")) {
            return [];
        }
        if (catName.includes("trái cây") || catName.includes("fruit")) {
            return toppings.filter((t) => {
                const name = t.name.toLowerCase();
                return name.includes("trái cây") || name.includes("trắng");
            });
        }

        return toppings;
    }, [product, toppings]);

    const stock = product?.stock ?? null;
    const unlimited = stock === null || stock === undefined;
    const soldOut = !unlimited && stock <= 0;
    const lowStock = !unlimited && !soldOut && stock > 0 && stock <= 5;
    const maxQty = unlimited ? null : stock;

    useEffect(() => {
        if (unlimited) return;
        setQty((q) => Math.min(Math.max(1, q), Math.max(1, stock as number)));
    }, [stock, unlimited]);

    const sizes = useMemo(() => (product ? sortedSizes(product) : []), [product]);
    const size = useMemo(() => sizes.find((s) => s.id === sizeId) ?? null, [sizes, sizeId]);
    const chosen = useMemo(
        () =>
            availableToppings
                .filter((t) => pickedIds.includes(t.id))
                .map((t) => ({ id: t.id, name: t.name, price: Number(t.price) })),
        [availableToppings, pickedIds]
    );

    const basePrice = Number(product?.price ?? 0);
    const sizeSurcharge = Number(size?.surcharge ?? 0);
    const toppingsPrice = useMemo(
        () => chosen.reduce((s, t) => s + Number(t.price || 0), 0),
        [chosen]
    );
    const unitPrice = calcUnitPrice(basePrice, sizeSurcharge, chosen);
    const totalPrice = unitPrice * qty;
    const hasExtra = unitPrice !== basePrice;

    const img = !imgError && product ? getImageUrl(product.imageUrl) : null;

    const toggle = (tid: number) =>
        setPickedIds((p) => (p.includes(tid) ? p.filter((x) => x !== tid) : [...p, tid]));

    const submit = () => {
        if (!product || soldOut || adding) return;
        setAdding(true);
        try {
            addItem({
                productId: product.id,
                name: product.name,
                imageUrl: product.imageUrl,
                sizeName: size?.name ?? null,
                sizeSurcharge,
                toppings: chosen,
                qty,
                basePrice,
                unitPrice,
                maxQty: unlimited ? 999999 : (stock as number),
            });
            setAdded(true);
            window.setTimeout(() => setAdded(false), 1200);
            toast.success(`Đã thêm ${product.name} vào giỏ`, {
                action: {
                    label: "Xem giỏ",
                    onClick: () => router.push("/shop/cart"),
                },
            });
        } catch {
            toast.error("Không thể thêm vào giỏ. Vui lòng thử lại.");
        } finally {
            setAdding(false);
        }
    };

    const backLink = (
        <Link
            href="/shop"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#6B5E52] transition-colors hover:text-[#2B2118]"
        >
            <ArrowLeft className="w-4 h-4" /> Quay lại menu
        </Link>
    );

    // Bọc ngoài: mobile tràn mép (bù padding của layout), desktop căn giữa
    const shell = "-mx-6 -mt-8 max-w-5xl md:mx-auto md:mt-0";

    /* ---------- LOADING ---------- */
    if (status === "loading") {
        return (
            <div className={shell} aria-busy="true" aria-label="Đang tải món">
                <div className="hidden md:block mb-5">{backLink}</div>
                <div className="md:grid md:grid-cols-12 md:gap-12">
                    <Skeleton className="aspect-[4/3] w-full rounded-none bg-[#E8E2D9]/60 md:col-span-5 md:aspect-square md:rounded-3xl" />
                    <div className="space-y-4 px-6 pt-6 md:col-span-7 md:px-0 md:pt-0">
                        <Skeleton className="h-5 w-24 rounded-full bg-[#E8E2D9]/60" />
                        <Skeleton className="h-8 w-3/4 rounded-xl bg-[#E8E2D9]/60" />
                        <Skeleton className="h-7 w-1/3 rounded-xl bg-[#E8E2D9]/60" />
                        <Skeleton className="h-16 w-full rounded-xl bg-[#E8E2D9]/60" />
                        <Skeleton className="h-40 w-full rounded-2xl bg-[#E8E2D9]/60" />
                    </div>
                </div>
            </div>
        );
    }

    /* ---------- ERROR / KHÔNG TÌM THẤY ---------- */
    if (status === "error" || !product) {
        return (
            <div className="mx-auto max-w-md py-6 text-center">
                <div className="mb-4 text-left">{backLink}</div>
                <div role="alert" className="rounded-2xl border border-[#E8E2D9] bg-white p-8">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#A12B1F]/10 text-[#A12B1F]">
                        <Coffee className="w-6 h-6" />
                    </div>
                    <h2 className="text-lg font-bold text-[#2B2118]">
                        {error ? "Không tải được món này" : "Không tìm thấy món này"}
                    </h2>
                    <p className="mt-1 text-sm text-[#6B5E52]">
                        {error || "Món có thể đã bị ẩn hoặc không còn trong menu."}
                    </p>
                    <div className="mt-6 grid gap-2">
                        <Button
                            onClick={() => setReloadKey((k) => k + 1)}
                            className="h-11 w-full gap-2 rounded-full bg-[#B45F2B] font-semibold text-white hover:bg-[#9A4F22]"
                        >
                            <RefreshCw className="w-4 h-4" /> Thử lại
                        </Button>
                        <Button
                            asChild
                            variant="outline"
                            className="h-11 w-full rounded-full border-[#E8E2D9] font-semibold text-[#2B2118] hover:bg-[#FAF7F2]"
                        >
                            <Link href="/shop">Về thực đơn</Link>
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    /* ---------- READY ---------- */
    const addLabel = soldOut ? "Hết hàng" : `Thêm vào giỏ · ${formatVND(totalPrice)}`;
    const addBtnCls =
        "flex-1 rounded-full bg-[#B45F2B] font-bold text-white transition-all hover:bg-[#9A4F22] active:scale-[0.98] disabled:bg-[#E8E2D9] disabled:text-[#6B5E52]";

    return (
        <div className={`${shell} pb-28 md:pb-10`}>
            <div className="hidden md:block mb-5">{backLink}</div>

            <div className="md:grid md:grid-cols-12 md:items-start md:gap-12">
                {/* ẢNH: tràn mép trên mobile, vuông bo góc trên desktop */}
                <div className="relative md:sticky md:top-24 md:col-span-5">
                    <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-[#FAF7F2] md:aspect-square md:rounded-3xl md:border md:border-[#E8E2D9]">
                        {img ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={img}
                                alt={product.name}
                                onError={() => setImgError(true)}
                                className={`h-full w-full object-cover ${soldOut ? "grayscale" : ""}`}
                            />
                        ) : (
                            <Coffee className="w-20 h-20 text-[#6B5E52]/40" />
                        )}
                        {soldOut && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-xs">
                                <span className="rounded-full bg-[#2B2118] px-4 py-2 text-sm font-bold text-white shadow-md">
                                    Tạm hết hàng
                                </span>
                            </div>
                        )}
                    </div>
                    {/* Nút quay lại nổi trên ảnh (mobile) */}
                    <Link
                        href="/shop"
                        aria-label="Quay lại menu"
                        className="absolute left-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[#2B2118] shadow-md backdrop-blur md:hidden"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                </div>

                {/* THÔNG TIN: thẻ trắng bo góc đè lên ảnh trên mobile */}
                <div className="relative z-10 -mt-6 space-y-5 rounded-t-3xl bg-white px-6 pb-4 pt-6 md:col-span-7 md:mt-0 md:rounded-none md:bg-transparent md:p-0">
                    <div>
                        {product.category?.name && (
                            <span className="mb-2 inline-block rounded-full bg-[#B45F2B]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#B45F2B]">
                                {product.category.name}
                            </span>
                        )}
                        <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-[#2B2118] md:text-4xl">
                            {product.name}
                        </h1>

                        <div className="mt-2 flex items-baseline gap-3" aria-live="polite">
                            <span className="text-2xl font-black text-[#B45F2B] md:text-3xl">
                                {formatVND(unitPrice)}
                            </span>
                            {hasExtra && (
                                <span className="text-sm text-[#6B5E52] line-through">
                                    {formatVND(basePrice)}
                                </span>
                            )}
                        </div>

                        {lowStock && (
                            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                                <AlertCircle className="w-3.5 h-3.5" />
                                Chỉ còn {stock} phần
                            </p>
                        )}

                        {product.description && (
                            <p className="mt-3 text-sm leading-relaxed text-[#6B5E52]">
                                {product.description}
                            </p>
                        )}
                    </div>

                    {/* Size & topping (đã lọc theo danh mục) */}
                    <div className="rounded-2xl border border-[#E8E2D9] bg-white p-4">
                        <div className="custom-scrollbar md:max-h-[45vh] md:overflow-y-auto md:pr-2">
                            <OptionFields
                                sizes={sizes}
                                sizeId={sizeId}
                                onSize={setSizeId}
                                toppings={availableToppings}
                                pickedIds={pickedIds}
                                onToggle={toggle}
                            />
                        </div>
                    </div>

                    {/* Tóm tắt giá */}
                    {(hasExtra || chosen.length > 0) && (
                        <div className="space-y-1.5 rounded-2xl border border-[#E8E2D9] bg-[#FAF7F2] p-4 text-sm">
                            <div className="flex justify-between text-[#6B5E52]">
                                <span>Giá cơ bản</span>
                                <span>{formatVND(basePrice)}</span>
                            </div>
                            {sizeSurcharge > 0 && (
                                <div className="flex justify-between text-[#6B5E52]">
                                    <span>Size {size?.name}</span>
                                    <span>+{formatVND(sizeSurcharge)}</span>
                                </div>
                            )}
                            {toppingsPrice > 0 && (
                                <div className="flex justify-between text-[#6B5E52]">
                                    <span>Topping ({chosen.length})</span>
                                    <span>+{formatVND(toppingsPrice)}</span>
                                </div>
                            )}
                            <div className="flex justify-between border-t border-[#E8E2D9] pt-2 font-bold text-[#2B2118]">
                                <span>Tạm tính / ly</span>
                                <span>{formatVND(unitPrice)}</span>
                            </div>
                        </div>
                    )}

                    {/* Nút thêm vào giỏ (desktop) */}
                    <div className="hidden items-center gap-3 pt-1 md:flex">
                        <QuantitySelector qty={qty} setQty={setQty} max={maxQty} size="lg" />
                        <Button onClick={submit} disabled={soldOut || adding} className={`h-12 text-base ${addBtnCls}`}>
                            {added ? (
                                <>
                                    <Check className="w-5 h-5 mr-2" /> Đã thêm
                                </>
                            ) : (
                                <>
                                    <ShoppingBag className="w-5 h-5 mr-2" />
                                    {addLabel}
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            {/* GỢI Ý: cuộn ngang trên mobile, lưới 4 cột trên desktop */}
            {suggestedProducts.length > 0 && (
                <section className="mt-6 px-6 md:mt-14 md:border-t md:border-[#E8E2D9] md:px-0 md:pt-8">
                    <h2 className="mb-3 text-lg font-bold text-[#2B2118] md:text-xl">Bạn có thể thích</h2>
                    <div className="flex snap-x gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-4 md:gap-4 md:overflow-visible">
                        {suggestedProducts.map((p) => (
                            <Link
                                href={`/shop/products/${p.id}`}
                                key={p.id}
                                className="group w-40 shrink-0 snap-start overflow-hidden rounded-2xl border border-[#E8E2D9] bg-white transition-shadow hover:shadow-md md:w-auto"
                            >
                                <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-[#FAF7F2]">
                                    {p.imageUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={getImageUrl(p.imageUrl)}
                                            alt={p.name}
                                            loading="lazy"
                                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                        />
                                    ) : (
                                        <Coffee className="w-8 h-8 text-[#6B5E52]/30" />
                                    )}
                                </div>
                                <div className="p-3">
                                    <p className="truncate text-sm font-semibold text-[#2B2118]">{p.name}</p>
                                    <p className="mt-1 text-sm font-bold text-[#B45F2B]">{formatVND(p.price)}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* Thanh thêm vào giỏ cố định (mobile) */}
            <div
                role="region"
                aria-label="Thêm vào giỏ"
                className="fixed inset-x-0 bottom-0 z-50 flex items-center gap-3 border-t border-[#E8E2D9] bg-white/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-lg backdrop-blur md:hidden"
            >
                <QuantitySelector qty={qty} setQty={setQty} max={maxQty} size="sm" />
                <Button onClick={submit} disabled={soldOut || adding} className={`h-12 text-sm ${addBtnCls}`}>
                    {added ? (
                        <>
                            <Check className="w-4 h-4 mr-2" /> Đã thêm
                        </>
                    ) : (
                        <>
                            <ShoppingBag className="w-4 h-4 mr-2" />
                            {soldOut ? "Hết hàng" : `Thêm · ${formatVND(totalPrice)}`}
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
