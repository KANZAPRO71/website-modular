import {
  newArrivalsData,
  relatedProductData,
  topSellingData,
} from "@/data/catalog";
import ProductListSec from "@/components/common/ProductListSec";
import BreadcrumbProduct from "@/components/product-page/BreadcrumbProduct";
import Header from "@/components/product-page/Header";
import ProductViewTracker from "@/components/product-page/ProductViewTracker";
import StylingRecommendations from "@/components/product-page/StylingRecommendations";
import Tabs from "@/components/product-page/Tabs";
import { Product } from "@/types/product.types";
import { notFound } from "next/navigation";
import { productSlug } from "@/lib/productPaths";

const data: Product[] = [
  ...newArrivalsData,
  ...topSellingData,
  ...relatedProductData,
];

export function generateStaticParams() {
  return data.map((product) => ({
    slug: [String(product.id), productSlug(product.title)],
  }));
}

export default function ProductPage({
  params,
}: {
  params: { slug: string[] };
}) {
  const productData = data.find(
    (product) => product.id === Number(params.slug[0])
  );

  if (!productData?.title) {
    notFound();
  }

  return (
    <main>
      <div className="max-w-frame mx-auto px-4 xl:px-0">
        <ProductViewTracker productId={productData.id} />
        <hr className="h-[1px] border-t-black/10 mb-5 sm:mb-6" />
        <BreadcrumbProduct title={productData?.title ?? "product"} />
        <section className="mb-11">
          <Header data={productData} />
        </section>
        <Tabs />
      </div>
      <div className="mb-[50px] sm:mb-20">
        <StylingRecommendations productId={productData.id} />
      </div>
      <div className="mb-[50px] sm:mb-20">
        <ProductListSec title="YOU MIGHT ALSO LIKE" data={relatedProductData} />
      </div>
    </main>
  );
}
