"use client";

import React, { useCallback } from "react";
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
import { compareArrays } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
};

const duplexWsUrl =
  process.env.NEXT_PUBLIC_DUPLEX_WS_URL ?? "ws://localhost:8787";

function DuplexProviders({ children }: Props) {
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
      const size = String(payload.size ?? "M");
      const attributes = [size, "Default"];

      if (action === "SET_CART_QUANTITY" && product) {
        const qty = Number(payload.quantity ?? 1);
        const existing = store
          .getState()
          .carts.cart?.items.find(
            (item) =>
              item.id === product.id && compareArrays(item.attributes, attributes)
          );

        if (!existing && qty > 0) {
          dispatch(
            addToCart({
              id: product.id,
              name: product.title,
              srcUrl: product.srcUrl,
              price: product.price,
              attributes,
              discount: product.discount,
              quantity: qty,
            })
          );
        } else {
          dispatch(
            setCartItemQuantity({
              id: product.id,
              attributes,
              quantity: qty,
            })
          );
        }
        console.info(
          `[DuplexWidget] SET_CART_QUANTITY product ${productId} qty=${qty}`
        );
        return;
      }

      if (action === "REMOVE_FROM_CART" && product) {
        dispatch(
          remove({
            id: product.id,
            attributes,
            quantity: 0,
          })
        );
        console.info(`[DuplexWidget] REMOVE_FROM_CART product ${productId}`);
        return;
      }

      if (action !== "ADD_TO_CART") {
        return;
      }

      const quantity = Number(payload.quantity ?? 1);

      if (product) {
        const existing = store
          .getState()
          .carts.cart?.items.find(
            (item) =>
              item.id === product.id && compareArrays(item.attributes, attributes)
          );

        if (existing) {
          dispatch(
            setCartItemQuantity({
              id: product.id,
              attributes,
              quantity: existing.quantity + quantity,
            })
          );
        } else {
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
        return;
      }

      const selector = `[data-product-id="${productId}"] .add-to-cart-btn`;
      document.querySelector<HTMLButtonElement>(selector)?.click();
      console.warn(
        `[DuplexWidget] ADD_TO_CART fallback DOM click for product ${productId}`
      );
    },
    [dispatch, store]
  );

  return (
    <DuplexWidgetProvider wsUrl={duplexWsUrl} onSystemAction={handleSystemAction}>
      <DuplexNavigationBridge />
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
