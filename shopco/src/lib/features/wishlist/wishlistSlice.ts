import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface WishlistState {
  productIds: number[];
}

const initialState: WishlistState = {
  productIds: [],
};

const wishlistSlice = createSlice({
  name: "wishlist",
  initialState,
  reducers: {
    toggleWishlistProduct: (state, action: PayloadAction<number>) => {
      if (state.productIds.includes(action.payload)) {
        state.productIds = state.productIds.filter((id) => id !== action.payload);
      } else {
        state.productIds.push(action.payload);
      }
    },
  },
});

export const { toggleWishlistProduct } = wishlistSlice.actions;
export default wishlistSlice.reducer;
