// SEO wrapper for a product detail page. Reads the real product (server-safe,
// public catalog view) to build per-product metadata + Product/BreadcrumbList
// JSON-LD. Falls back to a noindex generic when the product is missing. The
// read is cached() so generateMetadata and this layout share one query.

import type { Metadata } from "next";
import { getSeoProduct, type SeoProduct } from "@/lib/seo/data";
import { pageMetadata } from "@/lib/seo/metadata";
import { JsonLd, breadcrumbJsonLd, productJsonLd } from "@/lib/seo/jsonld";
import { DEFAULT_DESCRIPTION, seoText } from "@/lib/seo/site";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

function productDescription(product: SeoProduct): string {
  const base = seoText(product.description, 160);
  if (base) return base;
  return `${product.name} — premium ${product.categoryName || "coffee"} from Line Coffee, carefully sourced and delivered across Egypt.`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getSeoProduct(slug);

  if (!product) {
    return pageMetadata({
      title: "Product",
      description: DEFAULT_DESCRIPTION,
      path: `/products/${slug}`,
      index: false,
    });
  }

  return pageMetadata({
    title: product.name,
    description: productDescription(product),
    path: `/products/${product.slug}`,
    image: product.image,
  });
}

export default async function ProductSeoLayout({ children, params }: LayoutProps) {
  const { slug } = await params;
  const product = await getSeoProduct(slug);

  return (
    <>
      {product ? (
        <JsonLd
          data={[
            productJsonLd(product),
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Products", path: "/products" },
              ...(product.categorySlug
                ? [
                    {
                      name: product.categoryName,
                      path: `/products/category/${product.categorySlug}`,
                    },
                  ]
                : []),
              { name: product.name, path: `/products/${product.slug}` },
            ]),
          ]}
        />
      ) : null}
      {children}
    </>
  );
}
