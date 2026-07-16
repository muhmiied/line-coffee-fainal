// SEO wrapper for a category page. Reads the real category (public catalog view,
// with a static fallback for known slugs) to build metadata + CollectionPage /
// BreadcrumbList JSON-LD.

import type { Metadata } from "next";
import { getSeoCategory, type SeoCategory } from "@/lib/seo/data";
import { pageMetadata } from "@/lib/seo/metadata";
import { JsonLd, breadcrumbJsonLd, categoryJsonLd } from "@/lib/seo/jsonld";
import { DEFAULT_DESCRIPTION, seoText } from "@/lib/seo/site";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

function categoryDescription(category: SeoCategory): string {
  const base = seoText(category.description, 160);
  if (base) return base;
  return `Shop ${category.name} from Line Coffee — premium Egyptian specialty coffee, carefully sourced and delivered across Egypt.`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await getSeoCategory(slug);

  if (!category) {
    return pageMetadata({
      title: "Coffee Category",
      description: DEFAULT_DESCRIPTION,
      path: `/products/category/${slug}`,
      index: false,
    });
  }

  return pageMetadata({
    title: category.name,
    description: categoryDescription(category),
    path: `/products/category/${category.slug}`,
    image: category.image,
  });
}

export default async function CategorySeoLayout({ children, params }: LayoutProps) {
  const { slug } = await params;
  const category = await getSeoCategory(slug);

  return (
    <>
      {category ? (
        <JsonLd
          data={[
            categoryJsonLd(category),
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Products", path: "/products" },
              { name: category.name, path: `/products/category/${category.slug}` },
            ]),
          ]}
        />
      ) : null}
      {children}
    </>
  );
}
