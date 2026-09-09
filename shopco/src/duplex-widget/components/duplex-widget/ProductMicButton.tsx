'use client';

import type { ProductContext } from '../../types/duplex';

interface ProductMicButtonProps {
  product: ProductContext;
  isActive?: boolean;
  onActivate: (product: ProductContext) => void;
  className?: string;
  showLabel?: boolean;
}

function VoiceWaveIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <rect x="4" y="10" width="2.2" height="4" rx="1.1" />
      <rect x="7.8" y="7" width="2.2" height="10" rx="1.1" />
      <rect x="11.6" y="4.5" width="2.2" height="15" rx="1.1" />
      <rect x="15.4" y="7" width="2.2" height="10" rx="1.1" />
      <rect x="19.2" y="10" width="2.2" height="4" rx="1.1" />
    </svg>
  );
}

export function ProductMicButton({
  product,
  isActive = false,
  onActivate,
  className = '',
  showLabel = true,
}: ProductMicButtonProps) {
  return (
    <button
      type="button"
      aria-label={`Mulai suara untuk ${product.productName}`}
      aria-pressed={isActive}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onActivate(product);
      }}
      className={`absolute bottom-1 left-3 z-20 flex items-center gap-1.5 rounded-full border border-black/10 bg-white/95 px-2.5 py-1.5 text-black shadow-sm backdrop-blur-sm transition hover:bg-white hover:shadow-md ${isActive ? 'ring-2 ring-black/20' : ''} ${className}`}
    >
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full bg-black text-white ${isActive ? 'animate-pulse' : ''}`}
      >
        <VoiceWaveIcon className="h-3 w-3" />
      </span>
      {showLabel ? (
        <span className="text-[11px] font-medium whitespace-nowrap">
          {isActive ? 'Suara aktif' : 'Mulai suara'}
        </span>
      ) : null}
    </button>
  );
}

export { VoiceWaveIcon };
