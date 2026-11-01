"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Provider } from "react-redux";
import { makeStore } from "../lib/store";
import { PersistGate } from "redux-persist/integration/react";
import SpinnerbLoader from "@/components/ui/SpinnerbLoader";
import { DuplexWidgetProvider } from "@/duplex-widget/components/duplex-widget/DuplexWidgetProvider";
import {
  DuplexNavigationBridge,
  dispatchDuplexNavigate,
} from "@/components/duplex/DuplexNavigationBridge";
import { useAppDispatch, useAppStore } from "@/lib/hooks/redux";
import {
  addToCart,
  remove,
  setCartItemQuantity,
} from "@/lib/features/carts/cartsSlice";
import { catalogProducts } from "@/data/catalog";
import CartRecoveryPrompt from "@/components/cart-page/CartRecoveryPrompt";
import StoreSupportChat from "@/components/support/StoreSupportChat";
import {
  getProductInventory,
  isProductSizeAvailable,
} from "@/data/inventory";

type Props = {
  children: React.ReactNode;
};

const DEFAULT_CLOUD_WSS = "wss://cycles-hunter-pull-romance.trycloudflare.com";

function getDynamicDuplexWsUrl(): string {
  if (typeof window !== "undefined") {
    try {
      const params = new URLSearchParams(window.location.search);
      const queryWs = params.get("ws");
      if (queryWs) {
        localStorage.setItem("shopco_duplex_ws_url", queryWs);
        return queryWs;
      }
    } catch {}

    try {
      const saved = localStorage.getItem("shopco_duplex_ws_url");
      if (saved && !saved.includes("shopco-gemini-orchestrator.onrender.com")) {
        return saved;
      }
    } catch {}

    if (window.location.protocol === "https:") {
      return DEFAULT_CLOUD_WSS;
    }
  }

  return "ws://localhost:8787";
}

function normalizeSize(size: string): string {
  const normalized = size.trim().toLocaleLowerCase();
  const aliases: Record<string, string> = {
    s: "small",
    m: "medium",
    l: "large",
    xl: "x-large",
    "x large": "x-large",
    "extra large": "x-large",
  };

  return aliases[normalized] ?? normalized;
}

function displaySize(size: string): string {
  const normalized = normalizeSize(size);
  const labels: Record<string, string> = {
    small: "Small",
    medium: "Medium",
    large: "Large",
    "x-large": "X-Large",
  };

  return labels[normalized] ?? size.trim();
}

function DuplexProviders({ children }: Props) {
  const [wsUrl, setWsUrl] = useState<string>(getDynamicDuplexWsUrl);

  useEffect(() => {
    setWsUrl(getDynamicDuplexWsUrl());
  }, []);
  const dispatch = useAppDispatch();
  const store = useAppStore();

  const handleSystemAction = useCallback(
    (action: string, payload: Record<string, unknown>) => {
      console.info("[DuplexWidget]", action, payload);

      if (action === "NAVIGATE_TO_PRODUCT") {
        dispatchDuplexNavigate(payload);
        return;
      }

      const productId = Number(payload.productId);
      const product = catalogProducts.find((item) => item.id === productId);
      const requestedSize =
        typeof payload.size === "string" ? payload.size.trim() : "";
      const size = requestedSize ? normalizeSize(requestedSize) : "";
      const selectedColor = store.getState().products.colorSelection.name;
      const cartItems = store.getState().carts.cart?.items ?? [];
      const sizeMatches = product
        ? cartItems.filter(
            (item) =>
              item.id === product.id &&
              normalizeSize(item.attributes[0] ?? "") === size
          )
        : [];
      const matchingCartItem =
        sizeMatches.find((item) => item.attributes[1] === selectedColor) ??
        (sizeMatches.length === 1 ? sizeMatches[0] : undefined);

      if (action === "SET_CART_QUANTITY" && product) {
        const qty = Number(payload.quantity ?? 1);
        if (!matchingCartItem || !Number.isFinite(qty)) {
          console.warn(
            `[DuplexWidget] Cannot set quantity: no matching cart item for product ${productId} size "${requestedSize}"`
          );
          return;
        }

        const inventory = getProductInventory(product.id);
        const otherQuantity = cartItems
          .filter(
            (item) =>
              item.id === product.id && item !== matchingCartItem
          )
          .reduce((total, item) => total + item.quantity, 0);
        if (
          !Number.isInteger(qty) ||
          qty < 0 ||
          qty + otherQuantity > (inventory?.stock ?? 0)
        ) {
          console.warn(
            `[DuplexWidget] Cannot set quantity above available stock for product ${productId}`
          );
          return;
        }

        dispatch(
          setCartItemQuantity({
            id: product.id,
            attributes: matchingCartItem.attributes,
            quantity: qty,
          })
        );
        console.info(
          `[DuplexWidget] SET_CART_QUANTITY product ${productId} qty=${qty}`
        );
        return;
      }

      if (action === "REMOVE_FROM_CART" && product) {
        if (!matchingCartItem) {
          console.warn(
            `[DuplexWidget] Cannot remove: no matching cart item for product ${productId} size "${requestedSize}"`
          );
          return;
        }

        dispatch(
          remove({
            id: product.id,
            attributes: matchingCartItem.attributes,
            quantity: matchingCartItem.quantity,
          })
        );
        console.info(`[DuplexWidget] REMOVE_FROM_CART product ${productId}`);
        return;
      }

      if (action !== "ADD_TO_CART") {
        return;
      }

      if (!product) {
        console.warn(`[DuplexWidget] Cannot add unknown product ${productId}`);
        return;
      }

      if (!size) {
        console.warn(
          `[DuplexWidget] Cannot add product ${productId} without a valid size`
        );
        return;
      }

      if (!isProductSizeAvailable(product.id, requestedSize)) {
        console.warn(
          `[DuplexWidget] Cannot add unavailable size "${requestedSize}" for product ${productId}`
        );
        return;
      }

      const quantity = Number(payload.quantity ?? 1);
      if (!Number.isInteger(quantity) || quantity <= 0) {
        console.warn(
          `[DuplexWidget] Cannot add product ${productId} with invalid quantity`
        );
        return;
      }

      const inventory = getProductInventory(product.id);
      const totalProductQuantity = cartItems
        .filter((item) => item.id === product.id)
        .reduce((total, item) => total + item.quantity, 0);
      if (totalProductQuantity + quantity > (inventory?.stock ?? 0)) {
        console.warn(
          `[DuplexWidget] Cannot add more than available stock for product ${productId}`
        );
        return;
      }

      if (matchingCartItem) {
        dispatch(
          setCartItemQuantity({
            id: product.id,
            attributes: matchingCartItem.attributes,
            quantity: matchingCartItem.quantity + quantity,
          })
        );
      } else {
        const attributes = [
          displaySize(requestedSize),
          selectedColor,
        ];

        dispatch(
          addToCart({
            id: product.id,
            name: product.title,
            srcUrl: product.srcUrl,
            price: product.price,
            attributes,
            discount: product.discount,
            quantity,
          })
        );
      }

      console.info(
        `[DuplexWidget] ADD_TO_CART dispatched to Redux for product ${productId}`
      );
    },
    [dispatch, store]
  );

  return (
    <DuplexWidgetProvider wsUrl={wsUrl} onSystemAction={handleSystemAction}>
      <DuplexNavigationBridge />
      <CartRecoveryPrompt />
      <StoreSupportChat />
      {children}
    </DuplexWidgetProvider>
  );
}

const Providers = ({ children }: Props) => {
  const { store, persistor } = makeStore();

  return (
    <Provider store={store}>
      <PersistGate
        loading={
          <div className="flex items-center justify-center h-96">
            <SpinnerbLoader className="w-10 border-2 border-gray-300 border-r-gray-600" />
          </div>
        }
        persistor={persistor}
      >
        <DuplexProviders>{children}</DuplexProviders>
      </PersistGate>
    </Provider>
  );
};

export default Providers;
