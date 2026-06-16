"use client";

import { useState } from "react";
import { api } from "@/lib/api";

type Message = string;

export default function ChatSidebar({ onSearch }: { onSearch?: (q: string) => void }) {
  const [input, setInput] = useState("");
  const [chat, setChat] = useState<Message[]>([]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const query = input;
    const updated = [...chat, `User: ${query}`];
    setChat(updated);

    onSearch?.(query);

    try {
      const res = await api.post<{ history: string[] }>("/chat", {
        query: query,
        history: updated,
      });

      setChat(res.data.history);
      setInput("");
    } catch (err) {
      console.error(err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") sendMessage();
  };

  return (
    <div className="w-full lg:w-80 h-auto lg:h-screen border-b lg:border-b-0 lg:border-r border-[#333] p-4 lg:p-5 bg-black flex flex-col">
      <h2 className="text-xl font-bold mb-4 text-white">&#x1f4ac; Shop Assistant</h2>

      <div className="flex-1 space-y-2 overflow-y-auto max-h-[40vh] lg:max-h-none lg:h-[75vh] pr-1 scrollbar-thin">
        {chat.length === 0 && (
          <p className="text-sm text-[#666] italic">Ask me about any product...</p>
        )}
        {chat.map((msg, i) => {
          const isUser = msg.startsWith("User:");
          return (
            <div
              key={i}
              className={`text-sm p-2 rounded-lg ${
                isUser
                  ? "bg-[rgba(255,255,255,0.06)] text-[#ccc] border-l-2 border-[#666]"
                  : "bg-[rgba(255,255,255,0.03)] text-[#aaa] border-l-2 border-[#444]"
              }`}
            >
              <span className={isUser ? "text-white font-semibold" : "text-gray-300 font-semibold"}>
                {isUser ? "You" : "Assistant"}:
              </span>{" "}
              {msg.replace(/^(User|Assistant):\s*/, "")}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex gap-2 border-t border-[#333] pt-4">
        <input
          className="flex-1 p-2.5 bg-[#111] border border-[#444] rounded-lg text-sm text-white placeholder-gray-500 outline-none focus:border-white transition-colors"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask something..."
        />
        <button
          onClick={sendMessage}
          className="px-4 py-2.5 bg-white text-black text-sm font-bold rounded-lg hover:bg-gray-300 transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}
