import Link from "next/link";
import { ThemeSwitcher } from "@/components/theme-switcher";
import Image from "next/image";
import { StoreService } from "@/lib/services/storeService";
import { CategoryMenu } from "./category-menu";
import { CategoryTopBar } from "./category-top-bar";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { ProductSearchBar } from "@/components/search/product-search-bar";

export async function PublicNav() {
    const store = await StoreService.getFirst();
    return (
        <div className="sticky top-0 z-50 w-full border-b border-foreground/10 bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/70">
            <nav className="relative z-20 flex min-h-16 w-full justify-center py-2">
                <div className="flex w-full max-w-6xl items-center gap-3 px-4 text-sm">
                    <div className="flex items-center gap-4 font-semibold shrink-0">
                        <CategoryMenu />
                        <Link href="/" className="flex items-center gap-2">
                            {store?.logo_light_mode || store?.logo_dark_mode ? (
                                <>
                                    {store.logo_light_mode && <Image src={store.logo_light_mode} alt={store.name} width={128} height={32} className="h-8 w-auto dark:hidden" />}
                                    {store.logo_dark_mode && <Image src={store.logo_dark_mode} alt={store.name} width={128} height={32} className="h-8 w-auto hidden dark:block" />}
                                </>
                            ) : <span>{store?.name || 'Store'}</span>}
                        </Link>
                    </div>
                    <div className="hidden min-w-0 flex-1 justify-center md:flex">
                        <CategoryTopBar mode="inline" className="w-full" />
                    </div>
                    <div className="ms-auto flex shrink-0 items-center gap-3">
                        <div className="hidden w-56 lg:w-72 md:block">
                            <ProductSearchBar className="w-full" />
                        </div>
                        <CartDrawer />
                        <ThemeSwitcher />
                    </div>
                </div>
            </nav>
            <div className="w-full md:hidden px-4 pb-3 flex justify-center">
                <ProductSearchBar className="w-full" />
            </div>
        </div>
    );
}
