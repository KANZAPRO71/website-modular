import type { DemoOrder } from "@/types/order.types";

const STORAGE_KEY = "shopco-demo-orders";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCartItem(value: unknown): boolean {
  if (!isRecord(value) || !isRecord(value.discount) || !Array.isArray(value.attributes)) {
    return false;
  }

  return (
    Number.isSafeInteger(value.id) &&
    typeof value.name === "string" &&
    typeof value.srcUrl === "string" &&
    Number.isFinite(value.price) &&
    value.attributes.every((attribute) => typeof attribute === "string") &&
    Number.isFinite(value.discount.amount) &&
    Number.isFinite(value.discount.percentage) &&
    Number.isSafeInteger(value.quantity) &&
    Number(value.quantity) > 0
  );
}

function isDemoOrder(value: unknown): value is DemoOrder {
  if (!isRecord(value) || !Array.isArray(value.items)) return false;

  return (
    typeof value.id === "string" &&
    typeof value.createdAt === "string" &&
    value.items.every(isCartItem) &&
    Number.isFinite(value.subtotal) &&
    Number.isFinite(value.discount) &&
    Number.isFinite(value.total) &&
    value.paymentMethod === "cash-on-delivery-demo" &&
    value.status === "pending-demo"
  );
}

export function readDemoOrders(): DemoOrder[] {
  const storedOrders = window.localStorage.getItem(STORAGE_KEY);
  if (storedOrders === null) return [];

  const parsed: unknown = JSON.parse(storedOrders);
  if (!Array.isArray(parsed) || !parsed.every(isDemoOrder)) {
    throw new Error("Saved demo order data is invalid.");
  }
  return parsed;
}

export function saveDemoOrder(order: DemoOrder): void {
  const orders = readDemoOrders();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...orders, order]));
}
