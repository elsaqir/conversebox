import { useState, useRef, useEffect } from "react";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import ThemeToggle from "@/components/ThemeToggle";
import { generateResponse } from "@/lib/gemini";
import { useToast } from "@/components/ui/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Menu, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-mobile";

interface Message {
  id?: string;
  text: string;
  isBot: boolean;
  fileUrl?: string;
  fileType?: string;
}

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [controller, setController] = useState<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const queryClient = useQueryClient();

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

  const deleteConversation = useMutation({
    mutationFn: async (conversationId: string) => {
      await supabase
        .from("messages")
        .delete()
        .eq("conversation_id", conversationId);
      
      await supabase
        .from("conversations")
        .delete()
        .eq("id", conversationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      if (conversations?.length === 1) {
        handleNewChat();
      }
      toast({
        title: "Conversation deleted",
        description: "The conversation has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete the conversation.",
        variant: "destructive",
      });
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

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await supabase
        .from("messages")
        .delete()
        .eq("id", messageId);

      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
      queryClient.invalidateQueries({ queryKey: ["messages", currentConversationId] });
      
      toast({
        title: "Message deleted",
        description: "The message has been removed from the conversation.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete the message. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleStopGeneration = () => {
    if (controller) {
      controller.abort();
      setController(null);
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (message: string, file?: File) => {
    if (!currentConversationId) {
      const conversation = await createConversation.mutateAsync();
      setCurrentConversationId(conversation.id);
    }

    const newController = new AbortController();
    setController(newController);

    const newMessage: Message = {
      text: message,
      isBot: false,
      fileUrl: file ? URL.createObjectURL(file) : undefined,
      fileType: file?.type
    };
    
    setMessages((prev) => [...prev, newMessage]);
    setIsLoading(true);

    try {
      const lastMessages = messages
        .slice(-20)
        .map(m => m.text)
        .join("\n");
      
      const contextPrompt = `Previous conversation:\n${lastMessages}\n\nNew message: ${message}`;
      
      const userMessage = await addMessage.mutateAsync({
        content: message,
        isBot: false,
        conversationId: currentConversationId!,
      });

      if (userMessage) {
        newMessage.id = userMessage.id;
      }

      const response = await generateResponse(contextPrompt, file);
      const botMessage = await addMessage.mutateAsync({
        content: response,
        isBot: true,
        conversationId: currentConversationId!,
      });

      setMessages((prev) => [...prev, { 
        id: botMessage?.id,
        text: response, 
        isBot: true 
      }]);

    } catch (error) {
      if (error.name === 'AbortError') {
        toast({
          title: "Generation stopped",
          description: "The response generation was stopped.",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to generate response. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
      setController(null);
    }
  };

  return (
    <div className="flex h-screen max-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-20 flex h-full w-72 flex-col glass border-r transition-transform duration-300 md:relative",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex h-14 items-center justify-between gap-2 border-b px-4">
          <h2 className="font-semibold text-lg">Conversations</h2>
          <Button size="icon" variant="outline" onClick={handleNewChat}>
            <Plus size={18} />
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="space-y-2 p-4">
            {conversations?.map((conversation) => (
              <div
                key={conversation.id}
                className="group relative"
              >
                <button
                  onClick={() => {
                    setCurrentConversationId(conversation.id);
                    if (isMobile) setSidebarOpen(false);
                  }}
                  className={cn(
                    "w-full rounded-lg p-3 text-left text-sm transition-colors hover:bg-muted relative",
                    "group-hover:pr-12", // Make space for delete button
                    conversation.id === currentConversationId && "bg-muted"
                  )}
                >
                  <div className="line-clamp-1 font-medium">
                    {conversation.title || "New Chat"}
                  </div>
                  {conversation.last_message && (
                    <div className="line-clamp-1 text-xs text-muted-foreground mt-1">
                      {conversation.last_message}
                    </div>
                  )}
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteConversation.mutate(conversation.id)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive transition-colors" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="glass border-b px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu size={18} />
            </Button>
            <h1 className="text-lg font-semibold bg-gradient-to-r from-primary to-primary/50 bg-clip-text text-transparent">
              Gemini Chat
            </h1>
          </div>
          <ThemeToggle />
        </header>

        <main className="flex-1 overflow-hidden relative">
          <ScrollArea className="h-full bg-gradient-to-b from-background to-background/50">
            <div className="max-w-3xl mx-auto">
              {messages.map((message, index) => (
                <ChatMessage
                  key={message.id || index}
                  message={message.text}
                  isBot={message.isBot}
                  animate={index === messages.length - 1}
                  fileUrl={message.fileUrl}
                  fileType={message.fileType}
                  onDelete={message.id ? () => handleDeleteMessage(message.id!) : undefined}
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
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background to-transparent h-20 pointer-events-none" />
        </main>

        <div className="max-w-3xl mx-auto w-full p-4">
          <ChatInput 
            onSend={handleSendMessage} 
            onStopGeneration={handleStopGeneration}
            disabled={isLoading} 
            isGenerating={isLoading}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;
