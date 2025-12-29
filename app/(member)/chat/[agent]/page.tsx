"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { notFound } from "next/navigation";
import {
  Button,
  GlassCard,
  FadeIn,
  SlideUp,
  AgentAvatar,
  agentMeta,
  TypingAnimation,
} from "@/components/ui";
import { AgentType } from "@/components/ui/agent-avatar";

interface Message {
  role: "user" | "assistant";
  content: string;
  isNew?: boolean;
}

// Suggested prompts for each agent
const agentPrompts: Record<AgentType, string[]> = {
  nutrition: [
    "Koliko kalorija treba da unosim dnevno?",
    "Šta da jedem posle treninga?",
    "Kako da povećam unos proteina?",
    "Da li su mi makrosi u balansu?",
  ],
  supplements: [
    "Da li mi treba protein shake?",
    "Kada i kako da uzimam kreatin?",
    "Koji suplementi su bitni za moj cilj?",
    "Da li su pre-workout suplementi bezbedni?",
  ],
  training: [
    "Koliko često treba da treniram?",
    "Kako pravilno da radim čučanj?",
    "Da li treba da treniram danas ili da se odmorim?",
    "Kako da poboljšam bench press?",
  ],
};

// Emojis for each prompt index
const promptEmojis = ["📊", "🎯", "💪", "🧠"];

function isValidAgent(agent: string): agent is AgentType {
  return ["nutrition", "supplements", "training"].includes(agent);
}

export default function AgentChatPage() {
  const router = useRouter();
  const params = useParams();
  const agent = params.agent as string;

  // Validate agent type
  if (!isValidAgent(agent)) {
    notFound();
  }

  const meta = agentMeta[agent];
  const suggestedPrompts = agentPrompts[agent];

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [typingMessageIndex, setTypingMessageIndex] = useState<number | null>(
    null
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingMessageIndex]);

  const sendMessage = useCallback(
    async (content: string, currentMessages: Message[] = []) => {
      if (!content.trim()) return;

      const userMessage: Message = { role: "user", content: content.trim() };
      setMessages([...currentMessages, userMessage]);
      setInput("");
      setLoading(true);

      try {
        const history = currentMessages.map(({ role, content }) => ({
          role,
          content,
        }));

        const response = await fetch(`/api/ai/agents/${agent}/chat`, {
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
          setTypingMessageIndex(currentMessages.length + 1);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content:
                data.error || "Izvini, nisam uspeo da odgovorim. Pokušaj ponovo.",
            },
          ]);
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Nema konekcije. Proveri internet vezu.",
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [agent]
  );

  const handleTypingComplete = (index: number) => {
    if (typingMessageIndex === index) {
      setTypingMessageIndex(null);
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

  // Get agent-specific colors for loading dots
  const getAgentDotColor = () => {
    switch (agent) {
      case "nutrition":
        return "bg-emerald-500";
      case "supplements":
        return "bg-violet-500";
      case "training":
        return "bg-orange-500";
    }
  };

  // Get agent-specific user message color
  const getUserMessageClass = () => {
    switch (agent) {
      case "nutrition":
        return "bg-emerald-600 glow-sm";
      case "supplements":
        return "bg-violet-600 glow-sm";
      case "training":
        return "bg-orange-600 glow-sm";
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="px-6 pt-14 pb-4 flex items-center justify-between border-b border-white/5">
        <button
          onClick={() => router.push("/home")}
          className="w-10 h-10 rounded-full glass flex items-center justify-center btn-press"
          aria-label="Go back"
        >
          <svg
            className="w-5 h-5 text-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <FadeIn>
          <div className="flex items-center gap-3">
            <AgentAvatar agent={agent} size="sm" state="idle" />
            <div>
              <h1 className="text-lg text-headline text-foreground">
                {meta.name}
              </h1>
              <p className="text-xs text-foreground-muted">{meta.subtitle}</p>
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
                <AgentAvatar
                  agent={agent}
                  size="lg"
                  state="active"
                  className="mx-auto mb-4"
                />
                <h2 className="text-2xl text-display text-foreground mb-2">
                  Kako mogu da ti pomognem?
                </h2>
                <p className="text-foreground-muted">{meta.description}</p>
              </div>
            </SlideUp>

            {/* Suggested Prompts */}
            <SlideUp delay={200}>
              <div className="space-y-3">
                <p className="text-label text-center mb-4">Predložena pitanja</p>
                {suggestedPrompts.map((prompt, index) => (
                  <GlassCard
                    key={prompt}
                    hover
                    className={`cursor-pointer btn-press ${meta.borderClass} border`}
                    onClick={() => sendMessage(prompt, messages)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full ${meta.bgClass} flex items-center justify-center flex-shrink-0`}
                      >
                        <span className="text-sm">{promptEmojis[index]}</span>
                      </div>
                      <span className="text-foreground text-sm">{prompt}</span>
                      <svg
                        className={`w-4 h-4 ${meta.textClass} flex-shrink-0 ml-auto`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
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
                  AI daje opšte savete, ne medicinske. Za zdravstvene odluke
                  konsultuj stručnjake.
                </p>
              </div>
            </SlideUp>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <FadeIn key={index}>
                <div
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <AgentAvatar
                      agent={agent}
                      size="sm"
                      state="idle"
                      className="mr-2 mt-1 flex-shrink-0 self-start"
                    />
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.role === "user"
                        ? `${getUserMessageClass()} text-white`
                        : "glass"
                    }`}
                  >
                    <p
                      className={`whitespace-pre-wrap text-sm leading-relaxed ${
                        message.role === "user" ? "text-white" : "text-foreground"
                      }`}
                    >
                      {message.role === "assistant" &&
                      message.isNew &&
                      typingMessageIndex === index ? (
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
                  <AgentAvatar
                    agent={agent}
                    size="sm"
                    state="thinking"
                    className="mr-2 mt-1 flex-shrink-0 self-start"
                  />
                  <div className="glass rounded-2xl px-4 py-4">
                    <div className="flex gap-1.5">
                      <span
                        className={`w-2 h-2 ${getAgentDotColor()} rounded-full animate-bounce`}
                        style={{ animationDelay: "0ms" }}
                      />
                      <span
                        className={`w-2 h-2 ${getAgentDotColor()} rounded-full animate-bounce`}
                        style={{ animationDelay: "150ms" }}
                      />
                      <span
                        className={`w-2 h-2 ${getAgentDotColor()} rounded-full animate-bounce`}
                        style={{ animationDelay: "300ms" }}
                      />
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
            placeholder="Postavi pitanje..."
            className={`flex-1 h-12 px-4 glass rounded-2xl text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:ring-2 focus:ring-${meta.color}-500 focus:border-transparent transition-all`}
            disabled={loading}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || loading}
            className={`w-12 h-12 rounded-2xl btn-press ${
              agent === "nutrition"
                ? "bg-emerald-600 hover:bg-emerald-700"
                : agent === "supplements"
                  ? "bg-violet-600 hover:bg-violet-700"
                  : "bg-orange-600 hover:bg-orange-700"
            }`}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </Button>
        </form>
      </div>
    </div>
  );
}
