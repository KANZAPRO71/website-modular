export interface ProductContext {
  productId?: string;
  productName?: string;
  stockStatus?: string;
  storeName?: string;
  pagePath?: string;
  pageLabel?: string;
}

export interface InventoryItem {
  name: string;
  stock: number;
  sizes: string[];
  price?: number;
}

export interface BrainAction {
  type: 'ADD_TO_CART' | 'NONE';
  productId?: string;
  size?: string;
  quantity?: number;
}

export interface BrainReply {
  speech: string;
  action: BrainAction;
}

export interface ClientPacket {
  type: 'SESSION_START' | 'AUDIO_CHUNK' | 'TEXT_MESSAGE' | 'INTERRUPT' | 'UPDATE_PRODUCT_CONTEXT';
  context?: ProductContext;
  data?: string;
  format?: string;
  text?: string;
  mode?: 'voice' | 'text';
}

export interface AudioChunkOutbound {
  type: 'AUDIO_CHUNK';
  data: string;
  format: 'pcm16';
  sampleRate: number;
  channels: number;
}

export interface SystemActionOutbound {
  type: 'SYSTEM_ACTION';
  action: string;
  payload: Record<string, unknown>;
}

export interface TranscriptOutbound {
  type: 'TRANSCRIPT';
  role: 'user' | 'assistant';
  text: string;
  final?: boolean;
}

export interface ErrorOutbound {
  type: 'ERROR';
  message: string;
}

export type OutboundPacket =
  | AudioChunkOutbound
  | SystemActionOutbound
  | TranscriptOutbound
  | ErrorOutbound;
