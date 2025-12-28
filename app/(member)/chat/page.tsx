"use client";

import { useState, useRef, useEffect, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, GlassCard, FadeIn, SlideUp, AIAvatar, TypingAnimation } from "@/components/ui";
import { getTranslations } from "@/lib/i18n";

const t = getTranslations("sr");

interface Message {
  role: "user" | "assistant";
  content: string;
  isNew?: boolean;
}

function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [typingMessageIndex, setTypingMessageIndex] = useState<number | null>(null);
  const initialPromptSentRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingMessageIndex]);

  const sendMessage = useCallback(async (content: string, currentMessages: Message[] = []) => {
    if (!content.trim()) return;

    const userMessage: Message = { role: "user", content: content.trim() };
    setMessages([...currentMessages, userMessage]);
    setInput("");
    setLoading(true);

    try {
      // Send conversation history (without isNew flag) for context
      const history = currentMessages.map(({ role, content }) => ({ role, content }));

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content.trim(),
          history,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const assistantMessage: Message = {
          role: "assistant",
          content: data.response,
          isNew: true,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        // Set typing animation for the new message
        setTypingMessageIndex(currentMessages.length + 1);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: t.chat.errorResponse,
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: t.chat.connectionError,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-send initial prompt if provided via search params
  useEffect(() => {
    const prompt = searchParams.get("prompt");
    if (prompt && !initialPromptSentRef.current) {
      initialPromptSentRef.current = true;
      // Small delay to ensure component is mounted
      const timer = setTimeout(() => {
        sendMessage(prompt, []);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [searchParams, sendMessage]);

  const handleTypingComplete = (index: number) => {
    if (typingMessageIndex === index) {
      setTypingMessageIndex(null);
      // Mark message as no longer new
      setMessages((prev) =>
        prev.map((m, i) => (i === index ? { ...m, isNew: false } : m))
      );
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    sendMessage(input, messages);
  };

  const suggestedPrompts = t.chat.suggestedPrompts;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="px-6 pt-14 pb-4 flex items-center justify-between border-b border-white/5">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full glass flex items-center justify-center btn-press"
          aria-label="Go back"
        >
          <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <FadeIn>
          <div className="flex items-center gap-3">
            <AIAvatar size="sm" state="idle" />
            <div>
              <h1 className="text-lg text-headline text-foreground">{t.chat.title}</h1>
              <p className="text-xs text-foreground-muted">Classic AI</p>
            </div>
          </div>
        </FadeIn>
        <div className="w-10" />
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {messages.length === 0 ? (
          <div className="space-y-8 py-4">
            {/* Welcome Section */}
            <SlideUp delay={100}>
              <div className="text-center">
                <AIAvatar size="lg" state="active" className="mx-auto mb-4" />
                <h2 className="text-2xl text-display text-foreground mb-2">
                  {t.chat.howCanIHelp}
                </h2>
                <p className="text-foreground-muted">
                  {t.chat.askAbout}
                </p>
              </div>
            </SlideUp>

            {/* Suggested Prompts */}
            <SlideUp delay={200}>
              <div className="space-y-3">
                <p className="text-label text-center mb-4">
                  {t.chat.suggestedQuestions}
                </p>
                {suggestedPrompts.map((prompt, index) => (
                  <GlassCard
                    key={prompt}
                    hover
                    className="cursor-pointer btn-press"
                    onClick={() => sendMessage(prompt, messages)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm">
                          {index === 0 ? "📊" : index === 1 ? "🎯" : index === 2 ? "💪" : "🧠"}
                        </span>
                      </div>
                      <span className="text-foreground text-sm">{prompt}</span>
                      <svg className="w-4 h-4 text-foreground-muted flex-shrink-0 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </GlassCard>
                ))}
              </div>
            </SlideUp>

            {/* Disclaimer */}
            <SlideUp delay={300}>
              <div className="text-center py-4">
                <p className="text-xs text-foreground-muted">
                  {t.chat.disclaimer}
                </p>
              </div>
            </SlideUp>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <FadeIn key={index}>
                <div
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.role === "assistant" && (
                    <AIAvatar size="sm" state="idle" className="mr-2 mt-1 flex-shrink-0 self-start" />
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.role === "user"
                        ? "bg-accent text-white glow-accent"
                        : "glass"
                    }`}
                  >
                    <p className={`whitespace-pre-wrap text-sm leading-relaxed ${
                      message.role === "user" ? "text-white" : "text-foreground"
                    }`}>
                      {message.role === "assistant" && message.isNew && typingMessageIndex === index ? (
                        <TypingAnimation
                          text={message.content}
                          speed={15}
                          onComplete={() => handleTypingComplete(index)}
                        />
                      ) : (
                        message.content
                      )}
                    </p>
                  </div>
                </div>
              </FadeIn>
            ))}
            {loading && (
              <FadeIn>
                <div className="flex justify-start">
                  <AIAvatar size="sm" state="thinking" className="mr-2 mt-1 flex-shrink-0 self-start" />
                  <div className="glass rounded-2xl px-4 py-4">
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              </FadeIn>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-white/5 bg-background/80 backdrop-blur-xl">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t.chat.askQuestion}
            className="flex-1 h-12 px-4 glass rounded-2xl text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
            disabled={loading}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || loading}
            className="w-12 h-12 rounded-2xl btn-press"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-foreground-muted">Učitavanje...</div>
      </div>
    }>
      <ChatContent />
    </Suspense>
  );
}
