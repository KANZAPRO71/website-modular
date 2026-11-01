"use client";

import React from "react";
import Rating from "../ui/Rating";
import Image from "next/image";
import Link from "next/link";
import { Product } from "@/types/product.types";
import { ProductMicButton } from "@/duplex-widget/components/duplex-widget/ProductMicButton";
import { ProductAssistantPanel } from "@/duplex-widget/components/duplex-widget/ProductAssistantPanel";
import { ProductImageGlow } from "@/duplex-widget/components/duplex-widget/ProductImageGlow";
import { useDuplexWidget } from "@/duplex-widget/components/duplex-widget/DuplexWidgetProvider";
import { ProductPrice } from "@/components/common/ProductPrice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks/redux";
import { toggleWishlistProduct } from "@/lib/features/wishlist/wishlistSlice";
import { FiHeart } from "react-icons/fi";
import { getProductInventory } from "@/data/inventory";
import { publicAssetPath } from "@/lib/utils";

type ProductCardProps = {
  data: Product;
};

const ProductCard = ({ data }: ProductCardProps) => {
  const {
    openWidget,
    closeWidget,
    activeProduct,
    isPanelOpen,
    chatMessages,
    interactionMode,
    isAudioMuted,
    connectionState,
    isListening,
    isSpeaking,
    analyserNode,
    setInteractionMode,
    setAudioMuted,
    sendTextMessage,
    toggleListening,
    interrupt,
    highlightedProductId,
  } = useDuplexWidget();
  const dispatch = useAppDispatch();
  const isWishlisted = useAppSelector((state) =>
    state.wishlist.productIds.includes(data.id)
  );

  const productId = String(data.id);
  const inventory = getProductInventory(data.id);
  const isHighlighted = highlightedProductId === productId;
  const isActive = isPanelOpen && activeProduct?.productId === productId;
  const productContext = {
    productId,
    productName: data.title,
    stockStatus:
      inventory && inventory.stock > 0
        ? `${inventory.stock} in stock`
        : "Out of stock",
  };

  const handleOpenAssistant = () => {
    void openWidget(productContext);
  };

  const handleStartVoice = () => {
    void openWidget(productContext, { mode: 'voice' });
  };

  return (
    <div className="relative flex flex-col items-start aspect-auto w-full" data-product-id={data.id}>
      <div className="relative w-full lg:max-w-[295px]">
        <div className="relative w-full aspect-square overflow-hidden rounded-[13px] bg-[#F0EEED] lg:rounded-[20px]">
          <button
            type="button"
            aria-label={`Open assistant for ${data.title}`}
            onClick={handleOpenAssistant}
            className="group absolute inset-0 z-0 cursor-pointer text-left"
          >
            <Image
              src={publicAssetPath(data.srcUrl)}
              width={295}
              height={298}
              className={`h-full w-full rounded-md object-contain transition-all duration-500 group-hover:scale-110 ${isHighlighted ? 'scale-105' : ''}`}
              alt={data.title}
              priority
            />
          </button>
          <button
            type="button"
            aria-label={isWishlisted ? `Remove ${data.title} from wishlist` : `Add ${data.title} to wishlist`}
            aria-pressed={isWishlisted}
            onClick={() => dispatch(toggleWishlistProduct(data.id))}
            className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-black shadow-sm transition hover:scale-105"
          >
            <FiHeart className={isWishlisted ? "fill-red-500 text-red-500" : ""} />
          </button>
          <ProductImageGlow active={isActive} />
          {inventory?.stock === 0 ? (
            <span className="absolute left-3 top-3 z-10 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-semibold text-black">
              Out of stock
            </span>
          ) : null}
          <ProductMicButton
            product={productContext}
            isActive={isActive}
            onActivate={handleStartVoice}
          />
        </div>
        {isActive ? (
          <ProductAssistantPanel
            product={productContext}
            messages={chatMessages}
            connectionState={connectionState}
            interactionMode={interactionMode}
            isAudioMuted={isAudioMuted}
            isListening={isListening}
            isSpeaking={isSpeaking}
            analyserNode={analyserNode}
            onClose={closeWidget}
            onModeChange={setInteractionMode}
            onAudioMutedChange={setAudioMuted}
            onSendText={sendTextMessage}
            onToggleListening={toggleListening}
            onInterrupt={interrupt}
          />
        ) : null}
      </div>
      <Link
        href={`/shop/product/${data.id}/${data.title.split(" ").join("-")}`}
        className="font-bold text-base md:text-xl capitalize pt-2.5 md:pt-4"
      >
        {data.title}
      </Link>
      <div className="flex items-center space-x-[11px] mb-1 md:mb-1.5">
        <Rating
          initialValue={data.rating}
          allowFraction
          SVGclassName="inline-block"
          emptyClassName="fill-gray-50"
          size={19}
          readonly
        />
        <span className="text-black text-xs md:text-sm">
          {data.rating.toFixed(1)}
          <span className="text-black/60">/5</span>
        </span>
      </div>
      <ProductPrice product={data} />
    </div>
  );
};

export default ProductCard;
