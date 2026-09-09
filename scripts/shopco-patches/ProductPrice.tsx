import { Product } from "@/types/product.types";
import { formatPrice, getSalePrice, hasDiscount } from "@/lib/formatPrice";
import { cn } from "@/lib/utils";

type ProductPriceProps = {
  product: Pick<Product, "price" | "discount">;
  priceClassName?: string;
  strikeClassName?: string;
  badgeClassName?: string;
};

export function ProductPrice({
  product,
  priceClassName = "font-bold text-black text-xl xl:text-2xl",
  strikeClassName = "font-bold text-black/40 line-through text-xl xl:text-2xl",
  badgeClassName = "font-medium text-[10px] xl:text-xs py-1.5 px-3.5 rounded-full bg-[#FF3333]/10 text-[#FF3333]",
}: ProductPriceProps) {
  const salePrice = getSalePrice(product);
  const discounted = hasDiscount(product);

  return (
    <div className="flex items-center space-x-[5px] xl:space-x-2.5">
      <span className={cn(priceClassName)}>
        {formatPrice(discounted ? salePrice : product.price)}
      </span>
      {discounted && (
        <span className={cn(strikeClassName)}>{formatPrice(product.price)}</span>
      )}
      {product.discount.percentage > 0 ? (
        <span className={cn(badgeClassName)}>{`-${product.discount.percentage}%`}</span>
      ) : (
        product.discount.amount > 0 && (
          <span className={cn(badgeClassName)}>
            {`-${formatPrice(product.discount.amount)}`}
          </span>
        )
      )}
    </div>
  );
}
