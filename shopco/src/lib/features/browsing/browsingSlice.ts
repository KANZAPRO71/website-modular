import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface BrowsingState {
  productIds: number[];
}

const initialState: BrowsingState = {
  productIds: [],
};

const MAX_RECENT_PRODUCTS = 10;

const browsingSlice = createSlice({
  name: "browsing",
  initialState,
  reducers: {
    recordProductView: (state, action: PayloadAction<number>) => {
      state.productIds = [
        action.payload,
        ...state.productIds.filter((id) => id !== action.payload),
      ].slice(0, MAX_RECENT_PRODUCTS);
    },
  },
});

export const { recordProductView } = browsingSlice.actions;
export default browsingSlice.reducer;
