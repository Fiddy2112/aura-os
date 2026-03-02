import { jsx, jsxs } from 'react/jsx-runtime';
/* empty css                         */
import { getDefaultConfig, RainbowKitProvider, darkTheme, ConnectButton } from '@rainbow-me/rainbowkit';
import { WagmiProvider, useAccount, useBalance } from 'wagmi';
import { mainnet, arbitrum, optimism, polygon, base, sepolia } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useRef, useEffect } from 'react';
import { Sparkles, User, Bot, Send } from 'lucide-react';
import { formatUnits } from 'viem';

const walletConnectProjectId = "your_project_id_here";
const config = getDefaultConfig({
  appName: "Aura OS",
  projectId: walletConnectProjectId,
  // Community fallback or empty
  chains: [mainnet, arbitrum, optimism, polygon, base, sepolia],
  ssr: true
});
const queryClient = new QueryClient();
function Web3Provider({ children }) {
  return /* @__PURE__ */ jsx(WagmiProvider, { config, children: /* @__PURE__ */ jsx(QueryClientProvider, { client: queryClient, children: /* @__PURE__ */ jsx(
    RainbowKitProvider,
    {
      theme: darkTheme({
        accentColor: "#A855F7",
        accentColorForeground: "white",
        borderRadius: "medium",
        fontStack: "system",
        overlayBlur: "small"
      }),
      modalSize: "compact",
      children
    }
  ) }) });
}

function AuraChat() {
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const [messages, setMessages] = useState([
    {
      role: "bot",
      content: "Welcome to Aura OS. I'm your AI Commander for Web3. What would you like to do today?"
    }
  ]);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input,
          walletContext: {
            isConnected,
            address,
            balance: balance ? `${formatUnits(balance.value, balance.decimals)} ${balance.symbol}` : "0"
          }
        })
      });
      const data = await response.json();
      setMessages((prev) => [...prev, { role: "bot", content: data.reply }]);
    } catch (error) {
      setMessages((prev) => [...prev, {
        role: "bot",
        content: "Sorry, I encountered an error. Please try again."
      }]);
    }
    setIsTyping(false);
  };
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  return /* @__PURE__ */ jsxs("div", { className: "glass-card flex flex-col h-[600px] w-full max-w-2xl overflow-hidden", children: [
    /* @__PURE__ */ jsxs("div", { className: "px-6 py-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "relative", children: [
          /* @__PURE__ */ jsx("div", { className: "w-10 h-10 rounded-xl bg-white flex items-center justify-center", children: /* @__PURE__ */ jsx(Sparkles, { className: "w-5 h-5 text-black" }) }),
          /* @__PURE__ */ jsx("span", { className: "absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-white rounded-full border-2 border-zinc-900" })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h3", { className: "font-semibold text-white", children: "Aura OS" }),
          /* @__PURE__ */ jsx("p", { className: "text-xs text-zinc-500", children: "AI Commander • Online" })
        ] })
      ] }),
      /* @__PURE__ */ jsx(
        ConnectButton,
        {
          label: "Connect",
          showBalance: false,
          chainStatus: "icon",
          accountStatus: "avatar"
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex-1 overflow-y-auto p-6 space-y-6", children: [
      messages.map((msg, i) => /* @__PURE__ */ jsxs(
        "div",
        {
          className: `flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"} animate-fade-in-up`,
          children: [
            /* @__PURE__ */ jsx("div", { className: `flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${msg.role === "user" ? "bg-white" : "bg-zinc-800 border border-zinc-700"}`, children: msg.role === "user" ? /* @__PURE__ */ jsx(User, { className: "w-4 h-4 text-black" }) : /* @__PURE__ */ jsx(Bot, { className: "w-4 h-4 text-white" }) }),
            /* @__PURE__ */ jsx("div", { className: `chat-bubble ${msg.role === "user" ? "chat-bubble-user" : "chat-bubble-bot"}`, children: /* @__PURE__ */ jsx("p", { className: "text-sm leading-relaxed whitespace-pre-wrap", children: msg.content }) })
          ]
        },
        i
      )),
      isTyping && /* @__PURE__ */ jsxs("div", { className: "flex gap-3 animate-fade-in-up", children: [
        /* @__PURE__ */ jsx("div", { className: "flex-shrink-0 w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center", children: /* @__PURE__ */ jsx(Bot, { className: "w-4 h-4 text-white" }) }),
        /* @__PURE__ */ jsx("div", { className: "chat-bubble chat-bubble-bot", children: /* @__PURE__ */ jsxs("div", { className: "flex gap-1.5", children: [
          /* @__PURE__ */ jsx("span", { className: "w-2 h-2 bg-zinc-600 rounded-full animate-bounce", style: { animationDelay: "0ms" } }),
          /* @__PURE__ */ jsx("span", { className: "w-2 h-2 bg-zinc-600 rounded-full animate-bounce", style: { animationDelay: "150ms" } }),
          /* @__PURE__ */ jsx("span", { className: "w-2 h-2 bg-zinc-600 rounded-full animate-bounce", style: { animationDelay: "300ms" } })
        ] }) })
      ] }),
      /* @__PURE__ */ jsx("div", { ref: messagesEndRef })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "p-4 border-t border-zinc-800 bg-zinc-900/50", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex gap-3", children: [
        /* @__PURE__ */ jsx(
          "input",
          {
            value: input,
            onChange: (e) => setInput(e.target.value),
            onKeyDown: handleKeyDown,
            className: "flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-700 transition-all",
            placeholder: "Ask Aura anything about Web3..."
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: handleSend,
            disabled: !input.trim() || isTyping,
            className: "px-4 py-3 rounded-xl bg-white text-black font-medium transition-all hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed",
            children: /* @__PURE__ */ jsx(Send, { className: "w-5 h-5" })
          }
        )
      ] }),
      /* @__PURE__ */ jsx("p", { className: "text-xs text-zinc-600 mt-2 text-center", children: "Press Enter to send • Aura keeps your data private" })
    ] })
  ] });
}

function ChatWrapper() {
  return /* @__PURE__ */ jsx(Web3Provider, { children: /* @__PURE__ */ jsx(AuraChat, {}) });
}

export { ChatWrapper as C };
