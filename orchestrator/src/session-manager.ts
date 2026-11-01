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
    const productName = this.productContext.productName ?? 'this product';
    const stock = lookupInventory(this.productContext.productId);

    if (stock.stock <= 0) {
      return `Hello! Are you interested in the ${productName}? It is currently out of stock. Would you like a similar recommendation?`;
    }

    return `The ${productName} is a great choice! What size do you usually wear? We have ${stock.stock} in stock in sizes ${stock.sizes.join(', ')}.`;
  }

  getRecentHistory(limit = 6): ConversationTurn[] {
    return this.history.slice(-limit);
  }

  shouldEmitCartAction(reply: BrainReply): boolean {
    return reply.action.type === 'ADD_TO_CART' && Boolean(reply.action.productId);
  }
}
