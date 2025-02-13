
import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip, X, StopCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string, file?: File) => void;
  onStopGeneration?: () => void;
  disabled?: boolean;
  isGenerating?: boolean;
}

const ChatInput = ({ onSend, onStopGeneration, disabled, isGenerating }: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((message.trim() || selectedFile) && !disabled) {
      onSend(message, selectedFile || undefined);
      setMessage("");
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "inherit";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200
      )}px`;
    }
  }, [message]);

  return (
    <div className="space-y-4">
      {selectedFile && (
        <div className="glass p-3 rounded-lg flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
              {selectedFile.type.startsWith('image/') ? (
                <img
                  src={URL.createObjectURL(selectedFile)}
                  alt="Preview"
                  className="w-full h-full object-cover rounded"
                />
              ) : (
                <Paperclip className="w-5 h-5" />
              )}
            </div>
            <span className="font-medium">{selectedFile.name}</span>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={removeFile}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      <form onSubmit={handleSubmit} className="glass p-4 rounded-lg">
        <div className="flex gap-2">
          <div className="flex-1">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={selectedFile ? "Add a message with your file..." : "Type a message..."}
              className={cn(
                "resize-none max-h-[200px] focus-visible:ring-1 bg-background/50",
                disabled && "opacity-50 cursor-not-allowed"
              )}
              disabled={disabled}
              rows={1}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
              className="flex-shrink-0"
              disabled={disabled}
            >
              <Paperclip size={18} />
            </Button>
            {isGenerating ? (
              <Button
                type="button"
                size="icon"
                variant="destructive"
                onClick={onStopGeneration}
                className="flex-shrink-0"
              >
                <StopCircle size={18} />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                disabled={(!message.trim() && !selectedFile) || disabled}
                className="flex-shrink-0"
              >
                <Send size={18} />
              </Button>
            )}
          </div>
        </div>
      </form>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".txt,.pdf,image/*"
        className="hidden"
      />
    </div>
  );
};

export default ChatInput;
