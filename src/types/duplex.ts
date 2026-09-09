export type DuplexConnectionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'listening'
  | 'speaking'
  | 'error';

export type InteractionMode = 'voice' | 'text';

export type ServerMessageType =
  | 'AUDIO_CHUNK'
  | 'SYSTEM_ACTION'
  | 'TRANSCRIPT'
  | 'ERROR'
  | 'PONG';

export interface AudioChunkMessage {
  type: 'AUDIO_CHUNK';
  data: string;
  format?: 'pcm16' | 'webm' | 'wav';
  sampleRate?: number;
  channels?: number;
}

export interface SystemActionMessage {
  type: 'SYSTEM_ACTION';
  action: string;
  payload: Record<string, unknown>;
}

export interface TranscriptMessage {
  type: 'TRANSCRIPT';
  role: 'user' | 'assistant';
  text: string;
  final?: boolean;
}

export interface ErrorMessage {
  type: 'ERROR';
  message: string;
}

export type ServerMessage =
  | AudioChunkMessage
  | SystemActionMessage
  | TranscriptMessage
  | ErrorMessage;

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  final?: boolean;
}

export interface ProductContext {
  productId: string;
  productName: string;
  stockStatus?: string;
  storeName?: string;
  pagePath?: string;
  pageLabel?: string;
}

export interface UseFullDuplexVoiceOptions {
  wsUrl: string;
  productContext?: ProductContext | null;
  chunkIntervalMs?: number;
  vadThreshold?: number;
  playbackSampleRate?: number;
  onSystemAction?: (action: string, payload: Record<string, unknown>) => void;
  onConnectionChange?: (state: DuplexConnectionState) => void;
  onTranscript?: (role: 'user' | 'assistant', text: string, final?: boolean) => void;
  onError?: (error: Error) => void;
}

export interface NavigateProductPayload {
  productId: string;
  productName?: string;
  slug?: string;
  view?: 'catalog' | 'detail' | string;
}

export interface UseFullDuplexVoiceReturn {
  connectionState: DuplexConnectionState;
  isListening: boolean;
  isSpeaking: boolean;
  isAudioMuted: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  startSession: (context?: ProductContext | null, mode?: InteractionMode) => Promise<void>;
  startListening: (context?: ProductContext | null) => Promise<void>;
  stopListening: () => void;
  sendTextMessage: (text: string) => void;
  setAudioMuted: (muted: boolean) => void;
  resetSession: () => void;
  updateProductContext: (context: ProductContext) => void;
  interrupt: () => void;
  analyserNode: AnalyserNode | null;
}
