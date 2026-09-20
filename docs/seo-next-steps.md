# SEO — next steps (manual + done in code)

## Done in code

1. **Trust pages**: `/rreth-nesh`, `/kontakt` (footer links no longer 404)
2. **Inventory-aware landing copy** via `enrichSeoLandingCopy`
3. **Stronger JSON-LD**: Car/`Product`, JobPosting employment types, RE address/geo, breadcrumbs with city URLs
4. **Internal links**: listing SEO panels → city/category hubs; footer “Prona sipas qytetit”
5. **Image alts**: title + city on listing cards
6. **Okazion SEO**: OG/Twitter, FAQ JSON-LD + long-form copy under `/okazion`
7. **Default OG images**: browse hubs + city/category landings use brand logo for link previews
8. **Search Console HTML tag**: set `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` in Vercel / `.env` (value from GSC → HTML tag method)
9. **Sitemap fetch**: canonical host is `www.kutagjej.al` (matches Vercel’s apex→www redirect so GSC gets HTTP 200)
10. **seo-index 500**: fixed job visibility check that crashed `/api/public/listings/seo-index`
11. **No Product JSON-LD for Merchant**: homepage ItemLists are URL-only; `/tregu` uses Offer; cars use `Car` only; `/prona` uses Apartment/Residence/etc. (not Product) so GSC Merchant listings stay quiet on classifieds

## You must do manually (highest remaining impact)

### Google Search Console
1. Verify `https://kutagjej.al` (and www if used) — DNS or HTML tag via `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`
2. Submit sitemap as **`https://www.kutagjej.al/sitemap.xml`** (not apex — apex 308s to www and GSC reports “Couldn't fetch”)
3. After deploy of the seo-index fix, open the sitemap row → refresh / wait for Success
4. Fix Coverage / Page indexing errors
5. Request indexing for top landings (`/prona/tirane`, `/makina/tirane`, …)
6. Watch Performance → queries; expand landings that get impressions

### Core Web Vitals
1. Run PageSpeed Insights / CrUX on homepage + `/prona` + a listing URL
2. Prioritize LCP (hero images), INP (heavy JS), CLS (image dimensions)

### Backlinks / brand
1. List on Albanian directories / partner sites
2. Consistent NAP + social profiles linking to kutagjej.al
3. Share high-intent landings (not only homepage) on social
4. Optional: Google Business Profile if you have a physical entity

### Content ops
1. Keep landings with **≥3 listings** indexable (already coded)
2. Encourage complete listing descriptions (not empty)
3. Avoid duplicate thin city pages with zero inventory
