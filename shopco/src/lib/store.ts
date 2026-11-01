import {
  combineReducers,
  configureStore,
  isAnyOf,
  type Middleware,
} from "@reduxjs/toolkit";
import { persistReducer, persistStore } from "redux-persist";
import storage from "@/components/storage";
import productsReducer from "./features/products/productsSlice";
import cartsReducer, {
  addToCart,
  clearCart,
  markCartUpdated,
  remove,
  removeCartItem,
  setCartItemQuantity,
} from "./features/carts/cartsSlice";
import wishlistReducer from "./features/wishlist/wishlistSlice";
import browsingReducer from "./features/browsing/browsingSlice";

const persistConfig = {
  key: "root",
  storage,
  version: 1,
  whitelist: ["carts", "wishlist", "browsing"],
};

const rootReducer = combineReducers({
  products: productsReducer,
  carts: cartsReducer,
  wishlist: wishlistReducer,
  browsing: browsingReducer,
});

const cartActivityMiddleware: Middleware<
  object,
  ReturnType<typeof rootReducer>
> = ({ dispatch, getState }) => (next) => (action) => {
  const previousCart = getState().carts.cart;
  const result = next(action);
  const currentCart = getState().carts.cart;

  if (
    isAnyOf(addToCart, removeCartItem, setCartItemQuantity, remove, clearCart)(
      action
    ) &&
    previousCart !== currentCart
  ) {
    dispatch(
      markCartUpdated(
        currentCart && currentCart.items.length > 0 ? Date.now() : null
      )
    );
  }

  return result;
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const makeStore = () => {
  const store = configureStore({
    reducer: persistedReducer,
    devTools: process.env.NODE_ENV !== "production",
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }).concat(cartActivityMiddleware),
  });

  const persistor = persistStore(store);
  return { store, persistor };
};

const store = makeStore().store;

// Infer the type of the store
export type AppStore = typeof store;
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export { store };
