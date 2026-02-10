"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Product } from "@/lib/services/productService";
import { listProductsPaged, deleteProduct, listProductBadgeMap } from "../actions";
import { listCategories } from "@/app/admin/categories/actions";
import type { Category } from "@/lib/services/categoryService";
import { fetchProductDetail, ProductDetail } from "../detail-actions";
import { useToast } from "@/components/ui/toast-provider";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ProductDetailModal } from "./product-detail-modal";
import { ProductTable } from "./product-table";
import { Button } from "@/components/ui/button";

type BadgeSummary = {
    id: string;
    product_id: string;
    label: string;
    color: string;
    starts_at: string | null;
    ends_at: string | null;
    is_active: boolean;
};

function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error && error.message) return error.message;
    return fallback;
}

export function ProductsClient({ initial }: { initial: Product[] }) {
    const router = useRouter();
    const toast = useToast();

    const [records, setRecords] = useState<Product[]>(initial);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [total, setTotal] = useState(initial.length);
    const [search, setSearch] = useState("");
    const [loadingList, setLoadingList] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [badgeMap, setBadgeMap] = useState<Record<string, BadgeSummary>>({});

    const [categories, setCategories] = useState<Category[]>([]);
    const [confirmId, setConfirmId] = useState<string | null>(null);

    const [viewing, setViewing] = useState<ProductDetail | null>(null);
    const [loadingViewId, setLoadingViewId] = useState<string | null>(null);

    async function load(p = page, s = search) {
        setLoadingList(true);
        setError(null);
        try {
            const res = await listProductsPaged({ page: p, pageSize, search: s });
            setRecords(res.rows);
            setTotal(res.total);
            setPage(res.page);
            const ids = res.rows.map((row) => row.id);
            const nextBadgeMap = ids.length ? await listProductBadgeMap(ids) : {};
            setBadgeMap(nextBadgeMap as Record<string, BadgeSummary>);
        } catch (e: unknown) {
            setError(getErrorMessage(e, "Failed to load products"));
        } finally {
            setLoadingList(false);
        }
    }

    useEffect(() => {
        void (async () => {
            try {
                const list = await listCategories();
                setCategories(list);
            } catch {
                // ignore category load errors in table
            }
        })();
    }, []);

    useEffect(() => {
        void load(1, search);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pageSize]);

    useEffect(() => {
        const t = setTimeout(() => {
            void load(1, search);
        }, 350);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    async function openView(id: string) {
        setLoadingViewId(id);
        try {
            const detail = await fetchProductDetail(id);
            if (detail) setViewing(detail);
        } finally {
            setLoadingViewId(null);
        }
    }

    function closeView() {
        setViewing(null);
    }

    async function executeDelete(id: string) {
        const target = records.find((r) => r.id === id);
        const detail = await fetchProductDetail(id).catch(() => null);
        const imageUrls = Array.from(new Set([
            ...(detail?.image_urls || []),
            ...(target?.main_image_url ? [target.main_image_url] : []),
        ]));

        try {
            await deleteProduct({ id });
            toast.push({ variant: "success", title: "Product deleted" });
            await load(page, search);

            if (imageUrls.length) {
                Promise.all(
                    imageUrls.map((url) => fetch('/api/uploads/delete', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url }),
                    }))
                ).catch(() => {
                    // ignore stale image cleanup failures
                });
            }
        } catch (e: unknown) {
            toast.push({
                variant: "error",
                title: "Delete failed",
                description: getErrorMessage(e, "Unable to delete product"),
            });
        } finally {
            setConfirmId(null);
        }
    }

    const isPending = loadingList;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold">Products</h2>
                    <div className="relative">
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search name, slug, brand..."
                            className="h-8 rounded-md border bg-background px-2 text-sm w-64"
                        />
                        {search ? (
                            <button
                                onClick={() => setSearch("")}
                                className="absolute right-1 top-1 text-xs text-muted-foreground hover:text-foreground"
                            >
                                ×
                            </button>
                        ) : null}
                    </div>
                    <select
                        value={pageSize}
                        onChange={(e) => setPageSize(Number(e.target.value))}
                        className="h-8 rounded-md border bg-background px-2 text-xs"
                    >
                        {[10, 20, 30, 50].map((sz) => (
                            <option key={sz} value={sz}>{sz}/page</option>
                        ))}
                    </select>
                    <div className="text-xs text-muted-foreground">
                        {isPending
                            ? 'Loading…'
                            : total === 0
                                ? 'No results'
                                : `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`}
                    </div>
                </div>

                <Button asChild>
                    <Link href="/admin/products/new">Add Product</Link>
                </Button>
            </div>

            <Card>
                <CardHeader><CardTitle>All Products</CardTitle></CardHeader>
                <CardContent>
                    {error ? <div className="mb-3 text-xs text-red-500">{error}</div> : null}
                    <ProductTable
                        records={records}
                        categories={categories}
                        badgeMap={badgeMap}
                        loadingViewId={loadingViewId}
                        onEdit={(p) => router.push(`/admin/products/new?edit=${encodeURIComponent(p.id)}`)}
                        onDeleteRequest={(id) => setConfirmId(id)}
                        onView={openView}
                    />
                    <PaginationControls
                        page={page}
                        pageSize={pageSize}
                        total={total}
                        disabled={isPending}
                        onPageChange={(p) => {
                            setPage(p);
                            void load(p, search);
                        }}
                    />
                    {viewing ? <ProductDetailModal detail={viewing} onClose={closeView} /> : null}
                </CardContent>
            </Card>

            <ConfirmDialog
                open={!!confirmId}
                title="Delete Product"
                description="This will remove the product."
                confirmLabel="Delete"
                variant="danger"
                onCancel={() => setConfirmId(null)}
                onConfirm={() => confirmId && executeDelete(confirmId)}
            />
        </div>
    );
}

function PaginationControls({ page, pageSize, total, disabled, onPageChange }: { page: number; pageSize: number; total: number; disabled?: boolean; onPageChange: (p: number) => void }) {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (totalPages <= 1) return null;
    const canPrev = page > 1;
    const canNext = page < totalPages;
    const windowSize = 1;
    const pages: (number | '…')[] = [];

    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || Math.abs(i - page) <= windowSize) {
            pages.push(i);
        } else if (pages[pages.length - 1] !== '…') {
            pages.push('…');
        }
    }

    const go = (p: number) => {
        if (!disabled && p >= 1 && p <= totalPages && p !== page) onPageChange(p);
    };

    return (
        <div className="flex items-center gap-2 justify-end mt-4">
            <button disabled={!canPrev || disabled} onClick={() => go(page - 1)} className="h-8 px-2 text-xs rounded-md border disabled:opacity-40">Prev</button>
            <ul className="flex items-center gap-1">
                {pages.map((p, i) => p === '…'
                    ? <li key={i} className="px-1 text-xs text-muted-foreground">…</li>
                    : <li key={p}><button disabled={disabled || p === page} onClick={() => go(p)} aria-current={p === page ? 'page' : undefined} className={`h-8 w-8 rounded-md text-xs border ${p === page ? 'bg-accent font-medium' : 'hover:bg-accent/60'}`}>{p}</button></li>)
                }
            </ul>
            <button disabled={!canNext || disabled} onClick={() => go(page + 1)} className="h-8 px-2 text-xs rounded-md border disabled:opacity-40">Next</button>
        </div>
    );
}
