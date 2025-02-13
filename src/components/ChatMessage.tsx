
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
        isBot ? "bg-muted/50" : "bg-background",
        isBot ? "flex-row" : "flex-row-reverse"
      )}
    >
      <div className="flex-shrink-0">
        <div
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center",
            isBot
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground"
          )}
        >
          {isBot ? <Bot size={18} /> : <User2 size={18} />}
        </div>
      </div>
      <div
        className={cn(
          "flex-1 space-y-2",
          isBot ? "pr-12" : "pl-12"
        )}
      >
        <div
          className={cn(
            "rounded-2xl p-4 inline-block max-w-[85%]",
            isBot
              ? "glass text-foreground"
              : "bg-primary text-primary-foreground"
          )}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message}</p>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
