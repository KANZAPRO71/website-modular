'use client';

import { AudioWaveform } from './AudioWaveform';
import type { DuplexConnectionState, ProductContext } from '../../types/duplex';

interface VoiceWidgetOverlayProps {
  isOpen: boolean;
  connectionState: DuplexConnectionState;
  isListening: boolean;
  isSpeaking: boolean;
  analyserNode: AnalyserNode | null;
  activeProduct?: ProductContext | null;
  onClose: () => void;
  onInterrupt: () => void;
  onToggleListening: () => void;
}

export function VoiceWidgetOverlay({
  isOpen,
  connectionState,
  isListening,
  isSpeaking,
  analyserNode,
  activeProduct,
  onClose,
  onInterrupt,
  onToggleListening,
}: VoiceWidgetOverlayProps) {
  if (!isOpen) {
    return null;
  }

  const statusLabel = isSpeaking
    ? 'Assistant is speaking'
    : isListening
      ? 'Listening...'
      : connectionState === 'connecting'
        ? 'Connecting...'
        : connectionState === 'error'
          ? 'Assistant unavailable — check microphone permissions and the voice server.'
        : 'Ready';

  return (
    <div className="pointer-events-none fixed inset-0 z-[999]">
      <div className="absolute inset-0 bg-black/35 backdrop-blur-[2px]" />

      <div className="pointer-events-auto absolute inset-x-0 bottom-0 mx-auto w-full max-w-3xl px-4 pb-6">
        <div className="rounded-3xl border border-white/15 bg-neutral-950/85 p-5 text-white shadow-2xl backdrop-blur-xl">
          <div className="mb-3 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-white/55">Full Duplex AI</p>
              <p className="mt-1 text-sm font-medium">{statusLabel}</p>
              {activeProduct ? (
                <p className="mt-1 text-xs text-white/70">
                  Context: {activeProduct.productName}
                  {activeProduct.stockStatus ? ` · ${activeProduct.stockStatus}` : ''}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/80 hover:bg-white/10"
            >
              Close
            </button>
          </div>

          <AudioWaveform
            analyserNode={analyserNode}
            isActive={isSpeaking || isListening}
            barColor="#f5f5f5"
            inactiveColor="rgba(255,255,255,0.12)"
            height={80}
          />

          <div className="mt-4 flex items-center justify-end gap-2">
            {isSpeaking ? (
              <button
                type="button"
                onClick={onInterrupt}
                className="rounded-full border border-white/20 px-4 py-2 text-sm hover:bg-white/10"
              >
                Interrupt
              </button>
            ) : null}

            <button
              type="button"
              onClick={onToggleListening}
              className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90"
            >
              {isListening ? 'Stop Mic' : 'Start Mic'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
