"use client";

import { useState, useEffect, useRef } from "react";

interface ChatMessage {
  user: string;
  text: string;
  timestamp: number;
}

interface ChatProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  username: string;
}

export default function Chat({ messages, onSend, username }: ChatProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput("");
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-2 p-3 min-h-0">
        {messages.length === 0 && (
          <div className="text-center text-muted text-sm py-4">
            No messages yet. Say hi!
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`text-sm ${msg.user === username ? "text-primary" : "text-foreground"}`}>
            <span className="font-medium">{msg.user}</span>
            <span className="text-muted text-xs ml-2">{formatTime(msg.timestamp)}</span>
            <p className="text-foreground/80 break-words">{msg.text}</p>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="flex gap-2 p-3 border-t border-card-border">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-background border border-card-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted/50"
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        <button
          onClick={handleSend}
          className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0"
        >
          Send
        </button>
      </div>
    </div>
  );
}
