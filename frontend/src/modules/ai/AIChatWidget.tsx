import React, { useState, useRef, useEffect } from 'react';
import { Input, Button, Avatar, Spin, App } from 'antd';
import { CloseOutlined, PlusOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { chatWithAI, getMyOrganization, type AIChatResponse } from '../../api/services';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  isLlm?: boolean;
}

const CHIP_SUGGESTIONS = [
  { label: 'FESTIVAL COLLECTIONS', query: 'How much did we collect for Ganesh Chaturthi?' },
  { label: 'TOP DONORS', query: 'Who are our top 5 VIP donors?' },
  { label: 'UNSETTLED CASH', query: 'How much cash is currently pending settlement?' },
  { label: 'EXPENSE RATIO', query: 'What is our expense vs collection ratio?' },
];

interface Props {
  embedded?: boolean;
}

// ── Animated Chat SVG Icon matching exact design with typing dots ──
const AnimatedChatIcon: React.FC = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M12 2C6.477 2 2 6.141 2 11.25C2 13.435 2.83 15.437 4.226 16.994C3.805 18.577 2.923 19.839 2.158 20.672C1.942 20.907 2.122 21.282 2.438 21.256C4.945 21.053 7.026 20.016 8.431 19.167C9.56 19.518 10.757 19.71 12 19.71C17.523 19.71 22 15.569 22 10.459C22 5.349 17.523 2 12 2Z"
      stroke="#FFFFFF"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle className="chat-dot chat-dot-1" cx="8.5" cy="11" r="1.2" fill="#FFFFFF" />
    <circle className="chat-dot chat-dot-2" cx="12" cy="11" r="1.2" fill="#FFFFFF" />
    <circle className="chat-dot chat-dot-3" cx="15.5" cy="11" r="1.2" fill="#FFFFFF" />
  </svg>
);

const AIChatWidget: React.FC<Props> = ({ embedded = false }) => {
  const { message } = App.useApp();
  const [isOpen, setIsOpen] = useState(embedded);
  const [activeProvider, setActiveProvider] = useState<string>('Gemini 2.0 Flash');

  const { data: org } = useQuery({
    queryKey: ['my-organization'],
    queryFn: getMyOrganization,
  });

  useEffect(() => {
    if (org?.ai_provider === 'openai') {
      setActiveProvider('GPT-4o-Mini');
    } else if (org?.ai_provider === 'gemini') {
      setActiveProvider('Gemini 2.0 Flash');
    }
  }, [org]);

  useEffect(() => {
    const handleOpenChat = () => setIsOpen(true);
    window.addEventListener('open-ai-chat', handleOpenChat);
    return () => window.removeEventListener('open-ai-chat', handleOpenChat);
  }, []);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      sender: 'ai',
      text: '👋 Hello! My name is Hisob AI, how can I help you today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isLlm: true,
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const chatMessagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (chatMessagesContainerRef.current) {
      chatMessagesContainerRef.current.scrollTo({
        top: chatMessagesContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, loading, isOpen]);


  const handleSend = async (questionToSend?: string) => {
    const q = (questionToSend || inputText).trim();
    if (!q) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!questionToSend) setInputText('');
    setLoading(true);

    try {
      const res: AIChatResponse = await chatWithAI(q);
      if (res.ai_provider) {
        setActiveProvider(res.ai_provider);
      }
      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: res.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isLlm: res.is_llm_powered,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      message.error('Failed to get answer from AI Assistant');
      const errorMsg: Message = {
        id: `ai-err-${Date.now()}`,
        sender: 'ai',
        text: 'Sorry, I encountered an issue fetching your financial query. Please try again shortly.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isLlm: false,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const renderedParts = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={pIdx} style={{ color: '#0F172A', fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      if (line.startsWith('* ') || line.startsWith('- ')) {
        return (
          <div key={idx} style={{ paddingLeft: 8, marginBottom: 4, display: 'flex', alignItems: 'flex-start' }}>
            <span style={{ color: '#0066FF', marginRight: 6, fontWeight: 900 }}>•</span>
            <span>{renderedParts}</span>
          </div>
        );
      }

      return (
        <div key={idx} style={{ marginBottom: line.trim() ? 6 : 4 }}>
          {renderedParts}
        </div>
      );
    });
  };

  const widgetContent = (
    <div
      style={{
        width: embedded ? '100%' : '370px',
        height: embedded ? '580px' : '560px',
        maxHeight: 'calc(100vh - 120px)',
        backgroundColor: '#FFFFFF',
        borderRadius: '24px',
        boxShadow: embedded ? '0 10px 30px rgba(0,0,0,0.06)' : '0 20px 50px rgba(11,35,71,0.22)',
        border: '1px solid #EAEFF5',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* ── Chat Header ── */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid #F0F4F8',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#FFFFFF',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Avatar with Online Green Dot */}
          <div style={{ position: 'relative' }}>
            <Avatar
              size={42}
              style={{
                background: 'linear-gradient(135deg, #0066FF 0%, #0044CC 100%)',
                color: '#FFF',
                fontWeight: 800,
                fontSize: 20,
                boxShadow: '0 4px 12px rgba(0, 102, 255, 0.25)',
              }}
            >
              🤖
            </Avatar>
            <span
              style={{
                position: 'absolute',
                bottom: 1,
                right: 1,
                width: 11,
                height: 11,
                backgroundColor: '#22C55E',
                border: '2px solid #FFFFFF',
                borderRadius: '50%',
              }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 800, fontSize: 16, color: '#0F172A' }}>Hisob AI</span>
            </div>
            <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>ONLINE</span>
              <span>•</span>
              <span style={{ color: '#0066FF' }}>{activeProvider}</span>
            </div>
          </div>
        </div>

        {/* Top Right Close */}
        {!embedded && (
          <Button
            type="text"
            shape="circle"
            icon={<CloseOutlined style={{ fontSize: 16, color: '#64748B' }} />}
            onClick={() => setIsOpen(false)}
          />
        )}
      </div>

      {/* ── Chat Messages Feed ── */}
      <div
        ref={chatMessagesContainerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          background: '#FFFFFF',
        }}
      >

        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                maxWidth: '85%',
                backgroundColor: msg.sender === 'user' ? '#0066FF' : '#F4F6F8',
                color: msg.sender === 'user' ? '#FFFFFF' : '#1E293B',
                borderRadius: msg.sender === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                padding: '14px 18px',
                fontSize: 14,
                lineHeight: 1.55,
                boxShadow: msg.sender === 'user' ? '0 4px 14px rgba(0, 102, 255, 0.2)' : 'none',
              }}
            >
              {renderFormattedText(msg.text)}
              <div
                style={{
                  fontSize: 10,
                  color: msg.sender === 'user' ? 'rgba(255,255,255,0.7)' : '#94A3B8',
                  textAlign: 'right',
                  marginTop: 4,
                  fontWeight: 500,
                }}
              >
                {msg.timestamp}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div
              style={{
                background: '#F4F6F8',
                borderRadius: '20px 20px 20px 4px',
                padding: '12px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Spin size="small" />
              <span style={{ fontSize: 13, color: '#64748B', fontWeight: 500 }}>Hisob AI is thinking...</span>
            </div>
          </div>
        )}
      </div>


      {/* ── Pill Chips Section (Matching Screenshot) ── */}
      <div style={{ padding: '0 16px 12px', background: '#FFFFFF' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
          {CHIP_SUGGESTIONS.map((chip, idx) => (
            <button
              key={idx}
              disabled={loading}
              onClick={() => handleSend(chip.query)}
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '20px',
                padding: '7px 14px',
                fontSize: 11,
                fontWeight: 700,
                color: '#475569',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#0066FF';
                e.currentTarget.style.color = '#0066FF';
                e.currentTarget.style.background = '#EFF6FF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#E2E8F0';
                e.currentTarget.style.color = '#475569';
                e.currentTarget.style.background = '#F8FAFC';
              }}
            >
              <span>{chip.label}</span>
              <PlusOutlined style={{ fontSize: 10 }} />
            </button>
          ))}
        </div>
      </div>

      {/* ── Bottom Input Container ── */}
      <div style={{ padding: '0 16px 14px', background: '#FFFFFF' }}>
        <div
          style={{
            background: '#F4F6F8',
            borderRadius: '28px',
            padding: '4px 6px 4px 16px',
            display: 'flex',
            alignItems: 'center',
            border: '1px solid #E2E8F0',
          }}
        >
          <Input
            placeholder="Ask Hisob AI..."
            value={inputText}
            disabled={loading}
            onChange={(e) => setInputText(e.target.value)}
            onPressEnter={() => handleSend()}
            variant="borderless"
            style={{
              fontSize: 14,
              color: '#0F172A',
              padding: 0,
              boxShadow: 'none',
            }}
          />
          <Button
            type="primary"
            shape="circle"
            icon={<ArrowRightOutlined style={{ fontSize: 14 }} />}
            loading={loading}
            onClick={() => handleSend()}
            style={{
              backgroundColor: '#0066FF',
              borderColor: '#0066FF',
              flexShrink: 0,
              boxShadow: '0 4px 10px rgba(0, 102, 255, 0.3)',
            }}
          />
        </div>

        {/* Disclaimer Footer */}
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <span style={{ fontSize: 10, color: '#94A3B8' }}>
            Hisob AI can make mistakes. The session is encrypted.
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Custom Animations Styles ── */}
      <style>{`
        @keyframes chatDotPulse {
          0%, 80%, 100% {
            opacity: 0.35;
            transform: scale(0.85);
          }
          40% {
            opacity: 1;
            transform: scale(1.4);
          }
        }

        .chat-dot {
          transform-origin: center;
        }
        .chat-dot-1 { animation: chatDotPulse 1.4s infinite 0s; }
        .chat-dot-2 { animation: chatDotPulse 1.4s infinite 0.22s; }
        .chat-dot-3 { animation: chatDotPulse 1.4s infinite 0.44s; }

        @keyframes chatBtnPulseGlow {
          0% {
            box-shadow: 0 0 0 0 rgba(0, 102, 255, 0.5), 0 10px 28px rgba(0, 102, 255, 0.4);
          }
          70% {
            box-shadow: 0 0 0 18px rgba(0, 102, 255, 0), 0 10px 28px rgba(0, 102, 255, 0.4);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(0, 102, 255, 0), 0 10px 28px rgba(0, 102, 255, 0.4);
          }
        }

        @keyframes chatFloatBob {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
        }

        @keyframes chatPopupEntrance {
          0% {
            opacity: 0;
            transform: translateY(22px) scale(0.92);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .animated-chat-launcher {
          animation: chatBtnPulseGlow 2.5s infinite, chatFloatBob 4s ease-in-out infinite;
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .animated-chat-launcher:hover {
          transform: scale(1.12) !important;
          animation-play-state: paused;
        }

        .chat-popup-window {
          animation: chatPopupEntrance 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @media (max-width: 576px) {
          .chat-popup-window {
            left: 12px !important;
            right: 12px !important;
            bottom: 86px !important;
            width: auto !important;
          }
        }
      `}</style>


      {embedded ? (
        widgetContent
      ) : (
        <>
          {/* Pop-up Window */}
          {isOpen && (
            <div
              className="chat-popup-window ai-chat-popup-container"
              style={{
                position: 'fixed',
                bottom: '92px',
                right: '24px',
                zIndex: 1050,
              }}
            >
              {widgetContent}
            </div>
          )}

          {/* Floating Trigger Button with Pulsing Glow & Sequential Animated Typing Dots */}
          <div
            className="ai-chat-fab-container"
            style={{
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              zIndex: 1050,
            }}
          >
            <Button
              type="primary"
              shape="circle"
              className="animated-chat-launcher"
              onClick={() => setIsOpen(!isOpen)}
              icon={
                isOpen ? (
                  <CloseOutlined style={{ fontSize: 22, color: '#FFFFFF' }} />
                ) : (
                  <AnimatedChatIcon />
                )
              }
              style={{
                width: '62px',
                height: '62px',
                backgroundColor: '#0066FF',
                borderColor: '#0066FF',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                cursor: 'pointer',
              }}
            />
          </div>
        </>
      )}
    </>
  );
};

export default AIChatWidget;
