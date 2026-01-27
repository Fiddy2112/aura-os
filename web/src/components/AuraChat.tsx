import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useBalance } from 'wagmi';
import { formatUnits } from 'viem';

interface Message {
  role: 'user' | 'bot';
  content: string;
}

export default function AuraChat() {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'bot', 
      content: 'Welcome to Aura OS. I\'m your AI Commander for Web3. What would you like to do today?'
    }
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: input,
          walletContext: {
            isConnected,
            address,
            balance: balance ? `${formatUnits(balance.value, balance.decimals)} ${balance.symbol}` : '0'
          }
        }),
      });
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'bot', content: data.reply }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'bot', 
        content: 'Sorry, I encountered an error. Please try again.'
      }]);
    }
    setIsTyping(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="glass-card flex flex-col h-[600px] w-full max-w-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-black" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-white rounded-full border-2 border-zinc-900"></span>
          </div>
          <div>
            <h3 className="font-semibold text-white">Aura OS</h3>
            <p className="text-xs text-zinc-500">AI Commander • Online</p>
          </div>
        </div>
        <ConnectButton 
          label="Connect"
          showBalance={false}
          chainStatus="icon"
          accountStatus="avatar"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg, i) => (
          <div 
            key={i} 
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} animate-fade-in-up`}
          >
            <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
              msg.role === 'user' 
                ? 'bg-white' 
                : 'bg-zinc-800 border border-zinc-700'
            }`}>
              {msg.role === 'user' ? (
                <User className="w-4 h-4 text-black" />
              ) : (
                <Bot className="w-4 h-4 text-white" />
              )}
            </div>

            <div className={`chat-bubble ${
              msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-bot'
            }`}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-3 animate-fade-in-up">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="chat-bubble chat-bubble-bot">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
        <div className="flex gap-3">
          <input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-700 transition-all"
            placeholder="Ask Aura anything about Web3..."
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="px-4 py-3 rounded-xl bg-white text-black font-medium transition-all hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-zinc-600 mt-2 text-center">
          Press Enter to send • Aura keeps your data private
        </p>
      </div>
    </div>
  );
}