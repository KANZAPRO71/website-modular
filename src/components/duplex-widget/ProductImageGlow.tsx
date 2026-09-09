'use client';

interface ProductImageGlowProps {
  active: boolean;
  className?: string;
}

export function ProductImageGlow({ active, className = '' }: ProductImageGlowProps) {
  if (!active) {
    return null;
  }

  return (
    <div
      aria-hidden
      className={`duplex-product-glow pointer-events-none absolute inset-0 z-20 rounded-[inherit] border-4 border-blue-500/80 ${className}`}
    />
  );
}
