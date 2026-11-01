import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function publicAssetPath(path: string): string {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  return `${basePath}${path.startsWith('/') ? path : `/${path}`}`;
}

export const compareArrays = (a: any[], b: any[]) => {
  return a.toString() === b.toString();
};
