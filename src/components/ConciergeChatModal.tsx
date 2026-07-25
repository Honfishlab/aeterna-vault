import React, { useState, useEffect } from 'react';
import { ChatMessage, UserProfile, ViewMode } from '../types';
import { Bot, Send, X, Sparkles, Loader2, User, ArrowRight, Plus, Shield, FileText, Trash2, RotateCcw } from 'lucide-react';

interface ActionButton {
  label: string;
  action: string;
}

interface ConciergeChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onSelectView?: (view: ViewMode) => void;
  onOpenUpload?: () => void;
  onOpenWallet?: () => void;
  onClearDemoContent?: () => void;
  onRestoreDemoContent?: () => void;
}

function parseResponseTextAndButtons(rawText: string): { text: string; buttons: ActionButton[] } {
  const buttonRegex = /\[BUTTON:\s*([^|]+)\|\s*([^\]]+)\]/g;
  const buttons: ActionButton[] = [];
  
  let match;
  while ((match = buttonRegex.exec(rawText)) !== null) {
    buttons.push({
      label: match[1].trim(),
      action: match[2].trim()
    });
  }

  const cleanText = rawText.replace(buttonRegex, '').trim();
  return { text: cleanText, buttons };
}

export const ConciergeChatModal: React.FC<ConciergeChatModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSelectView,
  onOpenUpload,
  onOpenWallet,
  onClearDemoContent,
  onRestoreDemoContent
}) => {
  const userName = currentUser ? currentUser.name.split(' ')[0] : 'Arthur';

  const defaultGreetingRaw = `Greetings ${userName}. I am your Sovereign AI Concierge, powered by Gemini.

Choose a smart click path below to execute instant vault actions or navigate modules:
[BUTTON: ➕ Upload New Memory | modal:upload]
[BUTTON: 📜 Draft Legacy Letter | navigate:legacy]
[BUTTON: 🛡️ Setup Inheritance Protocol | navigate:inheritance]
[BUTTON: 🕯️ View Memorial Shrines | navigate:memorials]
[BUTTON: 🧹 Clear Demo Content | action:clear_demo]`;

  const initialParsed = parseResponseTextAndButtons(defaultGreetingRaw);

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'msg-1',
      sender: 'ai',
      text: initialParsed.text,
      timestamp: '10:42 AM',
      actionButtons: initialParsed.buttons
    }
  ]);

  useEffect(() => {
    if (currentUser) {
      setMessages(prev => {
        if (prev.length === 1 && prev[0].id === 'msg-1') {
          const updatedGreeting = `Greetings ${currentUser.name.split(' ')[0]}. I am your Sovereign AI Concierge, powered by Gemini.

Choose a smart click path below to execute instant vault actions or navigate modules:
[BUTTON: ➕ Upload New Memory | modal:upload]
[BUTTON: 📜 Draft Legacy Letter | navigate:legacy]
[BUTTON: 🛡️ Setup Inheritance Protocol | navigate:inheritance]
[BUTTON: 🕯️ View Memorial Shrines | navigate:memorials]
[BUTTON: 🧹 Clear Demo Content | action:clear_demo]`;

          const parsed = parseResponseTextAndButtons(updatedGreeting);
          return [
            {
              ...prev[0],
              text: parsed.text,
              actionButtons: parsed.buttons
            }
          ];
        }
        return prev;
      });
    }
  }, [currentUser]);

  const [inputPrompt, setInputPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const executePromptQuery = async (queryText: string) => {
    if (!queryText.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch('/api/ai/concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: queryText })
      });
      const data = await res.json();
      const rawReply = data.reply || "I am processing your archival request.";
      const { text: cleanReply, buttons } = parseResponseTextAndButtons(rawReply);

      const aiMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'ai',
        text: cleanReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionButtons: buttons.length > 0 ? buttons : [
          { label: '➕ Upload Memory', action: 'modal:upload' },
          { label: '📜 Time Capsules', action: 'navigate:legacy' },
          { label: '🛡️ Inheritance', action: 'navigate:inheritance' }
        ]
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (e) {
      const fallbackRaw = `I am actively monitoring your vault. Your files are encrypted on Arweave permaweb.

Select an action path to proceed:
[BUTTON: ➕ Upload First Memory | modal:upload]
[BUTTON: 📜 Legacy Time Capsules | navigate:legacy]
[BUTTON: 🛡️ Inheritance Rules | navigate:inheritance]`;
      const { text: cleanReply, buttons } = parseResponseTextAndButtons(fallbackRaw);

      const fallbackMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'ai',
        text: cleanReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionButtons: buttons
      };
      setMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const query = inputPrompt;
    setInputPrompt('');
    executePromptQuery(query);
  };

  const handleActionButtonClick = (action: string, label: string) => {
    if (action.startsWith('prompt:')) {
      const promptText = action.replace('prompt:', '').trim();
      executePromptQuery(promptText);
      return;
    }

    if (action === 'modal:upload' || action === 'upload') {
      if (onOpenUpload) onOpenUpload();
      onClose();
      return;
    }

    if (action.startsWith('navigate:')) {
      const targetView = action.replace('navigate:', '').trim() as ViewMode;
      if (onSelectView) onSelectView(targetView);
      onClose();
      return;
    }

    if (action === 'action:clear_demo' || action === 'clear_demo') {
      if (onClearDemoContent) onClearDemoContent();
      setMessages(prev => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          sender: 'ai',
          text: '✅ All sample demo memories have been cleared. Your sovereign vault is now clean and ready for your real family archives.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actionButtons: [
            { label: '➕ Upload First Memory', action: 'modal:upload' },
            { label: '🔄 Restore Demo Data', action: 'action:restore_demo' }
          ]
        }
      ]);
      return;
    }

    if (action === 'action:restore_demo' || action === 'restore_demo') {
      if (onRestoreDemoContent) onRestoreDemoContent();
      setMessages(prev => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          sender: 'ai',
          text: '🔄 Sample demo memories and content have been restored to your vault.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actionButtons: [
            { label: '➕ Upload New Memory', action: 'modal:upload' },
            { label: '🧹 Clear Demo Content', action: 'action:clear_demo' }
          ]
        }
      ]);
      return;
    }

    // Default fallback
    executePromptQuery(`Tell me about ${label}`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0f081d]/80 backdrop-blur-md flex items-center justify-end p-0 sm:p-4 text-[#E8DDF5]">
      <div className="cosmic-card-gold w-full sm:max-w-lg h-full sm:h-[90vh] sm:rounded-3xl flex flex-col justify-between shadow-2xl overflow-hidden border border-[#DFB260]">
        
        {/* Header */}
        <div className="p-4 bg-[#1e1035] text-white flex items-center justify-between border-b border-[#DFB260]/30">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-gradient-to-br from-[#DFB260] to-[#b88e4c] text-[#120B21] rounded-2xl flex items-center justify-center font-bold shadow-md">
              <Bot className="w-5 h-5 text-[#120B21]" />
            </div>
            <div>
              <h3 className="font-cinzel font-bold text-[#FFF2A8] text-base">Aeterna AI Concierge</h3>
              <p className="text-[11px] text-[#F5D77F] font-mono font-semibold tracking-wide">Gemini Flash • Interactive Action Assistant</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-[#C8B1E4] hover:text-[#FFF2A8] p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Log */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs font-sans bg-[#0f081d]/40">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start space-x-2.5 ${msg.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold ${
                msg.sender === 'user' ? 'bg-[#DFB260] text-[#120B21]' : 'bg-[#1e1035] text-[#F5D77F] border border-[#DFB260]/40'
              }`}>
                {msg.sender === 'user' ? <User className="w-4 h-4 text-[#120B21]" /> : <Bot className="w-4 h-4 text-[#F5D77F]" />}
              </div>

              <div className={`max-w-[85%] p-3.5 space-y-2.5 ${
                msg.sender === 'user'
                  ? 'bg-[#DFB260] text-[#120B21] font-semibold rounded-2xl rounded-tr-none shadow-md'
                  : 'bg-[#120B21]/95 text-[#FFF2A8] border border-[#DFB260]/40 rounded-2xl rounded-tl-none shadow-xl'
              }`}>
                <p className="leading-relaxed whitespace-pre-line font-medium text-xs">{msg.text}</p>
                
                {/* Interactive Action Path Buttons inside response */}
                {msg.sender === 'ai' && msg.actionButtons && msg.actionButtons.length > 0 && (
                  <div className="pt-2 border-t border-[#DFB260]/20 space-y-2">
                    <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-[#F5D77F] block">
                      ⚡ Click Action Path
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {msg.actionButtons.map((btn, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleActionButtonClick(btn.action, btn.label)}
                          className="px-3.5 py-2 bg-gradient-to-r from-[#DFB260]/20 via-[#F5D77F]/30 to-[#DFB260]/20 hover:from-[#DFB260] hover:to-[#F5D77F] text-[#FFF2A8] hover:text-[#120B21] border border-[#DFB260]/60 rounded-xl font-semibold text-[11px] transition-all cursor-pointer shadow-md flex items-center space-x-1.5 hover:scale-[1.02] active:scale-95 text-left"
                        >
                          <span>{btn.label}</span>
                          <ArrowRight className="w-3 h-3 opacity-70 flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <span className={`text-[9px] block text-right font-mono font-semibold ${msg.sender === 'user' ? 'text-[#120B21]/70' : 'text-[#C8B1E4]/70'}`}>{msg.timestamp}</span>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center space-x-2 text-[#C8B1E4]/80 italic font-sans text-xs pt-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#F5D77F]" />
              <span>AI Concierge is generating smart action pathways...</span>
            </div>
          )}
        </div>

        {/* Preset Prompt Suggestions */}
        <div className="p-2.5 bg-[#120B21]/90 border-t border-[#DFB260]/30 flex items-center space-x-2 overflow-x-auto no-scrollbar text-[11px] font-sans font-semibold">
          <button
            onClick={() => executePromptQuery("How do I write a legacy letter to my great-grandchildren?")}
            className="whitespace-nowrap px-3 py-1.5 bg-[#1e1035] hover:bg-[#DFB260]/20 text-[#FFF2A8] rounded-xl border border-[#DFB260]/30 transition-colors cursor-pointer flex items-center space-x-1"
          >
            <span>📜 Legacy Letter Path</span>
          </button>
          <button
            onClick={() => executePromptQuery("Organize my family photos and albums")}
            className="whitespace-nowrap px-3 py-1.5 bg-[#1e1035] hover:bg-[#DFB260]/20 text-[#FFF2A8] rounded-xl border border-[#DFB260]/30 transition-colors cursor-pointer flex items-center space-x-1"
          >
            <span>🖼️ Upload & Album Path</span>
          </button>
          <button
            onClick={() => executePromptQuery("How do I set up my inheritance dead man switch?")}
            className="whitespace-nowrap px-3 py-1.5 bg-[#1e1035] hover:bg-[#DFB260]/20 text-[#FFF2A8] rounded-xl border border-[#DFB260]/30 transition-colors cursor-pointer flex items-center space-x-1"
          >
            <span>🛡️ Inheritance Switch Path</span>
          </button>
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSendMessage} className="p-3 bg-[#120B21] border-t border-[#DFB260]/30 flex items-center space-x-2">
          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            placeholder="Ask AI Concierge anything..."
            className="flex-1 bg-[#1e1035] border border-[#DFB260]/30 rounded-2xl px-4 py-2.5 text-xs text-[#FFF2A8] placeholder-[#C8B1E4]/40 focus:outline-none focus:border-[#F5D77F] font-medium transition-all"
          />
          <button
            type="submit"
            disabled={loading}
            className="gold-filled-btn p-2.5 text-xs font-bold cursor-pointer disabled:opacity-50"
          >
            <Send className="w-4 h-4 text-[#120B21]" />
          </button>
        </form>

      </div>
    </div>
  );
};
