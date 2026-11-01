'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';

import type { ChatMessage, DuplexConnectionState, InteractionMode, ProductContext } from '../../types/duplex';
import { AudioWaveform } from './AudioWaveform';

interface ProductAssistantPanelProps {
  product: ProductContext;
  messages: ChatMessage[];
  connectionState: DuplexConnectionState;
  interactionMode: InteractionMode;
  isAudioMuted: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  analyserNode: AnalyserNode | null;
  onClose: () => void;
  onModeChange: (mode: InteractionMode) => void;
  onAudioMutedChange: (muted: boolean) => void;
  onSendText: (text: string) => void;
  onToggleListening: () => void;
  onInterrupt: () => void;
  variant?: "product" | "support";
  suggestedQuestions?: string[];
  onSuggestedQuestion?: (question: string) => void;
}

export function ProductAssistantPanel({
  product,
  messages,
  connectionState,
  interactionMode,
  isAudioMuted,
  isListening,
  isSpeaking,
  analyserNode,
  onClose,
  onModeChange,
  onAudioMutedChange,
  onSendText,
  onToggleListening,
  onInterrupt,
  variant = "product",
  suggestedQuestions = [],
  onSuggestedQuestion,
}: ProductAssistantPanelProps) {
  const [draft, setDraft] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isNight = new Date().getHours() >= 21;

  useEffect(() => {
    const container = chatContainerRef.current;

    if (!container || messages.length === 0) {
      return;
    }

    container.scrollTop = container.scrollHeight;
  }, [messages]);

  const statusLabel =
    connectionState === 'connecting'
      ? 'Connecting...'
      : connectionState === 'error'
        ? 'Assistant unavailable — check microphone permissions and the voice server.'
      : isSpeaking && !isAudioMuted
        ? 'Assistant speaking...'
        : isListening
          ? 'Listening...'
          : interactionMode === 'text'
            ? 'Text mode — type a message'
            : 'Ready to help';

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = draft.trim();

    if (!trimmed) {
      return;
    }

    onSendText(trimmed);
    setDraft('');
  };

  return (
    <div className={`mt-2 w-full ${variant === "product" ? "lg:max-w-[295px]" : ""} rounded-[16px] border border-black/10 bg-white shadow-sm overflow-hidden`}>
      <div className="flex items-center justify-between gap-2 border-b border-black/5 px-3 py-2">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.18em] text-black/45">Store Assistant</p>
          <p className="truncate text-xs font-medium text-black">{product.productName}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close assistant"
          className="shrink-0 rounded-full px-2 py-1 text-xs text-black/55 hover:bg-black/5"
        >
          Close
        </button>
      </div>

      <div
        ref={chatContainerRef}
        className={`${variant === "support" ? "max-h-64" : "max-h-36"} overflow-y-auto px-3 py-2 space-y-2 bg-[#FAFAFA]`}
      >
        {messages.length === 0 ? (
          <div className="space-y-2">
            <p className="text-xs leading-relaxed text-black/55">
              {variant === "support"
                ? "Ask about products, sizing, styling, or this demo storefront. Order records and returns are not available here."
                : isNight
                  ? 'Night mode: mute audio and type your question below.'
                  : 'Ask about sizes, stock, or materials for this item. Voice or text.'}
            </p>
            {suggestedQuestions.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {suggestedQuestions.map((question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => onSuggestedQuestion?.(question)}
                    className="rounded-full border border-black/10 bg-white px-2.5 py-1 text-[11px] text-black/70 hover:border-black/30"
                  >
                    {question}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`rounded-xl px-2.5 py-1.5 text-xs leading-relaxed ${
                message.role === 'user'
                  ? 'ml-6 bg-black text-white'
                  : 'mr-4 bg-white border border-black/8 text-black/85'
              }`}
            >
              {message.text}
            </div>
          ))
        )}
      </div>

      {interactionMode === 'voice' && !isAudioMuted ? (
        <div className="border-t border-black/5 bg-neutral-950 px-2 py-2">
          <p className="mb-1 text-[10px] text-white/50">{statusLabel}</p>
          <AudioWaveform
            analyserNode={analyserNode}
            isActive={isSpeaking || isListening}
            barColor="#ffffff"
            inactiveColor="rgba(255,255,255,0.15)"
            height={44}
            barCount={32}
          />
        </div>
      ) : (
        <div className="border-t border-black/5 px-3 py-2">
          <p className="text-[10px] text-black/45">{statusLabel}</p>
        </div>
      )}

      <div className="flex items-center gap-1 border-t border-black/5 px-2 py-2">
        <button
          type="button"
          onClick={() => onModeChange('voice')}
          className={`rounded-full px-2.5 py-1 text-[11px] ${
            interactionMode === 'voice' ? 'bg-black text-white' : 'text-black/60 hover:bg-black/5'
          }`}
        >
          Voice
        </button>
        <button
          type="button"
          onClick={() => onModeChange('text')}
          className={`rounded-full px-2.5 py-1 text-[11px] ${
            interactionMode === 'text' ? 'bg-black text-white' : 'text-black/60 hover:bg-black/5'
          }`}
        >
          Text
        </button>
        <button
          type="button"
          onClick={() => onAudioMutedChange(!isAudioMuted)}
          className={`rounded-full px-2.5 py-1 text-[11px] ${
            isAudioMuted ? 'bg-black/8 text-black/70' : 'text-black/60 hover:bg-black/5'
          }`}
          title="Mute assistant audio"
        >
          {isAudioMuted ? '🔇 Muted' : '🔊 Sound'}
        </button>
      </div>

      {interactionMode === 'text' || isAudioMuted ? (
        <form onSubmit={handleSubmit} className="flex gap-2 border-t border-black/5 px-2 pb-2">
          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Type your question..."
            className="min-w-0 flex-1 rounded-full border border-black/10 px-3 py-2 text-xs outline-none focus:border-black/30"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            className="shrink-0 rounded-full bg-black px-3 py-2 text-xs font-medium text-white disabled:opacity-40"
          >
            Send
          </button>
        </form>
      ) : (
        <div className="flex justify-end gap-2 border-t border-black/5 px-2 pb-2 pt-1">
          {isSpeaking ? (
            <button
              type="button"
              onClick={onInterrupt}
              className="rounded-full border border-black/15 px-3 py-1.5 text-xs hover:bg-black/5"
            >
              Interrupt
            </button>
          ) : null}
          <button
            type="button"
            onClick={onToggleListening}
            className="rounded-full bg-black px-3 py-1.5 text-xs font-medium text-white"
          >
            {isListening ? 'Stop Mic' : 'Start Mic'}
          </button>
        </div>
      )}
    </div>
  );
}
