"use client";

import { setSizeSelection } from "@/lib/features/products/productsSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks/redux";
import { RootState } from "@/lib/store";
import { cn } from "@/lib/utils";
import React, { useEffect } from "react";
import { getInventorySizeLabel, getProductInventory } from "@/data/inventory";

const SizeSelection = ({ productId }: { productId: number }) => {
  const { sizeSelection } = useAppSelector(
    (state: RootState) => state.products
  );
  const dispatch = useAppDispatch();
  const inventory = getProductInventory(productId);
  const sizes = inventory?.sizes ?? [];
  const selectedSize = sizes.includes(sizeSelection)
    ? sizeSelection
    : getInventorySizeLabel(sizes[0] ?? "");

  useEffect(() => {
    if (sizes.length > 0 && !sizes.includes(sizeSelection)) {
      dispatch(setSizeSelection(getInventorySizeLabel(sizes[0])));
    }
  }, [dispatch, productId, sizeSelection]);

  return (
    <div className="flex flex-col">
      <span className="text-sm sm:text-base text-black/60 mb-4">
        Choose Size
      </span>
      <div className="flex items-center flex-wrap lg:space-x-3">
        {sizes.map((size) => {
          const label = getInventorySizeLabel(size);
          return (
          <button
            key={size}
            type="button"
            className={cn([
              "bg-[#F0F0F0] flex items-center justify-center px-5 lg:px-6 py-2.5 lg:py-3 text-sm lg:text-base rounded-full m-1 lg:m-0 max-h-[46px]",
              selectedSize === label && "bg-black font-medium text-white",
            ])}
            onClick={() => dispatch(setSizeSelection(label))}
          >
            {label}
          </button>
          );
        })}
      </div>
    </div>
  );
};

export default SizeSelection;
