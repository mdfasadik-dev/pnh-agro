import { CategoriesSection } from '@/components/public/categories-section';
import { CategoriesSectionSkeleton } from '@/components/public/categories-section-skeleton';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { FeaturedProducts } from '@/components/public/featured-products';
import { FeaturedProductsSkeleton } from '@/components/public/featured-products-skeleton';
import { getActivePromotionsByType } from '@/lib/data/promotions';
import { HeroSection } from '@/components/promotions/HeroSection';
import { PromoCarousel } from '@/components/promotions/PromoCarousel';
import { PromoPopup } from '@/components/promotions/PromoPopup';
import { PromoBanner } from '@/components/promotions/PromoBanner';
import { PromoCustomSection } from '@/components/promotions/PromoCustomSection';
import { absoluteUrl, buildPageMetadata, SEO_CONFIG } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
    title: SEO_CONFIG.defaultTitle,
    description: SEO_CONFIG.defaultDescription,
    pathname: '/',
});

export const revalidate = 900;

export default async function Home() {
    // Parallel fetching of active promotions
    const [heroPromotions, carouselPromotions, popupPromotions, bannerPromotions, customPromotions] = await Promise.all([
        getActivePromotionsByType('hero', 10),
        getActivePromotionsByType('carousel', 1),
        getActivePromotionsByType('popup', 1),
        getActivePromotionsByType('banner', 1),
        getActivePromotionsByType('custom', 4),
    ]);

    const carouselPromo = carouselPromotions[0] || null;
    const popupPromo = popupPromotions[0] || null;
    const bannerPromo = bannerPromotions[0] || null;

    return (
        <main className="min-h-screen w-full flex flex-col pt-16">
            <script
                type="application/ld+json"
                suppressHydrationWarning
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'WebSite',
                        name: SEO_CONFIG.siteName,
                        url: absoluteUrl('/'),
                        potentialAction: {
                            '@type': 'SearchAction',
                            target: `${absoluteUrl('/')}/?q={search_term_string}`,
                            'query-input': 'required name=search_term_string',
                        },
                    }),
                }}
            />
            <HeroSection promotions={heroPromotions} />

            <section id='categories' className="w-full max-w-6xl mx-auto flex-1 p-6 flex flex-col gap-16 scroll-mt-28">
                <Suspense fallback={<CategoriesSectionSkeleton />}>
                    <CategoriesSection />
                </Suspense>
            </section>

            {/* Promotional Carousel */}
            {carouselPromo && <PromoCarousel promotion={carouselPromo} />}

            <section id='featured' className="w-full max-w-6xl mx-auto flex-1 p-6 flex flex-col gap-16 scroll-mt-28">
                <Suspense fallback={<FeaturedProductsSkeleton />}>
                    <FeaturedProducts />
                </Suspense>
            </section>

            {/* Promotional Banner */}
            {bannerPromo && <PromoBanner promotion={bannerPromo} />}

            {/* Custom Section */}
            {customPromotions.length > 0 ? <PromoCustomSection promotions={customPromotions} /> : null}

            {/* Popup */}
            {popupPromo && <PromoPopup promotion={popupPromo} />}
        </main>
    );
}
