
import { useState, useRef, useEffect } from "react";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import ThemeToggle from "@/components/ThemeToggle";
import { generateResponse } from "@/lib/gemini";
import { useToast } from "@/components/ui/use-toast";

interface Message {
  text: string;
  isBot: boolean;
}

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (message: string) => {
    const newMessage: Message = { text: message, isBot: false };
    setMessages((prev) => [...prev, newMessage]);
    setIsLoading(true);

    try {
      const response = await generateResponse(message);
      const botMessage: Message = { text: response, isBot: true };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen max-h-screen bg-background">
      <header className="glass border-b px-4 h-14 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Gemini Chat</h1>
        <ThemeToggle />
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          {messages.map((message, index) => (
            <ChatMessage
              key={index}
              message={message.text}
              isBot={message.isBot}
              animate={index === messages.length - 1}
            />
          ))}
          {isLoading && (
            <div className="p-4 fade-in">
              <div className="flex gap-2 items-center text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-current animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-current animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 rounded-full bg-current animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      <div className="max-w-3xl mx-auto w-full p-4">
        <ChatInput onSend={handleSendMessage} disabled={isLoading} />
      </div>
    </div>
  );
};

export default Index;
