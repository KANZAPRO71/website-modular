"use client";

import { ProductAssistantPanel } from "@/duplex-widget/components/duplex-widget/ProductAssistantPanel";
import { useDuplexWidget } from "@/duplex-widget/components/duplex-widget/DuplexWidgetProvider";
import type { ProductContext } from "@/duplex-widget/types/duplex";
import { MessageCircle, X } from "lucide-react";
import { useState } from "react";

const SUPPORT_CONTEXT: ProductContext = {
  productId: "",
  productName: "SHOP.CO support",
  storeName: "SHOP.CO",
};

const SUGGESTED_QUESTIONS = [
  "Help me choose a size",
  "Suggest an outfit",
  "How does the demo checkout work?",
];

export default function StoreSupportChat() {
  const [isOpen, setIsOpen] = useState(false);
  const {
    openWidget,
    closeWidget,
    activeProduct,
    isPanelOpen,
    chatMessages,
    interactionMode,
    isAudioMuted,
    connectionState,
    isListening,
    isSpeaking,
    analyserNode,
    setInteractionMode,
    setAudioMuted,
    sendTextMessage,
    toggleListening,
    interrupt,
  } = useDuplexWidget();

  const isSupportSession = activeProduct?.productId === "";

  const handleOpen = async () => {
    setIsOpen(true);
    await openWidget(SUPPORT_CONTEXT, { mode: "text" });
  };

  const handleClose = () => {
    setIsOpen(false);
    if (isSupportSession && isPanelOpen) {
      closeWidget();
    }
  };

  const sendSuggestedQuestion = (question: string) => {
    sendTextMessage(question);
  };

  return (
    <>
      {isOpen && isSupportSession && isPanelOpen && activeProduct ? (
        <div className="fixed bottom-36 right-4 z-[70] w-[min(24rem,calc(100vw-2rem))]">
          <ProductAssistantPanel
            product={activeProduct}
            messages={chatMessages}
            connectionState={connectionState}
            interactionMode={interactionMode}
            isAudioMuted={isAudioMuted}
            isListening={isListening}
            isSpeaking={isSpeaking}
            analyserNode={analyserNode}
            onClose={handleClose}
            onModeChange={setInteractionMode}
            onAudioMutedChange={setAudioMuted}
            onSendText={sendTextMessage}
            onToggleListening={toggleListening}
            onInterrupt={interrupt}
            variant="support"
            suggestedQuestions={SUGGESTED_QUESTIONS}
            onSuggestedQuestion={sendSuggestedQuestion}
          />
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => {
          if (isOpen) {
            handleClose();
          } else {
            void handleOpen();
          }
        }}
        aria-label={isOpen ? "Close SHOP.CO support chat" : "Open SHOP.CO support chat"}
        aria-expanded={isOpen}
        className="fixed bottom-20 right-4 z-[70] flex h-14 items-center gap-2 rounded-full bg-black px-5 text-sm font-medium text-white shadow-lg transition hover:bg-black/80"
      >
        {isOpen ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
        {isOpen ? "Close" : "Need help?"}
      </button>
    </>
  );
}
