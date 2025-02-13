
import React from "react";
import { cn } from "@/lib/utils";
import { User2, Bot } from "lucide-react";

interface ChatMessageProps {
  message: string;
  isBot: boolean;
  animate?: boolean;
}

const ChatMessage = ({ message, isBot, animate = true }: ChatMessageProps) => {
  return (
    <div
      className={cn(
        "flex gap-4 p-4 transition-opacity",
        animate && "fade-in slide-in",
        isBot ? "bg-muted/50" : "bg-background"
      )}
    >
      <div className="flex-shrink-0">
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center",
          isBot ? "bg-primary text-primary-foreground" : "bg-secondary"
        )}>
          {isBot ? <Bot size={18} /> : <User2 size={18} />}
        </div>
      </div>
      <div className="flex-1 space-y-2">
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message}</p>
      </div>
    </div>
  );
};

export default ChatMessage;
