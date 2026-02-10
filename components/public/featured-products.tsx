import { createPublicClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/services/productService";
import { buildPriceMap } from "@/lib/services/pricing";
import { ProductCardsGrid } from "@/components/public/product-cards-grid";
import { ProductBadgeService } from "@/lib/services/productBadgeService";

interface Props { limit?: number }

export async function FeaturedProducts({ limit = 8 }: Props) {
    const supabase = createPublicClient();
    const prefetchLimit = Math.max(limit * 3, limit);

    const { data: rawProducts, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_featured", true)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(prefetchLimit);
    if (error) {
        return null;
    }

    const productsWithCategory = (rawProducts || []) as Product[];
    const categoryIds = Array.from(
        new Set(
            productsWithCategory
                .map((product) => product.category_id)
                .filter((id): id is string => Boolean(id))
        )
    );

    let activeCategorySet = new Set<string>();
    if (categoryIds.length > 0) {
        const { data: activeCategories } = await supabase
            .from("categories")
            .select("id")
            .eq("is_active", true)
            .in("id", categoryIds);
        activeCategorySet = new Set((activeCategories || []).map((category) => category.id));
    }

    const products: Product[] = productsWithCategory
        .filter((product) => !product.category_id || activeCategorySet.has(product.category_id))
        .slice(0, limit);

    if (!products.length) return null;
    const productIds = products.map((p) => p.id);
    const [priceMap, badgeMap] = await Promise.all([
        buildPriceMap(productIds),
        ProductBadgeService.getVisibleBadgeMap(productIds),
    ]);
    const symbol = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$';
    return (
        <section className="w-full flex flex-col gap-6" aria-labelledby="featured-heading">
            <div className="flex items-center justify-center">
                <h2 id="featured-heading" className="text-xl text-center font-semibold tracking-tight">Featured Products</h2>
            </div>
            <ProductCardsGrid products={products} priceMap={priceMap} badgeMap={badgeMap} symbol={symbol} />
        </section>
    );
}
