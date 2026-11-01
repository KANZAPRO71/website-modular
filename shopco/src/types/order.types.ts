import type { CartItem } from "@/lib/features/carts/cartsSlice";

export interface DemoOrder {
  id: string;
  createdAt: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: "cash-on-delivery-demo";
  status: "pending-demo";
}
