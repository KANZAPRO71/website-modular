import type { BrainReply, ProductContext } from './types.js';
import { lookupInventory } from './inventory.js';

export interface ConversationTurn {
  role: 'user' | 'assistant';
  text: string;
}

export class SessionManager {
  readonly id: string;
  productContext: ProductContext = {};
  history: ConversationTurn[] = [];
  interrupted = false;
  isSpeaking = false;
  utteranceCount = 0;

  constructor(id: string) {
    this.id = id;
  }

  setProductContext(context: ProductContext | undefined): void {
    this.productContext = context ?? {};
  }

  markInterrupted(): void {
    this.interrupted = true;
    this.isSpeaking = false;
  }

  clearInterrupted(): void {
    this.interrupted = false;
  }

  markSpeaking(value: boolean): void {
    this.isSpeaking = value;
  }

  addUserTurn(text: string): void {
    this.history.push({ role: 'user', text });
    this.utteranceCount += 1;
  }

  addAssistantTurn(text: string): void {
    this.history.push({ role: 'assistant', text });
  }

  buildGreeting(): string {
    const productName = this.productContext.productName ?? 'produk ini';
    const stock = lookupInventory(this.productContext.productId);

    if (stock.stock <= 0) {
      return `Halo kak! Tertarik dengan ${productName}? Maaf ya, stoknya lagi habis. Mau saya rekomendasikan alternatif serupa?`;
    }

    return `Wah, ${productName} ya kak? Pilihan bagus — biasanya pakai ukuran apa? Stok masih ${stock.stock} pcs, size ${stock.sizes.join(', ')} ready kok.`;
  }

  getRecentHistory(limit = 6): ConversationTurn[] {
    return this.history.slice(-limit);
  }

  shouldEmitCartAction(reply: BrainReply): boolean {
    return reply.action.type === 'ADD_TO_CART' && Boolean(reply.action.productId);
  }
}
