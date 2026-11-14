"use client";

import { useState } from "react";
import Link from "next/link";
import { Coffee, Plus } from "lucide-react";
import { getImageUrl, DEFAULT_PRODUCT_IMAGE } from "@/components/ui/utils";
import { formatVND } from "@/lib/shop";
import type { Product } from "@/lib/types";

/**
 * Mobile-first: dạng hàng ngang (ảnh trái – thông tin phải) trên điện thoại,
 * chuyển thành thẻ dọc từ màn hình md trở lên.
 */
export default function ProductCard({
    product,
    onSelect,
}: {
    product: Product;
    onSelect: (p: Product) => void;
}) {
    const [imgError, setImgError] = useState(false);

    const soldOut = (product.stock ?? 0) <= 0;
    const detailHref = `/shop/products/${product.id}`;
    const rawImg = !imgError && product.imageUrl ? getImageUrl(product.imageUrl) : DEFAULT_PRODUCT_IMAGE;

    return (
        <article
            className={`group relative flex flex-row md:flex-col gap-3 md:gap-0 bg-[#FFFFFF] border border-[#E8E2D9] rounded-2xl p-2.5 md:p-0 md:overflow-hidden transition-shadow duration-200 hover:shadow-md ${
                soldOut ? "opacity-70" : ""
            }`}
        >
            {/* Ảnh */}
            <Link
                href={detailHref}
                aria-label={`Xem chi tiết ${product.name}`}
                className="relative shrink-0 size-24 md:size-auto md:w-full md:aspect-[4/3] rounded-xl md:rounded-none bg-[#FAF7F2] flex items-center justify-center overflow-hidden"
            >
                {rawImg && !imgError ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={rawImg}
                        alt={product.name}
                        loading="lazy"
                        onError={() => setImgError(true)}
                        className={`w-full h-full object-cover ${soldOut ? "grayscale" : ""}`}
                    />
                ) : (
                    <Coffee className="w-8 h-8 text-[#6B5E52]/40" />
                )}
                {soldOut && (
                    <span className="absolute inset-x-0 bottom-0 bg-[#2B2118]/70 py-0.5 text-center text-[10px] font-bold uppercase tracking-wider text-white">
                        Hết hàng
                    </span>
                )}
            </Link>

            {/* Nội dung */}
            <div className="flex min-w-0 flex-1 flex-col justify-between md:p-3.5">
                <div>
                    <h3 className="font-bold text-[#2B2118] text-[15px] leading-snug line-clamp-2">
                        <Link href={detailHref} className="hover:text-[#B45F2B] transition-colors">
                            {product.name}
                        </Link>
                    </h3>
                    {product.description && (
                        <p className="mt-0.5 text-xs text-[#6B5E52] line-clamp-1 md:line-clamp-2">
                            {product.description}
                        </p>
                    )}
                </div>

                <div className="mt-2 flex items-center justify-between gap-2">
                    <p className="font-extrabold text-[#B45F2B] text-base tracking-tight">
                        {formatVND(product.price)}
                    </p>
                    <button
                        type="button"
                        disabled={soldOut}
                        onClick={() => onSelect(product)}
                        aria-label={`Chọn món ${product.name}`}
                        className="inline-flex h-11 w-11 md:h-9 md:w-9 items-center justify-center rounded-full bg-[#B45F2B] text-white transition active:scale-95 hover:bg-[#9A4F22] disabled:bg-[#E8E2D9] disabled:text-[#6B5E52]/50 disabled:active:scale-100"
                    >
                        <Plus className="w-5 h-5 stroke-[2.5]" />
                    </button>
                </div>
            </div>
        </article>
    );
}
