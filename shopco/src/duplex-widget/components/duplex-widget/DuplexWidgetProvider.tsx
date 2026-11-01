'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { useFullDuplexVoice } from '../../hooks/useFullDuplexVoice';
import { enrichProductContext } from '../../utils/duplexContext';
import type {
  ChatMessage,
  InteractionMode,
  ProductContext,
  UseFullDuplexVoiceOptions,
} from '../../types/duplex';

interface DuplexWidgetProviderProps extends Omit<UseFullDuplexVoiceOptions, 'productContext'> {
  children: ReactNode;
}

interface OpenWidgetOptions {
  mode?: InteractionMode;
}

interface DuplexWidgetContextValue {
  openWidget: (product?: ProductContext, options?: OpenWidgetOptions) => Promise<void>;
  switchToProduct: (product: ProductContext) => void;
  triggerProductHighlight: (productId: string) => void;
  highlightedProductId: string | null;
  closeWidget: () => void;
  activeProduct: ProductContext | null;
  isPanelOpen: boolean;
  chatMessages: ChatMessage[];
  interactionMode: InteractionMode;
  isAudioMuted: boolean;
  connectionState: ReturnType<typeof useFullDuplexVoice>['connectionState'];
  isListening: boolean;
  isSpeaking: boolean;
  analyserNode: AnalyserNode | null;
  setInteractionMode: (mode: InteractionMode) => void;
  setAudioMuted: (muted: boolean) => void;
  sendTextMessage: (text: string) => void;
  toggleListening: () => void;
  interrupt: () => void;
}

const CART_CONFIRMATIONS = new Set([
  'yes',
  'yeah',
  'yep',
  'yup',
  'ok',
  'okay',
  'sure',
  'please do',
  'yes please',
  'yes add it',
  'go ahead',
  'go ahead add it',
  'add it',
  'do that',
  'iya',
  'ya',
  'oke',
  'boleh',
  'silakan',
]);

const DuplexWidgetContext = createContext<DuplexWidgetContextValue | null>(null);

function createMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isExplicitCartConfirmation(text: string): boolean {
  const confirmation = text
    .trim()
    .toLowerCase()
    .replace(/[,.!?]/g, ' ')
    .replace(/\s+/g, ' ');

  return CART_CONFIRMATIONS.has(confirmation);
}

function isCartConfirmationOffer(text: string): boolean {
  return /\b(?:want|would you like|shall|should|can i)\b.{0,100}\b(?:add|save)\b.{0,80}\b(?:to your cart|in your cart|to cart)\b/i.test(
    text,
  );
}

function sanitizeTranscript(text: string): string {
  return text
    .replace(/response:\w+\{[^}]*\}/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function mergeTranscriptText(existing: string, incoming: string): string {
  const next = sanitizeTranscript(incoming);

  if (!next) {
    return existing;
  }

  if (!existing) {
    return next;
  }

  if (next === existing) {
    return existing;
  }

  if (next.startsWith(existing)) {
    return next;
  }

  if (existing.startsWith(next)) {
    return existing;
  }

  return next;
}

function isNewAssistantTurn(existing: string, incoming: string): boolean {
  const next = sanitizeTranscript(incoming);
  const prev = existing.trim();

  if (!prev || !next) {
    return false;
  }

  if (next.startsWith(prev) || prev.startsWith(next)) {
    return false;
  }

  return true;
}

function appendMessage(
  messages: ChatMessage[],
  role: ChatMessage['role'],
  text: string,
  final = false,
): ChatMessage[] {
  const trimmed = sanitizeTranscript(text);

  if (!trimmed) {
    return messages;
  }

  const last = messages[messages.length - 1];

  if (last && last.role === role && last.final && final) {
    return [...messages, { id: createMessageId(), role, text: trimmed, final: true }];
  }

  if (last && last.role === role) {
    if (last.text === trimmed) {
      if (final && !last.final) {
        return [...messages.slice(0, -1), { ...last, final: true }];
      }

      return messages;
    }

    if (role === 'assistant' && isNewAssistantTurn(last.text, trimmed)) {
      const finalized = last.final ? messages : [...messages.slice(0, -1), { ...last, final: true }];

      return [...finalized, { id: createMessageId(), role, text: trimmed, final }];
    }

    if (!last.final) {
      const merged = mergeTranscriptText(last.text, trimmed);

      if (merged === last.text && last.final === final) {
        return messages;
      }

      return [...messages.slice(0, -1), { ...last, text: merged, final: final || last.final }];
    }
  }

  return [...messages, { id: createMessageId(), role, text: trimmed, final }];
}

function finalizeLastAssistantMessage(messages: ChatMessage[]): ChatMessage[] {
  const last = messages[messages.length - 1];

  if (!last || last.role !== 'assistant' || last.final) {
    return messages;
  }

  return [...messages.slice(0, -1), { ...last, final: true }];
}

export function DuplexWidgetProvider({ children, ...options }: DuplexWidgetProviderProps) {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activeProduct, setActiveProduct] = useState<ProductContext | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [interactionMode, setInteractionModeState] = useState<InteractionMode>('text');
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [highlightedProductId, setHighlightedProductId] = useState<string | null>(null);
  const pendingCartConfirmationRef = useRef<number | null>(null);
  const lastUserTranscriptRef = useRef('');

  const triggerProductHighlight = useCallback((productId: string) => {
    setHighlightedProductId(productId);
    window.setTimeout(() => {
      setHighlightedProductId((current) => (current === productId ? null : current));
    }, 2500);
  }, []);

  const voice = useFullDuplexVoice({
    ...options,
    productContext: activeProduct,
    onSystemAction: (action, payload) => {
      if (action === 'ADD_TO_CART') {
        const offerAt = pendingCartConfirmationRef.current;
        const confirmed =
          offerAt !== null &&
          Date.now() - offerAt <= 30_000 &&
          isExplicitCartConfirmation(lastUserTranscriptRef.current);
        pendingCartConfirmationRef.current = null;
        lastUserTranscriptRef.current = '';

        if (!confirmed) {
          console.warn('[DuplexWidget] blocked ADD_TO_CART without a recent explicit confirmation');
          return;
        }
      }

      if (action === 'NAVIGATE_TO_PRODUCT') {
        setChatMessages((current) => finalizeLastAssistantMessage(current));
        triggerProductHighlight(String(payload.productId ?? ''));
      }

      if (options.onSystemAction) {
        options.onSystemAction(action, payload);
      } else {
        executeSystemAction(action, payload);
      }
    },
    onTranscript: (role, text, final) => {
      if (role === 'assistant' && isCartConfirmationOffer(text)) {
        pendingCartConfirmationRef.current = Date.now();
        lastUserTranscriptRef.current = '';
      } else if (role === 'user' && final) {
        if (!isExplicitCartConfirmation(text)) {
          pendingCartConfirmationRef.current = null;
        }
        lastUserTranscriptRef.current = text.trim();
      }

      setChatMessages((current) =>
        appendMessage(current, role === 'user' ? 'user' : 'assistant', text, final ?? false),
      );
    },
  });

  const switchToProduct = useCallback(
    (product: ProductContext) => {
      const enriched = enrichProductContext(product);
      pendingCartConfirmationRef.current = null;
      lastUserTranscriptRef.current = '';
      setActiveProduct(enriched);
      setIsPanelOpen(true);
      voice.updateProductContext(enriched);
    },
    [voice],
  );

  const startListeningSafely = useCallback(
    async (context?: ProductContext | null) => {
      try {
        await voice.startListening(context);
      } catch (error) {
        console.error('[DuplexWidget] Unable to start voice input', error);
      }
    },
    [voice],
  );

  const openWidget = useCallback(
    async (product?: ProductContext, options?: OpenWidgetOptions) => {
      const isNight = new Date().getHours() >= 21;
      const mode: InteractionMode = options?.mode ?? (isNight ? 'text' : 'voice');
      const muted = mode === 'text' || (isNight && options?.mode !== 'voice');

      const enriched = enrichProductContext(product);

      pendingCartConfirmationRef.current = null;
      lastUserTranscriptRef.current = '';
      voice.resetSession();
      setActiveProduct(enriched);
      setChatMessages([]);
      setInteractionModeState(mode);
      setIsAudioMuted(muted);
      setIsPanelOpen(true);

      try {
        await voice.startSession(enriched, mode);

        if (mode === 'voice' && !muted) {
          await startListeningSafely(enriched);
        }
      } catch (error) {
        console.error('[DuplexWidget] Unable to open voice assistant', error);
      }
    },
    [startListeningSafely, voice],
  );

  const closeWidget = useCallback(() => {
    pendingCartConfirmationRef.current = null;
    lastUserTranscriptRef.current = '';
    voice.stopListening();
    voice.resetSession();
    setIsPanelOpen(false);
  }, [voice]);

  const setInteractionMode = useCallback(
    (mode: InteractionMode) => {
      setInteractionModeState(mode);

      if (mode === 'text') {
        voice.stopListening();
        return;
      }

      if (isPanelOpen && activeProduct) {
        void startListeningSafely(activeProduct);
      }
    },
    [activeProduct, isPanelOpen, startListeningSafely, voice],
  );

  const setAudioMuted = useCallback(
    (muted: boolean) => {
      setIsAudioMuted(muted);
      voice.setAudioMuted(muted);

      if (muted) {
        voice.interrupt();
        voice.stopListening();
      }
    },
    [voice],
  );

  const sendTextMessage = useCallback(
    (text: string) => {
      setChatMessages((current) => appendMessage(current, 'user', text, true));
      voice.sendTextMessage(text);
    },
    [voice],
  );

  const toggleListening = useCallback(() => {
    if (voice.isListening) {
      voice.stopListening();
      return;
    }

    void startListeningSafely(activeProduct);
  }, [activeProduct, startListeningSafely, voice]);

  const value = useMemo(
    () => ({
      openWidget,
      switchToProduct,
      triggerProductHighlight,
      highlightedProductId,
      closeWidget,
      activeProduct,
      isPanelOpen,
      chatMessages,
      interactionMode,
      isAudioMuted,
      connectionState: voice.connectionState,
      isListening: voice.isListening,
      isSpeaking: voice.isSpeaking,
      analyserNode: voice.analyserNode,
      setInteractionMode,
      setAudioMuted,
      sendTextMessage,
      toggleListening,
      interrupt: voice.interrupt,
    }),
    [
      activeProduct,
      chatMessages,
      closeWidget,
      interactionMode,
      isAudioMuted,
      isPanelOpen,
      highlightedProductId,
      openWidget,
      switchToProduct,
      triggerProductHighlight,
      sendTextMessage,
      setAudioMuted,
      setInteractionMode,
      toggleListening,
      voice.analyserNode,
      voice.connectionState,
      voice.interrupt,
      voice.isListening,
      voice.isSpeaking,
    ],
  );

  return <DuplexWidgetContext.Provider value={value}>{children}</DuplexWidgetContext.Provider>;
}

export function useDuplexWidget(): DuplexWidgetContextValue {
  const context = useContext(DuplexWidgetContext);

  if (!context) {
    throw new Error('useDuplexWidget must be used within DuplexWidgetProvider');
  }

  return context;
}

function executeSystemAction(action: string, payload: Record<string, unknown>): void {
  if (action === 'ADD_TO_CART') {
    const productId = String(payload.productId ?? '');
    const selector = `[data-product-id="${productId}"] .add-to-cart-btn`;
    const button = document.querySelector<HTMLButtonElement>(selector);

    if (button) {
      button.click();
    }
  }
}
