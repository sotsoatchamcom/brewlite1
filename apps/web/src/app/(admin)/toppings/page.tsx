"use client";

import { useState, useEffect } from "react";
import {
    Plus,
    Pencil,
    Trash2,
    Search,
    Layers,
    RotateCcw,
    Upload,
    Image as ImageIcon,
} from "lucide-react";
import { MOCK_TOPPINGS } from "@/lib/mockData";
import type { Topping } from "@/lib/types";
import { apiFetch } from "@/lib/api";
import { getImageUrl } from "@/components/ui/utils";
import { EntityThumbnail } from "@/components/EntityThumbnail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface CategoryOption {
    id: number;
    name: string;
}

interface ToppingFormState {
    name: string;
    categoryId: string; // ID danh mục dạng chuỗi để gán vào <select>
    price: number;
    isAvailable: boolean;
    file: File | null;
    previewUrl: string;
}

const emptyForm: ToppingFormState = {
    name: "",
    categoryId: "",
    price: 10000,
    isAvailable: true,
    file: null,
    previewUrl: "",
};

export default function ToppingsPage() {
    const [toppings, setToppings] = useState<Topping[]>([]);
    const [categories, setCategories] = useState<CategoryOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<Topping | null>(null);
    const [form, setForm] = useState<ToppingFormState>(emptyForm);
    const [deleteId, setDeleteId] = useState<number | string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // 1. Tải danh sách Topping
    async function loadToppings() {
        setLoading(true);
        try {
            let res: any;
            try {
                res = await apiFetch<any>("/toppings/admin/all?page=1&limit=100");
            } catch {
                res = await apiFetch<any>("/toppings?page=1&limit=100");
            }

            const list = Array.isArray(res)
                ? res
                : Array.isArray(res?.data)
                    ? res.data
                    : [];
            setToppings(list);
        } catch {
            setToppings(MOCK_TOPPINGS as Topping[]);
        } finally {
            setLoading(false);
        }
    }

    // 2. Tải danh sách Categories để đưa vào Dropdown
    async function loadCategories() {
        try {
            const res: any = await apiFetch<any>("/categories");
            const list = Array.isArray(res) ? res : res?.data || [];
            setCategories(list);
        } catch (err) {
            console.error("Lỗi tải danh mục:", err);
        }
    }

    useEffect(() => {
        loadToppings();
        loadCategories();
    }, []);

    const isToppingAvailable = (t: any) => t.isAvailable ?? t.isActive ?? true;

    const filtered = toppings.filter((t) =>
        t.name.toLowerCase().includes(search.toLowerCase())
    );

    function openCreate() {
        setEditing(null);
        setForm(emptyForm);
        setDialogOpen(true);
    }

    function openEdit(t: any) {
        setEditing(t);
        // Lấy categoryId của topping nếu có
        const currentCatId = t.categoryId || (t.categories && t.categories.length > 0 ? t.categories[0].id : "");
        setForm({
            name: t.name,
            categoryId: currentCatId ? String(currentCatId) : "",
            price: Number(t.price),
            isAvailable: isToppingAvailable(t),
            file: null,
            previewUrl: getImageUrl(t.imageUrl, "toppings") ?? "",
        });
        setDialogOpen(true);
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const selected = e.target.files?.[0] || null;
        if (selected) {
            setForm((f) => ({
                ...f,
                file: selected,
                previewUrl: URL.createObjectURL(selected),
            }));
        }
    }

    async function handleSave() {
        if (!form.name.trim()) {
            toast.error("Vui lòng nhập tên Topping");
            return;
        }

        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("name", form.name.trim());
            formData.append("price", String(Math.round(Number(form.price))));
            formData.append("isAvailable", String(form.isAvailable));

            // Gửi categoryId lên backend
            if (form.categoryId) {
                formData.append("categoryId", String(form.categoryId));
                formData.append("categoryIds", JSON.stringify([Number(form.categoryId)]));
            }

            if (form.file) {
                formData.append("file", form.file);
            }

            if (editing) {
                await apiFetch(`/toppings/${editing.id}`, {
                    method: "PATCH",
                    body: formData,
                });
                toast.success("Cập nhật Topping thành công!");
            } else {
                await apiFetch("/toppings", {
                    method: "POST",
                    body: formData,
                });
                toast.success("Thêm Topping mới thành công!");
            }

            setDialogOpen(false);
            await loadToppings();
        } catch (err: any) {
            toast.error(err.message || "Không thể lưu Topping");
        } finally {
            setSubmitting(false);
        }
    }

    async function toggleAvailable(t: Topping) {
        const available = isToppingAvailable(t);
        try {
            if (!available) {
                await apiFetch(`/toppings/${t.id}/restore`, { method: "PATCH" });
                toast.success(`Đã mở bán lại "${t.name}"`);
            } else {
                await apiFetch(`/toppings/${t.id}`, { method: "DELETE" });
                toast.success(`Đã tạm ẩn "${t.name}"`);
            }
            await loadToppings();
        } catch (err: any) {
            toast.error(err.message || "Không thể cập nhật trạng thái");
        }
    }

    async function handleDelete() {
        if (deleteId === null) return;
        try {
            await apiFetch(`/toppings/${deleteId}`, { method: "DELETE" });
            toast.success("Đã ẩn/xóa Topping thành công");
            await loadToppings();
        } catch (err: any) {
            toast.error(err.message || "Không thể xóa Topping này");
        } finally {
            setDeleteId(null);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Toppings</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {toppings.length} toppings total
                    </p>
                </div>
                <Button onClick={openCreate} className="rounded-xl gap-2">
                    <Plus className="w-4 h-4" /> Add Topping
                </Button>
            </div>

            <div className="relative max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search toppings..."
                    className="pl-10 rounded-xl h-9"
                />
            </div>

            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-sm">
                    <thead className="bg-accent/40 border-b border-border">
                    <tr>
                        <th className="w-16 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 py-3.5">
                            #
                        </th>
                        <th className="w-28 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 py-3.5">
                            Image
                        </th>
                        <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 py-3.5">
                            Topping Details
                        </th>
                        <th className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 py-3.5">
                            Price
                        </th>
                        <th className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 py-3.5">
                            Availability
                        </th>
                        <th className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 py-3.5">
                            Actions
                        </th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                    {!loading && filtered.length === 0 && (
                        <tr>
                            <td colSpan={6} className="text-center py-12 text-muted-foreground">
                                <Layers className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                No toppings found
                            </td>
                        </tr>
                    )}
                    {filtered.map((topping: any, idx) => {
                        const available = isToppingAvailable(topping);
                        const catName = topping.categories?.[0]?.name || topping.category?.name || "";

                        return (
                            <tr key={topping.id} className="hover:bg-accent/30 transition-colors">
                                <td className="px-4 py-4 text-center text-xs font-semibold text-muted-foreground">
                                    {idx + 1}
                                </td>
                                <td className="px-4 py-3.5">
                                    <div className="flex justify-center">
                                        <EntityThumbnail
                                            src={getImageUrl(topping.imageUrl, "toppings")}
                                            alt={topping.name}
                                            size="lg"
                                            fallbackIcon={<Layers className="w-6 h-6 text-amber-700/60" />}
                                        />
                                    </div>
                                </td>
                                <td className="px-5 py-4">
                                    <span className="font-semibold text-base text-foreground block">
                                        {topping.name}
                                    </span>
                                    {/* Hiển thị danh mục bên dưới tên giống hệt trang Products */}
                                    <span className="text-xs text-muted-foreground block mt-0.5">
                                        {catName || "Tất cả danh mục"}
                                    </span>
                                </td>
                                <td className="px-5 py-4 text-right font-semibold text-base">
                                    +{Number(topping.price).toLocaleString("vi-VN")}đ
                                </td>
                                <td className="px-5 py-4 text-center">
                                    <button
                                        onClick={() => toggleAvailable(topping)}
                                        title="Click to toggle status"
                                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                                            available
                                                ? "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100"
                                                : "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                                        }`}
                                    >
                                        {available ? "Available" : "Hidden"}
                                    </button>
                                </td>
                                <td className="px-5 py-4 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        {!available && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="w-8 h-8 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                                onClick={() => toggleAvailable(topping)}
                                                title="Khôi phục Topping"
                                            >
                                                <RotateCcw className="w-4 h-4" />
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="w-8 h-8 rounded-lg"
                                            onClick={() => openEdit(topping)}
                                            title="Chỉnh sửa"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="w-8 h-8 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50"
                                            onClick={() => setDeleteId(topping.id)}
                                            title="Ẩn / Xóa Topping"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
            </div>

            {/* MODAL THÊM / SỬA TOPPING (THIẾT KẾ GIỐNG MODAL PRODUCT) */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="rounded-2xl sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editing ? "Edit Topping" : "New Topping"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-1">
                        {/* 1. Tên Topping */}
                        <div className="space-y-1.5">
                            <Label>Topping Name *</Label>
                            <Input
                                value={form.name}
                                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                placeholder="VD: Trân châu đen, Thạch đào..."
                                className="rounded-xl"
                            />
                        </div>

                        {/* 2. Hàng 2 cột: Cột trái Category * - Cột phải Price * (Giống hệt Product) */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>Category *</Label>
                                <select
                                    value={form.categoryId}
                                    onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                                    className="w-full h-9 rounded-xl border border-input bg-background px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                                >
                                    <option value="">Chọn danh mục</option>
                                    {categories.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <Label>Price (VNĐ) *</Label>
                                <Input
                                    type="number"
                                    step="1000"
                                    min="0"
                                    value={form.price}
                                    onChange={(e) =>
                                        setForm((f) => ({ ...f, price: parseInt(e.target.value) || 0 }))
                                    }
                                    className="rounded-xl"
                                />
                            </div>
                        </div>

                        {/* 3. Upload ảnh Topping */}
                        <div className="space-y-1.5">
                            <Label>Topping Image</Label>
                            <div className="flex items-center gap-4">
                                <div className="w-20 h-20 rounded-2xl border border-amber-200/80 bg-[#FFF8EE] flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                                    {form.previewUrl ? (
                                        <img
                                            src={form.previewUrl}
                                            alt="Preview"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <ImageIcon className="w-7 h-7 text-amber-700/60" />
                                    )}
                                </div>
                                <label className="flex-1 cursor-pointer">
                                    <div className="flex flex-col items-center justify-center gap-1.5 px-4 py-4 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-accent/50 text-xs font-medium text-muted-foreground hover:text-foreground transition-all">
                                        <Upload className="w-5 h-5" />
                                        <span className="truncate max-w-[200px]">
                                            {form.file ? form.file.name : "Click to upload image"}
                                        </span>
                                        <span className="text-[11px] text-muted-foreground/70">
                                            PNG, JPG, WEBP up to 5MB
                                        </span>
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                        </div>

                        {/* 4. Checkbox Trạng thái bán */}
                        <div className="flex items-center gap-2 pt-1">
                            <input
                                type="checkbox"
                                id="toppingAvail"
                                checked={form.isAvailable}
                                onChange={(e) =>
                                    setForm((f) => ({ ...f, isAvailable: e.target.checked }))
                                }
                                className="w-4 h-4 rounded cursor-pointer"
                            />
                            <Label htmlFor="toppingAvail" className="cursor-pointer">
                                Available for order (Đang bán)
                            </Label>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDialogOpen(false)}
                            className="rounded-xl"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={submitting}
                            className="rounded-xl"
                        >
                            {submitting ? "Saving..." : editing ? "Save Changes" : "Create"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal xác nhận ẩn / xóa */}
            <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
                <DialogContent className="rounded-2xl sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Hide / Delete Topping</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        Bạn có chắc chắn muốn ẩn/xóa Topping này không?
                    </p>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDeleteId(null)}
                            className="rounded-xl"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            className="rounded-xl"
                        >
                            Confirm
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}