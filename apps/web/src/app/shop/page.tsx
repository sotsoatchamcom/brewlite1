"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, AlertCircle, RefreshCcw, X, ShoppingBag, Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import ProductCard from "@/components/shop/ProductCard";
import CustomizeDialog from "@/components/shop/CustomizeDialog";
import { useCart } from "@/contexts/CartContext";
import { apiFetch } from "@/lib/api";
import { matchesSearch, formatVND } from "@/lib/shop";
import type { Category, Product, Topping } from "@/lib/types";

// Xử lý cả dạng mảng trực tiếp [...] lẫn dạng phân trang { data: [...] } từ NestJS
const asList = <T,>(x: unknown): T[] => {
    if (Array.isArray(x)) return x as T[];
    if (x && typeof x === "object" && Array.isArray((x as any).data)) {
        return (x as any).data as T[];
    }
    return [];
};

export default function ShopMenuPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [toppings, setToppings] = useState<Topping[]>([]);
    const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
    const [error, setError] = useState("");
    const [categoryId, setCategoryId] = useState<number | "all">("all");
    const [query, setQuery] = useState("");
    const [selected, setSelected] = useState<Product | null>(null);
    const { totalQty, totalPrice, hydrated } = useCart();

    const load = useCallback(() => {
        setStatus("loading");
        Promise.all([
            apiFetch<any>("/categories?limit=100"),
            apiFetch<any>("/products?limit=100"),
            apiFetch<any>("/toppings?limit=100"),
        ])
            .then(([c, p, t]) => {
                setCategories(asList<Category>(c));
                setProducts(asList<Product>(p));
                setToppings(asList<Topping>(t));
                setStatus("ready");
            })
            .catch((e: Error) => {
                setError(e.message);
                setStatus("error");
            });
    }, []);

    useEffect(load, [load]);

    // Lọc theo danh mục an toàn (hỗ trợ cả p.categoryId lẫn p.category.id)
    const visible = useMemo(() => {
        return products.filter((p) => {
            const prodCatId = p.category?.id ?? (p as any).categoryId;
            const matchCat = categoryId === "all" || prodCatId === categoryId;
            return matchCat && matchesSearch(p, query);
        });
    }, [products, categoryId, query]);

    // Đếm số món theo danh mục (hiển thị trên chip)
    const countByCat = useMemo(() => {
        const m = new Map<number, number>();
        products.forEach((p) => {
            const id = p.category?.id ?? (p as any).categoryId;
            if (id != null) m.set(id, (m.get(id) ?? 0) + 1);
        });
        return m;
    }, [products]);

    const resetFilters = () => {
        setQuery("");
        setCategoryId("all");
    };

    const closeDialog = useCallback(() => setSelected(null), []);

    // Lọc topping hợp lệ theo danh mục món
    const availableToppings = useMemo(() => {
        if (!selected) return [];

        const categoryToppings = (selected as any).category?.toppings;
        if (Array.isArray(categoryToppings) && categoryToppings.length > 0) {
            return categoryToppings;
        }

        const catName = (selected.category?.name || "").toLowerCase();
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
    }, [selected, toppings]);

    const gridCls = "grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-4 md:gap-4";

    return (
        <div className="pb-24 md:pb-0">
            {/* Tiêu đề gọn cho mobile (thay cho banner lớn) */}
            <div className="mb-3">
                <h1 className="text-xl font-bold tracking-tight text-[#2B2118]">Thực đơn</h1>
                <p className="text-xs text-[#6B5E52] mt-0.5">
                    Chọn món, size và topping, thanh toán không cần tiền mặt.
                </p>
            </div>

            {/* Thanh tìm kiếm + danh mục, dính dưới header khi cuộn */}
            <div
                id="menu"
                className="sticky top-14 sm:top-16 z-30 -mx-6 px-6 py-2.5 space-y-2.5 bg-[#FAF7F2]/95 backdrop-blur border-b border-[#E8E2D9]"
            >
                <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B5E52]" />
                    <input
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Bạn muốn uống gì hôm nay?"
                        aria-label="Tìm đồ uống"
                        className="h-11 w-full rounded-full border border-[#E8E2D9] bg-white pl-10 pr-10 text-sm text-[#2B2118] placeholder:text-[#6B5E52]/60 outline-none focus:border-[#B45F2B] focus:ring-2 focus:ring-[#B45F2B]/20"
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={() => setQuery("")}
                            aria-label="Xóa từ khóa"
                            className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-full text-[#6B5E52] hover:bg-[#FAF7F2]"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                <div
                    className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    role="tablist"
                    aria-label="Danh mục"
                >
                    {[{ id: "all" as const, name: "Tất cả" }, ...categories].map((c) => {
                        const isSelected = categoryId === c.id;
                        const count = c.id === "all" ? products.length : countByCat.get(c.id) ?? 0;
                        return (
                            <button
                                key={c.id}
                                role="tab"
                                aria-selected={isSelected}
                                onClick={() => setCategoryId(c.id)}
                                className={`shrink-0 h-9 px-3.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                                    isSelected
                                        ? "bg-[#2B2118] text-white"
                                        : "bg-white border border-[#E8E2D9] text-[#6B5E52] hover:border-[#B45F2B]/50"
                                }`}
                            >
                                {c.name}
                                {status === "ready" && (
                                    <span className={`ml-1.5 ${isSelected ? "text-white/70" : "text-[#6B5E52]/60"}`}>
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Nội dung theo trạng thái */}
            <section className="pt-4" aria-live="polite">
                {/* LOADING */}
                {status === "loading" && (
                    <div className={gridCls} aria-busy="true" aria-label="Đang tải thực đơn">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="flex gap-3 rounded-2xl border border-[#E8E2D9] bg-white p-2.5 md:flex-col md:gap-0 md:p-0 md:overflow-hidden">
                                <Skeleton className="size-24 shrink-0 rounded-xl md:size-auto md:aspect-[4/3] md:w-full md:rounded-none bg-[#E8E2D9]/60" />
                                <div className="flex-1 space-y-2 py-1 md:p-3.5">
                                    <Skeleton className="h-4 w-3/4 bg-[#E8E2D9]/60" />
                                    <Skeleton className="h-3 w-1/2 bg-[#E8E2D9]/60" />
                                    <Skeleton className="h-5 w-1/3 bg-[#E8E2D9]/60" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ERROR */}
                {status === "error" && (
                    <div role="alert" className="rounded-2xl border border-[#F3C9C3] bg-white p-6 text-center space-y-3">
                        <AlertCircle className="w-10 h-10 text-[#A12B1F] mx-auto" />
                        <div>
                            <p className="font-bold text-[#A12B1F]">Không tải được thực đơn</p>
                            <p className="text-xs text-[#6B5E52] mt-1 max-w-sm mx-auto">
                                {error || "Đã có lỗi xảy ra"}. Kiểm tra kết nối mạng hoặc Backend rồi thử lại.
                            </p>
                        </div>
                        <Button
                            onClick={load}
                            className="h-11 rounded-full bg-[#B45F2B] px-6 text-white hover:bg-[#9A4F22] gap-2 text-sm font-semibold"
                        >
                            <RefreshCcw className="w-4 h-4" /> Thử lại
                        </Button>
                    </div>
                )}

                {/* EMPTY: chưa có món nào trong hệ thống */}
                {status === "ready" && products.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-[#E8E2D9] bg-white py-14 px-6 text-center space-y-2">
                        <Coffee className="w-10 h-10 text-[#6B5E52]/40 mx-auto" />
                        <p className="text-sm font-semibold text-[#2B2118]">Quán chưa có món nào</p>
                        <p className="text-xs text-[#6B5E52]">Thực đơn đang được cập nhật, bạn quay lại sau nhé.</p>
                    </div>
                )}

                {/* EMPTY: có món nhưng bộ lọc không khớp */}
                {status === "ready" && products.length > 0 && visible.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-[#E8E2D9] bg-white py-14 px-6 text-center space-y-3">
                        <Search className="w-9 h-9 text-[#6B5E52]/40 mx-auto" />
                        <div>
                            <p className="text-sm font-semibold text-[#2B2118]">Không tìm thấy món phù hợp</p>
                            <p className="text-xs text-[#6B5E52] mt-1">Thử đổi từ khóa hoặc chọn danh mục khác.</p>
                        </div>
                        <Button
                            variant="outline"
                            onClick={resetFilters}
                            className="h-10 rounded-full border-[#B45F2B] text-[#B45F2B] hover:bg-[#FDF1E7] text-xs font-semibold"
                        >
                            Xóa bộ lọc
                        </Button>
                    </div>
                )}

                {/* READY */}
                {status === "ready" && visible.length > 0 && (
                    <div className={gridCls}>
                        {visible.map((p) => (
                            <ProductCard key={p.id} product={p} onSelect={setSelected} />
                        ))}
                    </div>
                )}
            </section>

            {/* Thanh giỏ hàng nổi (chỉ trên mobile) */}
            {hydrated && totalQty > 0 && (
                <Link
                    href="/shop/cart"
                    className="md:hidden fixed inset-x-3 bottom-3 z-40 flex h-14 items-center justify-between rounded-full bg-[#2B2118] px-5 text-white shadow-lg active:scale-[0.98] transition-transform"
                >
                    <span className="flex items-center gap-2 text-sm font-semibold">
                        <ShoppingBag className="w-5 h-5" />
                        Xem giỏ hàng · {totalQty} món
                    </span>
                    <span className="text-sm font-bold">{formatVND(totalPrice)}</span>
                </Link>
            )}

            {/* Modal tùy chỉnh kích cỡ & topping */}
            {selected && (
                <CustomizeDialog
                    key={selected.id}
                    product={selected}
                    toppings={availableToppings}
                    onClose={closeDialog}
                />
            )}
        </div>
    );
}