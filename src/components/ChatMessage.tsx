
import React from "react";
import { cn } from "@/lib/utils";
import { User2, Bot } from "lucide-react";

interface ChatMessageProps {
  message: string;
  isBot: boolean;
  animate?: boolean;
  fileUrl?: string;
  fileType?: string;
}

const ChatMessage = ({ message, isBot, animate = true, fileUrl, fileType }: ChatMessageProps) => {
  const renderFilePreview = () => {
    if (!fileUrl) return null;

    if (fileType?.startsWith('image/')) {
      return (
        <img
          src={fileUrl}
          alt="Uploaded image"
          className="max-w-full rounded-lg mb-2 max-h-[300px] object-contain"
        />
      );
    }

    return (
      <div className="bg-muted rounded-lg p-3 mb-2 text-sm">
        Uploaded file: {fileUrl.split('/').pop()}
      </div>
    );
  };

  return (
    <div
      className={cn(
        "flex gap-4 p-4 transition-opacity",
        animate && "fade-in slide-in",
        isBot ? "bg-muted/50" : "bg-background"
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
      <div className="flex-1 space-y-2">
        <div
          className={cn(
            "rounded-2xl p-4 inline-block max-w-[85%]",
            isBot
              ? "glass text-foreground"
              : "bg-primary text-primary-foreground"
          )}
        >
          {renderFilePreview()}
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message}</p>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
