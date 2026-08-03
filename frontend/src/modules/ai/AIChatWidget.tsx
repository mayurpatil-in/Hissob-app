import React, { useState, useRef, useEffect } from 'react';
import { Input, Button, Spin, App, Tooltip } from 'antd';

import {
  CloseOutlined, PlusOutlined, ArrowRightOutlined,
  AudioOutlined, CopyOutlined, CheckOutlined, ReloadOutlined,
  DeleteOutlined, ThunderboltOutlined
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { chatWithAI, getMyOrganization, type AIChatResponse, type AIChatMessageItem } from '../../api/services';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  isLlm?: boolean;
  followups?: string[];
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

export const HisobBotLogoSVG: React.FC<{
  size?: number;
  style?: React.CSSProperties;
  className?: string;
  showOuterBadge?: boolean;
}> = ({ size = 40, style, className, showOuterBadge = true }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 200 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: 'inline-block', verticalAlign: 'middle', filter: 'drop-shadow(0 4px 10px rgba(0, 102, 255, 0.25))', ...style }}
    className={className}
  >
    <defs>
      <linearGradient id="hisobBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0066FF" />
        <stop offset="100%" stopColor="#0044CC" />
      </linearGradient>
      <linearGradient id="hisobBubbleStroke" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3B82F6" />
        <stop offset="100%" stopColor="#0066FF" />
      </linearGradient>
      <linearGradient id="hisobGreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4ADE80" />
        <stop offset="100%" stopColor="#16A34A" />
      </linearGradient>
    </defs>

    {/* ── Proper Circle Outer Badge (Only rendered when showOuterBadge is true) ── */}
    {showOuterBadge && (
      <circle
        cx="100"
        cy="100"
        r="88"
        stroke="url(#hisobBubbleStroke)"
        strokeWidth="9"
        fill="#FFFFFF"
      />
    )}



    {/* ── Taller Top Antenna Stick & Green Blinking Ball ── */}
    <rect x="96" y="14" width="8" height="26" rx="4" fill="#1E293B" />
    <circle cx="100" cy="12" r="10" className="bot-antenna-ball" fill="url(#hisobGreenGrad)" stroke="#1E293B" strokeWidth="2.5" />


    {/* ── Left & Right Headphone Earcups ── */}
    <rect x="36" y="80" width="16" height="34" rx="8" fill="#1E293B" />
    <rect x="39" y="84" width="10" height="26" rx="5" fill="url(#hisobBlueGrad)" />

    <rect x="148" y="80" width="16" height="34" rx="8" fill="#1E293B" />
    <rect x="151" y="84" width="10" height="26" rx="5" fill="url(#hisobBlueGrad)" />

    {/* ── Blue Robot Helmet Shell ── */}
    <path
      d="M50 92C50 60 72 36 100 36C128 36 150 60 150 92C150 114 136 132 100 132C64 132 50 114 50 92Z"
      fill="url(#hisobBlueGrad)"
      stroke="#1E293B"
      strokeWidth="4"
    />

    {/* ── Forehead Rupee Symbol (₹) & Circuit Lines ── */}
    <text x="100" y="65" textAnchor="middle" fill="#FFFFFF" fontSize="22" fontWeight="900" fontFamily="-apple-system, Roboto, sans-serif" className="bot-rupee-symbol">
      ₹
    </text>

    {/* Left Circuit Trace */}
    <path d="M68 60H77L82 64" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
    <circle cx="68" cy="60" r="2.5" fill="#FFFFFF" />

    {/* Right Circuit Trace */}
    <path d="M132 60H123L118 64" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
    <circle cx="132" cy="60" r="2.5" fill="#FFFFFF" />

    {/* ── Inner White Face Plate ── */}
    <path
      d="M58 92C58 72 76 68 100 68C124 68 142 72 142 92C142 114 126 124 100 124C74 124 58 114 58 92Z"
      fill="#FFFFFF"
      stroke="#1E293B"
      strokeWidth="3.5"
    />

    {/* ── Glossy Black Eyes (Animated Eye Blink) ── */}
    <g className="bot-eye">
      <circle cx="78" cy="94" r="10" fill="#0F172A" />
      <circle cx="81" cy="91" r="3.5" fill="#FFFFFF" />

      <circle cx="122" cy="94" r="10" fill="#0F172A" />
      <circle cx="125" cy="91" r="3.5" fill="#FFFFFF" />
    </g>

    {/* ── Smiling Mouth Arc ── */}
    <path d="M91 106C91 112 109 112 109 106" stroke="#0F172A" strokeWidth="3.5" strokeLinecap="round" fill="none" />

    {/* ── Robot Body & Chest Display Panel ── */}
    <path d="M62 136C62 136 78 128 100 128C122 128 138 136 138 136L142 165H58L62 136Z" fill="#FFFFFF" stroke="#1E293B" strokeWidth="3.5" />
    <path d="M62 136L55 152H145L138 136" fill="url(#hisobBlueGrad)" />

    {/* Chest Display Panel with 3 Animated Dots */}
    <rect x="80" y="144" width="40" height="14" rx="7" fill="#1E293B" />
    <circle cx="88" cy="151" r="3" fill="#FFFFFF" className="bot-chest-dot-1" />
    <circle cx="100" cy="151" r="3" fill="#0066FF" className="bot-chest-dot-2" />
    <circle cx="112" cy="151" r="3" fill="#FFFFFF" className="bot-chest-dot-3" />

  </svg>
);



const AIChatWidget: React.FC<Props> = ({ embedded = false }) => {
  const { message } = App.useApp();
  const [isOpen, setIsOpen] = useState(embedded);
  const [activeProvider, setActiveProvider] = useState<string>('Google Gemini');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const { data: org } = useQuery({
    queryKey: ['my-organization'],
    queryFn: getMyOrganization,
  });

  useEffect(() => {
    if (org?.ai_provider === 'openai') {
      setActiveProvider('ChatGPT');
    } else if (org?.ai_provider === 'gemini') {
      setActiveProvider('Google Gemini');
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
      text: '👋 Hello! My name is **Hisob AI**, your context-aware financial assistant. How can I help you today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isLlm: true,
      followups: [
        'How much did we collect for Ganesh Chaturthi?',
        'Who are our top VIP donors?',
        'What is our pending unsettled cash balance?'
      ]
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

  // ── Web Speech API Voice Dictation ──
  const toggleVoiceRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      message.warning('Voice dictation is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
    } else {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-IN';

        recognition.onstart = () => setIsListening(true);
        recognition.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((res: any) => res[0].transcript)
            .join('');
          setInputText(transcript);
        };
        recognition.onerror = (err: any) => {
          console.error('Speech recognition error:', err);
          setIsListening(false);
          if (err.error === 'network') {
            message.warning('Voice recognition requires an active internet connection (Google Speech service unreachable).');
          } else if (err.error === 'not-allowed' || err.error === 'service-not-allowed') {
            message.warning('Microphone access denied. Please enable microphone permissions in browser settings.');
          } else if (err.error === 'no-speech') {
            message.info('No speech detected. Please speak clearly into your mic.');
          } else {
            message.error(`Voice recognition error (${err.error || 'unknown'})`);
          }
        };
        recognition.onend = () => setIsListening(false);

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err) {
        console.error(err);
        setIsListening(false);
      }
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'ai',
        text: '🧹 Conversation history cleared. Ask me any financial or audit question!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isLlm: true,
      },
    ]);
    message.info('Chat session history cleared');
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    message.success('Copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSend = async (questionToSend?: string) => {
    const q = (questionToSend || inputText).trim();
    if (!q) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Prepare multi-turn conversation history (last 8 turns)
    const historyPayload: AIChatMessageItem[] = messages
      .filter((m) => !m.id.startsWith('welcome-'))
      .slice(-8)
      .map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

    setMessages((prev) => [...prev, userMsg]);
    if (!questionToSend) setInputText('');
    setLoading(true);

    try {
      const res: AIChatResponse = await chatWithAI(q, historyPayload);
      if (res.ai_provider) {
        setActiveProvider(res.ai_provider);
      }
      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: res.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isLlm: res.is_llm_powered,
        followups: res.suggested_followups,
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

  // ── Enhanced Markdown & Table Renderer ──
  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let inTable = false;
    let tableRows: string[][] = [];
    let keyIdx = 0;

    const flushTable = () => {
      if (tableRows.length > 0) {
        const header = tableRows[0];
        const bodyRows = tableRows.slice(1).filter((r) => !r.every((c) => /^[-:\s]+$/.test(c)));
        elements.push(
          <div key={`table-${keyIdx++}`} style={{ overflowX: 'auto', margin: '8px 0' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 12,
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                overflow: 'hidden',
              }}
            >
              <thead>
                <tr style={{ background: 'rgba(0, 102, 255, 0.08)' }}>
                  {header.map((col, cIdx) => (
                    <th
                      key={cIdx}
                      style={{
                        padding: '6px 10px',
                        borderBottom: '2px solid var(--color-border)',
                        textAlign: 'left',
                        fontWeight: 700,
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      {col.replace(/\*\*/g, '')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bodyRows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    style={{
                      background: rIdx % 2 === 0 ? 'transparent' : 'rgba(0, 0, 0, 0.02)',
                    }}
                  >
                    {row.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        style={{
                          padding: '6px 10px',
                          borderBottom: '1px solid var(--color-border)',
                          color: 'var(--color-text-primary)',
                        }}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        tableRows = [];
      }
      inTable = false;
    };

    lines.forEach((line) => {
      const trimmed = line.trim();

      // Check if markdown table row (starts and ends with | or contains |)
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        inTable = true;
        const cells = trimmed
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim());
        tableRows.push(cells);
        return;
      } else if (inTable) {
        flushTable();
      }

      if (!trimmed) {
        elements.push(<div key={`empty-${keyIdx++}`} style={{ height: 4 }} />);
        return;
      }

      // Headers (### or ## or #)
      if (trimmed.startsWith('### ') || trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
        const headerText = trimmed.replace(/^#+\s*/, '');
        elements.push(
          <div key={`h-${keyIdx++}`} style={{ fontWeight: 800, fontSize: 14, color: '#0066FF', marginTop: 8, marginBottom: 4 }}>
            {headerText}
          </div>
        );
        return;
      }

      // Bold text parser
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const renderedParts = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={pIdx} style={{ color: 'var(--color-text-primary)', fontWeight: 700 }}>
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });

      // Bullets
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        elements.push(
          <div key={`bullet-${keyIdx++}`} style={{ paddingLeft: 6, marginBottom: 4, display: 'flex', alignItems: 'flex-start' }}>
            <span style={{ color: '#0066FF', marginRight: 6, fontWeight: 900 }}>•</span>
            <span>{renderedParts}</span>
          </div>
        );
        return;
      }

      // Numbered List (1. 2.)
      const numMatch = trimmed.match(/^(\d+\.)\s+(.*)/);
      if (numMatch) {
        elements.push(
          <div key={`num-${keyIdx++}`} style={{ paddingLeft: 6, marginBottom: 4, display: 'flex', alignItems: 'flex-start' }}>
            <span style={{ color: '#0066FF', marginRight: 6, fontWeight: 700 }}>{numMatch[1]}</span>
            <span>{renderedParts}</span>
          </div>
        );
        return;
      }

      // Regular line
      elements.push(
        <div key={`line-${keyIdx++}`} style={{ marginBottom: 4 }}>
          {renderedParts}
        </div>
      );
    });

    if (inTable) {
      flushTable();
    }

    return elements;
  };

  const widgetContent = (
    <div
      style={{
        width: embedded ? '100%' : '395px',
        height: embedded ? '580px' : '570px',
        maxHeight: 'calc(100vh - 120px)',
        backgroundColor: 'var(--color-bg-card)',
        borderRadius: '24px',
        boxShadow: embedded ? '0 10px 30px rgba(0,0,0,0.15)' : '0 20px 60px rgba(0, 35, 90, 0.25)',
        border: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* ── Chat Header ── */}
      <div
        style={{
          padding: '14px 18px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(135deg, rgba(0, 102, 255, 0.04) 0%, rgba(59, 130, 246, 0.02) 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Avatar with Online Green Dot */}
          <div style={{ position: 'relative' }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, rgba(0, 102, 255, 0.08) 0%, rgba(59, 130, 246, 0.04) 100%)',
                boxShadow: '0 4px 12px rgba(0, 102, 255, 0.15)',
                border: '1px solid rgba(0, 102, 255, 0.15)',
              }}
            >
              <HisobBotLogoSVG size={36} />
            </div>



            <span
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 10,
                height: 10,
                backgroundColor: '#22C55E',
                border: '2px solid var(--color-bg-card)',
                borderRadius: '50%',
              }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--color-text-primary)' }}>Hisob AI</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: '#22C55E' }}>● ONLINE</span>
              <span>•</span>
              <span style={{ color: '#0066FF', background: 'rgba(0, 102, 255, 0.08)', padding: '1px 6px', borderRadius: 4 }}>
                {activeProvider}
              </span>
            </div>
          </div>
        </div>

        {/* Top Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Tooltip title="Clear Chat History">
            <Button
              type="text"
              shape="circle"
              icon={<DeleteOutlined style={{ fontSize: 15, color: 'var(--color-text-secondary)' }} />}
              onClick={handleClearHistory}
            />
          </Tooltip>

          {!embedded && (
            <Button
              type="text"
              shape="circle"
              icon={<CloseOutlined style={{ fontSize: 16, color: 'var(--color-text-secondary)' }} />}
              onClick={() => setIsOpen(false)}
            />
          )}
        </div>
      </div>

      {/* ── Chat Messages Feed ── */}
      <div
        ref={chatMessagesContainerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          background: 'var(--color-bg-card)',
        }}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                maxWidth: '88%',
                backgroundColor: msg.sender === 'user' ? '#0066FF' : 'var(--color-bg)',
                border: msg.sender === 'user' ? 'none' : '1px solid var(--color-border)',
                color: msg.sender === 'user' ? '#FFFFFF' : 'var(--color-text-primary)',
                borderRadius: msg.sender === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                padding: '12px 16px',
                fontSize: 13.5,
                lineHeight: 1.5,
                boxShadow: msg.sender === 'user' ? '0 4px 14px rgba(0, 102, 255, 0.22)' : '0 2px 6px rgba(0, 0, 0, 0.02)',
                position: 'relative',
              }}
            >
              {renderFormattedText(msg.text)}

              {/* Message Bottom Toolbar for AI responses */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 6,
                  paddingTop: 2,
                }}
              >
                {msg.sender === 'ai' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Tooltip title="Copy Answer">
                      <Button
                        type="text"
                        size="small"
                        icon={copiedId === msg.id ? <CheckOutlined style={{ color: '#22C55E' }} /> : <CopyOutlined style={{ fontSize: 11, color: 'var(--color-text-secondary)' }} />}
                        onClick={() => handleCopyText(msg.id, msg.text)}
                        style={{ padding: '0 4px', height: 18 }}
                      />
                    </Tooltip>
                    {messages[messages.length - 1].id === msg.id && (
                      <Tooltip title="Regenerate Answer">
                        <Button
                          type="text"
                          size="small"
                          icon={<ReloadOutlined style={{ fontSize: 11, color: 'var(--color-text-secondary)' }} />}
                          onClick={() => {
                            const lastUser = [...messages].reverse().find((m) => m.sender === 'user');
                            if (lastUser) handleSend(lastUser.text);
                          }}
                          style={{ padding: '0 4px', height: 18 }}
                        />
                      </Tooltip>
                    )}
                  </div>
                ) : (
                  <div />
                )}

                <div
                  style={{
                    fontSize: 10,
                    color: msg.sender === 'user' ? 'rgba(255,255,255,0.75)' : 'var(--color-text-secondary)',
                    fontWeight: 500,
                  }}
                >
                  {msg.timestamp}
                </div>
              </div>
            </div>

            {/* Dynamic Suggested Follow-ups underneath AI answers */}
            {msg.sender === 'ai' && msg.followups && msg.followups.length > 0 && messages[messages.length - 1].id === msg.id && (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 5, maxWidth: '90%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 800, color: '#0066FF', letterSpacing: 0.5 }}>
                  <ThunderboltOutlined style={{ fontSize: 11 }} />
                  <span>SUGGESTED FOLLOW-UPS:</span>
                </div>
                {msg.followups.slice(0, 3).map((f, fIdx) => (
                  <button
                    key={fIdx}
                    disabled={loading}
                    onClick={() => handleSend(f)}
                    style={{
                      background: 'rgba(0, 102, 255, 0.05)',
                      border: '1px solid rgba(0, 102, 255, 0.18)',
                      borderRadius: '12px',
                      padding: '5px 12px',
                      fontSize: 11,
                      color: '#0066FF',
                      fontWeight: 600,
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#0066FF';
                      e.currentTarget.style.color = '#FFFFFF';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(0, 102, 255, 0.05)';
                      e.currentTarget.style.color = '#0066FF';
                    }}
                  >
                    <span>↳ {f}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div
              style={{
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: '18px 18px 18px 4px',
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Spin size="small" />
              <span style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', fontWeight: 500 }}>Hisob AI is analyzing financial data...</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Starter Chips Section (ONLY SHOWN BEFORE FIRST USER QUESTION) ── */}
      {messages.filter(m => m.sender === 'user').length === 0 && (
        <div style={{ padding: '0 14px 10px', background: 'var(--color-bg-card)', borderTop: '1px solid rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 6, textAlign: 'center' }}>
            POPULAR FINANCIAL TOPICS:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
            {CHIP_SUGGESTIONS.map((chip, idx) => (
              <button
                key={idx}
                disabled={loading}
                onClick={() => handleSend(chip.query)}
                style={{
                  background: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '16px',
                  padding: '5px 11px',
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: 'var(--color-text-primary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  transition: 'all 0.2s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#0066FF';
                  e.currentTarget.style.color = '#0066FF';
                  e.currentTarget.style.background = 'rgba(0, 102, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                  e.currentTarget.style.color = 'var(--color-text-primary)';
                  e.currentTarget.style.background = 'var(--color-bg)';
                }}
              >
                <span>{chip.label}</span>
                <PlusOutlined style={{ fontSize: 9 }} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Bottom Input Container with Speech-to-Text Mic ── */}
      <div style={{ padding: '0 14px 12px', background: 'var(--color-bg-card)' }}>
        <div
          style={{
            background: 'var(--color-bg)',
            borderRadius: '24px',
            padding: '4px 6px 4px 14px',
            display: 'flex',
            alignItems: 'center',
            border: isListening ? '2px solid #22C55E' : '1px solid var(--color-border)',
            transition: 'all 0.2s ease',
          }}
        >
          <Input
            placeholder={isListening ? 'Listening… speak your prompt' : 'Ask Hisob AI...'}
            value={inputText}
            disabled={loading}
            onChange={(e) => setInputText(e.target.value)}
            onPressEnter={() => handleSend()}
            variant="borderless"
            style={{
              fontSize: 13.5,
              color: 'var(--color-text-primary)',
              padding: 0,
              boxShadow: 'none',
            }}
          />

          {/* Web Speech Voice Dictation Button */}
          <Tooltip title={isListening ? 'Stop Listening' : 'Voice Input (Speech-to-Text)'} placement="top">
            <Button
              type="text"
              shape="circle"
              icon={<AudioOutlined style={{ fontSize: 15, color: isListening ? '#22C55E' : 'var(--color-text-secondary)' }} />}
              onClick={toggleVoiceRecognition}
              className={isListening ? 'chat-mic-active' : ''}
              style={{
                marginRight: 4,
                flexShrink: 0,
              }}
            />
          </Tooltip>

          <Button
            type="primary"
            shape="circle"
            icon={<ArrowRightOutlined style={{ fontSize: 13 }} />}
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

        {/* Branding & Disclaimer Footer */}
        <div style={{ textAlign: 'center', marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
          <span style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>
            Powered by <strong style={{ color: '#0066FF', fontWeight: 700 }}>ArcNeuron.ai</strong>
          </span>
          <span style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>•</span>
          <span style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>
            Encrypted session
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

        @keyframes micPulseGlow {
          0% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.5);
          }
          70% {
            transform: scale(1.15);
            box-shadow: 0 0 0 10px rgba(34, 197, 94, 0);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
          }
        }

        .chat-mic-active {
          animation: micPulseGlow 1.5s infinite;
          background: rgba(34, 197, 94, 0.15) !important;
        }

        /* ── Hisob Robot Custom Micro-Animations ── */
        @keyframes botEyeBlink {
          0%, 90%, 100% {
            transform: scaleY(1);
          }
          95% {
            transform: scaleY(0.1);
          }
        }

        .bot-eye {
          transform-origin: 100px 94px;
          animation: botEyeBlink 4.5s infinite;
        }

        @keyframes botAntennaBlink {
          0%, 100% {
            opacity: 1;
            filter: drop-shadow(0 0 10px rgba(34, 197, 94, 0.95));
          }
          50% {
            opacity: 0.25;
            filter: drop-shadow(0 0 1px rgba(34, 197, 94, 0.15));
          }
        }

        .bot-antenna-ball {
          animation: botAntennaBlink 1.2s ease-in-out infinite;
        }


        @keyframes botRupeeGlow {
          0%, 100% {
            opacity: 0.9;
          }
          50% {
            opacity: 1;
            filter: drop-shadow(0 0 4px #FFFFFF);
          }
        }

        .bot-rupee-symbol {
          animation: botRupeeGlow 3s ease-in-out infinite;
        }

        @keyframes botChestDot {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }

        .bot-chest-dot-1 { animation: botChestDot 1.2s infinite 0s; }
        .bot-chest-dot-2 { animation: botChestDot 1.2s infinite 0.4s; }
        .bot-chest-dot-3 { animation: botChestDot 1.2s infinite 0.8s; }

        @keyframes chatBtnPulseGlow {
          0% {
            box-shadow: 0 0 0 0 rgba(0, 102, 255, 0.6), 0 10px 28px rgba(0, 102, 255, 0.4);
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
            bottom: 115px !important;
            width: auto !important;
          }
        }
      `}</style>

      {embedded ? (
        widgetContent
      ) : (
        <>
          {/* Pop-up Window (Positioned cleanly above FAB with ample 30px clearance gap) */}
          {isOpen && (
            <div
              className="chat-popup-window ai-chat-popup-container"
              style={{
                position: 'fixed',
                bottom: '115px',
                right: '24px',
                zIndex: 1050,
              }}
            >
              {widgetContent}
            </div>
          )}

          {/* Floating Trigger Button (Displays X when open, Animated Chat Icon when closed) */}
          <div
            className="ai-chat-fab-container"
            style={{
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              zIndex: 1060,
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
                  <HisobBotLogoSVG size={52} showOuterBadge={false} style={{ filter: 'none' }} />
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
                boxShadow: '0 8px 24px rgba(0, 102, 255, 0.45)',
              }}
            />
          </div>
        </>
      )}

    </>
  );
};

export default AIChatWidget;
