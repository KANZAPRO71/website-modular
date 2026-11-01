import React from "react";
import PhotoSection from "./PhotoSection";
import { Product } from "@/types/product.types";
import { integralCF } from "@/styles/fonts";
import { cn } from "@/lib/utils";
import Rating from "@/components/ui/Rating";
import ColorSelection from "./ColorSelection";
import SizeSelection from "./SizeSelection";
import AddToCardSection from "./AddToCardSection";
import { ProductPrice } from "@/components/common/ProductPrice";

const Header = ({ data }: { data: Product }) => {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <PhotoSection data={data} />
        </div>
        <div>
          <h1
            className={cn([
              integralCF.className,
              "text-2xl md:text-[40px] md:leading-[40px] mb-3 md:mb-3.5 capitalize",
            ])}
          >
            {data.title}
          </h1>
          <div className="flex items-center mb-3 sm:mb-3.5">
            <Rating
              initialValue={data.rating}
              allowFraction
              SVGclassName="inline-block"
              emptyClassName="fill-gray-50"
              size={25}
              readonly
            />
            <span className="text-black text-xs sm:text-sm ml-[11px] sm:ml-[13px] pb-0.5 sm:pb-0">
              {data.rating.toFixed(1)}
              <span className="text-black/60">/5</span>
            </span>
          </div>
          <ProductPrice
            product={data}
            priceClassName="font-bold text-black text-2xl sm:text-[32px]"
            strikeClassName="font-bold text-black/40 line-through text-2xl sm:text-[32px]"
            badgeClassName="font-medium text-[10px] sm:text-xs py-1.5 px-3.5 rounded-full bg-[#FF3333]/10 text-[#FF3333]"
          />
          <p className="text-sm sm:text-base text-black/60 mb-5">
            This graphic t-shirt which is perfect for any occasion. Crafted from a soft
            and breathable fabric, it offers superior comfort and style.
          </p>
          <hr className="h-[1px] border-t-black/10 mb-5" />
          <ColorSelection />
          <hr className="h-[1px] border-t-black/10 my-5" />
          <SizeSelection productId={data.id} />
          <hr className="hidden md:block h-[1px] border-t-black/10 my-5" />
          <AddToCardSection data={data} />
        </div>
      </div>
    </>
  );
};

export default Header;
