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

  const productId = String(data.id);
  const isHighlighted = highlightedProductId === productId;
  const isActive = isPanelOpen && activeProduct?.productId === productId;
  const productContext = {
    productId,
    productName: data.title,
    stockStatus: "Tersedia",
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
            aria-label={`Buka asisten untuk ${data.title}`}
            onClick={handleOpenAssistant}
            className="group absolute inset-0 z-0 cursor-pointer text-left"
          >
            <Image
              src={data.srcUrl}
              width={295}
              height={298}
              className={`h-full w-full rounded-md object-contain transition-all duration-500 group-hover:scale-110 ${isHighlighted ? 'scale-105' : ''}`}
              alt={data.title}
              loading="lazy"
            />
            <div className="pointer-events-none absolute inset-0 rounded-[13px] bg-black/0 transition group-hover:bg-black/5 lg:rounded-[20px]" />
          </button>

          <ProductImageGlow active={isHighlighted} />

          <ProductMicButton
            product={productContext}
            isActive={isActive}
            onActivate={handleStartVoice}
          />
        </div>
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

      <Link
        href={`/shop/product/${data.id}/${data.title.split(" ").join("-")}`}
        className="flex flex-col items-start w-full mt-2.5 xl:mt-4"
      >
        <strong className="text-black xl:text-xl">{data.title}</strong>
        <div className="flex items-end mb-1 xl:mb-2">
          <Rating
            initialValue={data.rating}
            allowFraction
            SVGclassName="inline-block"
            emptyClassName="fill-gray-50"
            size={19}
            readonly
          />
          <span className="text-black text-xs xl:text-sm ml-[11px] xl:ml-[13px] pb-0.5 xl:pb-0">
            {data.rating.toFixed(1)}
            <span className="text-black/60">/5</span>
          </span>
        </div>
        <ProductPrice product={data} />
      </Link>
    </div>
  );
};

export default ProductCard;
