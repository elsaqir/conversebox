import { useState, useRef, useEffect } from "react";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import ThemeToggle from "@/components/ThemeToggle";
import { generateResponse } from "@/lib/gemini";
import { useToast } from "@/components/ui/use-toast";
import { useQuery, useMutation, QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Menu } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-mobile";

interface Message {
  text: string;
  isBot: boolean;
}

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const isMobile = useMediaQuery("(max-width: 768px)");

  // Fetch conversations
  const { data: conversations } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data } = await supabase
        .from("conversations")
        .select("*")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Fetch messages for current conversation
  const { data: currentMessages, refetch: refetchMessages } = useQuery({
    queryKey: ["messages", currentConversationId],
    queryFn: async () => {
      if (!currentConversationId) return [];
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", currentConversationId)
        .order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!currentConversationId,
  });

  // Update messages when conversation changes
  useEffect(() => {
    if (currentMessages) {
      setMessages(
        currentMessages.map((msg) => ({
          text: msg.content,
          isBot: msg.is_bot,
        }))
      );
    }
  }, [currentMessages]);

  // Create new conversation
  const createConversation = useMutation({
    mutationFn: async () => {
      const { data } = await supabase
        .from("conversations")
        .insert([{}])
        .select()
        .single();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  // Add message to conversation
  const addMessage = useMutation({
    mutationFn: async ({
      content,
      isBot,
      conversationId,
    }: {
      content: string;
      isBot: boolean;
      conversationId: string;
    }) => {
      const { data } = await supabase
        .from("messages")
        .insert([
          {
            content,
            is_bot: isBot,
            conversation_id: conversationId,
          },
        ])
        .select()
        .single();

      // Update last message in conversation
      await supabase
        .from("conversations")
        .update({ last_message: content })
        .eq("id", conversationId);

      return data;
    },
    onSuccess: () => {
      refetchMessages();
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleNewChat = async () => {
    try {
      const conversation = await createConversation.mutateAsync();
      setCurrentConversationId(conversation.id);
      setMessages([]);
      if (isMobile) {
        setSidebarOpen(false);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create new conversation",
        variant: "destructive",
      });
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!currentConversationId) {
      const conversation = await createConversation.mutateAsync();
      setCurrentConversationId(conversation.id);
    }

    const newMessage: Message = { text: message, isBot: false };
    setMessages((prev) => [...prev, newMessage]);
    setIsLoading(true);

    try {
      // Get last 20 messages for context
      const lastMessages = messages.slice(-20).map(m => m.text).join("\n");
      const contextPrompt = `Previous conversation:\n${lastMessages}\n\nNew message: ${message}`;
      
      // Save user message
      await addMessage.mutateAsync({
        content: message,
        isBot: false,
        conversationId: currentConversationId!,
      });

      const response = await generateResponse(contextPrompt);
      const botMessage: Message = { text: response, isBot: true };
      setMessages((prev) => [...prev, botMessage]);

      // Save bot message
      await addMessage.mutateAsync({
        content: response,
        isBot: true,
        conversationId: currentConversationId!,
      });

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
    <div className="flex h-screen max-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-20 flex h-full w-64 flex-col glass border-r transition-transform duration-300 md:relative",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex h-14 items-center justify-between gap-2 border-b px-4">
          <h2 className="font-semibold">Conversations</h2>
          <Button size="icon" variant="outline" onClick={handleNewChat}>
            <Plus size={18} />
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="space-y-2 p-4">
            {conversations?.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => {
                  setCurrentConversationId(conversation.id);
                  if (isMobile) setSidebarOpen(false);
                }}
                className={cn(
                  "w-full rounded-lg p-3 text-left text-sm transition-colors hover:bg-muted",
                  conversation.id === currentConversationId && "bg-muted"
                )}
              >
                <div className="line-clamp-1 font-medium">
                  {conversation.title || "New Chat"}
                </div>
                {conversation.last_message && (
                  <div className="line-clamp-1 text-xs text-muted-foreground">
                    {conversation.last_message}
                  </div>
                )}
              </button>
            ))}
          </div>
        </ScrollArea>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        <header className="glass border-b px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu size={18} />
            </Button>
            <h1 className="text-lg font-semibold">Gemini Chat</h1>
          </div>
          <ThemeToggle />
        </header>

        <main className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
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
          </ScrollArea>
        </main>

        <div className="max-w-3xl mx-auto w-full p-4">
          <ChatInput onSend={handleSendMessage} disabled={isLoading} />
        </div>
      </div>
    </div>
  );
};

export default Index;
