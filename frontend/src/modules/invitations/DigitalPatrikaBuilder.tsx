import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { invitationsApi, type EventInvite } from '../../api/invitations';
import {
  X,
  Sparkles,
  Send,
  User,
  Crown,
  CheckCircle2,
  Copy,
  Loader2,
  Download,
  QrCode,
  Share2,
  UtensilsCrossed,
  Clock,
} from 'lucide-react';

interface DigitalPatrikaBuilderProps {
  isOpen: boolean;
  festivalId?: string;
  onClose: () => void;
  onSuccess: (invite: EventInvite) => void;
}

type BuilderTheme = 'saffron' | 'royal' | 'emerald' | 'dark';

export const DigitalPatrikaBuilder: React.FC<DigitalPatrikaBuilderProps> = ({
  isOpen,
  festivalId,
  onClose,
  onSuccess,
}) => {
  const previewRef = useRef<HTMLDivElement>(null);

  const [cardMode, setCardMode] = useState<'mahaprasad' | 'general'>('mahaprasad');
  const [title, setTitle] = useState('श्री गणेश जन्मोत्सव निमित्त भव्य महाप्रसाद निमंत्रण');
  const [guestName, setGuestName] = useState('Shri Vijay Patil & Parivar');
  const [guestEmail] = useState('');
  const [guestPhone] = useState('');
  const [vipTier, setVipTier] = useState('Chief Patron');
  const [theme, setTheme] = useState<BuilderTheme>('saffron');

  // Mahaprasad details
  const [mahaprasadMenu, setMahaprasadMenu] = useState('पुरी, अम्रखंड / श्रीखंड, मसाले भात, कटाची आमटी, बटाटा भाजी & अजवाइन पूरी');
  const [timingSlots, setTimingSlots] = useState('दुपारी १२:३० ते ४:०० & संध्याकाळी ७:०० ते १०:००');
  const [chiefGuests, setChiefGuests] = useState('श्री निलेश शहा (अध्यक्ष), श्री रमेश पाटील (विश्वस्त)');

  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [createdInvite, setCreatedInvite] = useState<EventInvite | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');

    try {
      const invite = await invitationsApi.createEventInvite({
        festival_id: festivalId,
        title,
        guest_name: guestName,
        guest_email: guestEmail || undefined,
        guest_phone: guestPhone || undefined,
        vip_tier: vipTier,
        mahaprasad_menu: cardMode === 'mahaprasad' ? mahaprasadMenu : undefined,
        timing_slots: cardMode === 'mahaprasad' ? timingSlots : undefined,
        chief_guests: cardMode === 'mahaprasad' ? chiefGuests : undefined,
      });

      setCreatedInvite(invite);
      onSuccess(invite);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to create digital patrika card.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPreviewCard = async () => {
    if (!previewRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(previewRef.current, { scale: 2, useCORS: true, backgroundColor: '#0F172A' });
      const img = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = img;
      link.download = `Mahaprasad_Patrika_${guestName || 'Card'}.png`;
      link.click();
    } catch (err) {
      console.error('Failed to download card:', err);
    } finally {
      setDownloading(false);
    }
  };

  const getThemeBackground = () => {
    switch (theme) {
      case 'saffron':
        return 'linear-gradient(135deg, #D97706 0%, #B45309 100%)';
      case 'royal':
        return 'linear-gradient(135deg, #7C3AED 0%, #4C1D95 100%)';
      case 'emerald':
        return 'linear-gradient(135deg, #059669 0%, #064E3B 100%)';
      case 'dark':
        return 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)';
    }
  };

  const copyRsvpLink = (url?: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    alert('Digital Patrika RSVP link copied to clipboard!');
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ maxWidth: '1020px', width: '100%', background: '#1E293B', borderRadius: '24px', border: '1px solid #334155', overflow: 'hidden', boxShadow: '0 25px 60px -15px rgba(0,0,0,0.6)', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
        
        {/* Modal Header */}
        <div style={{ padding: '18px 24px', background: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UtensilsCrossed size={20} style={{ color: '#FDE047' }} /> Grand Mahaprasad Invitation Patrika Builder
            </h3>
            <p style={{ fontSize: '12px', color: '#FEF3C7', margin: '2px 0 0 0' }}>Design traditional Mahaprasad cards with menu, seating batches, chief hosts & entrance pass</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#FEF3C7', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Content - Side by Side Grid */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          
          {/* Left Side: Form Inputs */}
          <div>
            {createdInvite ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <CheckCircle2 size={48} style={{ color: '#4ADE80', margin: '0 auto 12px' }} />
                <h4 style={{ color: '#F8FAFC', fontSize: '18px', fontWeight: 800 }}>Mahaprasad Patrika Created!</h4>
                <p style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '20px' }}>
                  VIP Invitation card generated for <strong>{createdInvite.guest_name}</strong>.
                </p>

                <div style={{ background: '#0F172A', border: '1px solid #334155', borderRadius: '12px', padding: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="text" readOnly value={createdInvite.rsvp_url} style={{ flex: 1, background: 'none', border: 'none', color: '#FBBF24', fontSize: '13px', outline: 'none' }} />
                  <button
                    type="button"
                    onClick={() => copyRsvpLink(createdInvite.rsvp_url)}
                    style={{ padding: '8px 12px', background: '#D97706', color: '#FFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Copy size={14} /> Copy
                  </button>
                </div>

                {createdInvite.rsvp_url && (
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`🙏🏻 सस्नेह निमंत्रण 🙏🏻\n\n${createdInvite.guest_name},\n${createdInvite.title} प्रसंगी आपणास व आपल्या कुटुंबास आग्रहाचे निमंत्रण.\n\n🍱 महाप्रसाद मेनू: ${createdInvite.mahaprasad_menu || ''}\n⏰ वेळ: ${createdInvite.timing_slots || ''}\n\nडिजिटल पत्रिका व हजेरी नोंदवा: ${createdInvite.rsvp_url}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: '#25D366', color: '#FFF', textDecoration: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '13px', marginBottom: '20px' }}
                  >
                    <Share2 size={16} /> Share via WhatsApp
                  </a>
                )}

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button onClick={() => setCreatedInvite(null)} style={{ flex: 1, padding: '12px', background: '#334155', color: '#FFF', border: 'none', borderRadius: '10px', fontWeight: 600, cursor: 'pointer' }}>
                    Create Another
                  </button>
                  <button onClick={onClose} style={{ flex: 1, padding: '12px', background: '#D97706', color: '#FFF', border: 'none', borderRadius: '10px', fontWeight: 600, cursor: 'pointer' }}>
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {errorMsg && (
                  <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid #EF4444', color: '#F87171', padding: '10px 14px', borderRadius: '10px', fontSize: '13px' }}>
                    {errorMsg}
                  </div>
                )}

                {/* Mode Selector */}
                <div style={{ display: 'flex', background: '#0F172A', padding: '4px', borderRadius: '10px', border: '1px solid #334155' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setCardMode('mahaprasad');
                      setTitle('श्री गणेश जन्मोत्सव निमित्त भव्य महाप्रसाद निमंत्रण');
                    }}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '8px',
                      border: 'none',
                      background: cardMode === 'mahaprasad' ? '#D97706' : 'transparent',
                      color: cardMode === 'mahaprasad' ? '#FFF' : '#94A3B8',
                      fontWeight: 700,
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <UtensilsCrossed size={14} /> Grand Mahaprasad Patrika
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCardMode('general');
                      setTitle('Ganesh Utsav 2026 Celebration Invitation');
                    }}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '8px',
                      border: 'none',
                      background: cardMode === 'general' ? '#7C3AED' : 'transparent',
                      color: cardMode === 'general' ? '#FFF' : '#94A3B8',
                      fontWeight: 700,
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <Sparkles size={14} /> General Event Patrika
                  </button>
                </div>

                {/* Theme Selector */}
                <div>
                  <label style={{ display: 'block', color: '#CBD5E1', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Select Patrika Card Theme:</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                    {[
                      { id: 'saffron', name: 'Saffron Gold', bg: '#D97706' },
                      { id: 'royal', name: 'Royal Crimson', bg: '#7C3AED' },
                      { id: 'emerald', name: 'Emerald', bg: '#059669' },
                      { id: 'dark', name: 'Minimal Dark', bg: '#334155' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTheme(t.id as BuilderTheme)}
                        style={{
                          padding: '8px 4px',
                          background: t.bg,
                          color: '#FFF',
                          border: theme === t.id ? '2px solid #FFF' : '1px solid transparent',
                          borderRadius: '8px',
                          fontWeight: 700,
                          fontSize: '11px',
                          cursor: 'pointer',
                        }}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', color: '#CBD5E1', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Event / Mahaprasad Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. श्री गणेश जन्मोत्सव निमित्त भव्य महाप्रसाद निमंत्रण"
                    style={{ width: '100%', padding: '9px 12px', background: '#0F172A', border: '1px solid #334155', borderRadius: '10px', color: '#FFF', fontSize: '13px', outline: 'none' }}
                  />
                </div>

                {cardMode === 'mahaprasad' && (
                  <>
                    <div>
                      <label style={{ display: 'block', color: '#CBD5E1', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                        🍱 Mahaprasad Menu Details:
                      </label>
                      <input
                        type="text"
                        value={mahaprasadMenu}
                        onChange={(e) => setMahaprasadMenu(e.target.value)}
                        placeholder="e.g. पूरी, श्रीखंड, मसाले भात, बटाटा भाजी & कटाची आमटी"
                        style={{ width: '100%', padding: '9px 12px', background: '#0F172A', border: '1px solid #334155', borderRadius: '10px', color: '#FBBF24', fontSize: '13px', outline: 'none' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', color: '#CBD5E1', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                        ⏰ Mahaprasad Seating Timings:
                      </label>
                      <input
                        type="text"
                        value={timingSlots}
                        onChange={(e) => setTimingSlots(e.target.value)}
                        placeholder="e.g. दुपारी १२:३० ते ४:०० & संध्याकाळी ७:०० ते १०:००"
                        style={{ width: '100%', padding: '9px 12px', background: '#0F172A', border: '1px solid #334155', borderRadius: '10px', color: '#FFF', fontSize: '13px', outline: 'none' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', color: '#CBD5E1', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                        🤝 Chief Guests / Organizers (निमंत्रक / विश्वस्त):
                      </label>
                      <input
                        type="text"
                        value={chiefGuests}
                        onChange={(e) => setChiefGuests(e.target.value)}
                        placeholder="e.g. श्री निलेश शहा (अध्यक्ष), श्री रमेश पाटील (विश्वस्त)"
                        style={{ width: '100%', padding: '9px 12px', background: '#0F172A', border: '1px solid #334155', borderRadius: '10px', color: '#FFF', fontSize: '13px', outline: 'none' }}
                      />
                    </div>
                  </>
                )}

                <div>
                  <label style={{ display: 'block', color: '#CBD5E1', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Guest / Donor Name</label>
                  <div style={{ position: 'relative' }}>
                    <User size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: '#64748B' }} />
                    <input
                      type="text"
                      required
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="e.g. Shri Vijay Patil & Parivar"
                      style={{ width: '100%', padding: '9px 12px 9px 38px', background: '#0F172A', border: '1px solid #334155', borderRadius: '10px', color: '#FFF', fontSize: '13px', outline: 'none' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', color: '#CBD5E1', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>VIP Category / Honorific</label>
                  <div style={{ position: 'relative' }}>
                    <Crown size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: '#64748B' }} />
                    <select
                      value={vipTier}
                      onChange={(e) => setVipTier(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px 9px 38px', background: '#0F172A', border: '1px solid #334155', borderRadius: '10px', color: '#FFF', fontSize: '13px', outline: 'none' }}
                    >
                      <option value="Chief Patron">Chief Patron / Trustee</option>
                      <option value="Major Donor">Major Donor / Supporter</option>
                      <option value="Dignitary Guest">Dignitary / Special Guest</option>
                      <option value="General Patron">General Patron</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={handleDownloadPreviewCard}
                    disabled={downloading}
                    style={{ flex: 1, padding: '10px', background: '#334155', color: '#FFF', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    {downloading ? <Loader2 className="animate-spin" size={14} /> : <Download size={14} />} Download PNG Card
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)', color: '#FFF', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '12px', cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    {submitting ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />} Save & Create Link
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Right Side: Live Visual Canvas Preview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ color: '#94A3B8', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Live Card Canvas Preview:</span>
            
            <div
              ref={previewRef}
              style={{
                background: '#0F172A',
                borderRadius: '20px',
                border: '2px solid #D97706',
                overflow: 'hidden',
                boxShadow: '0 15px 30px rgba(0,0,0,0.5)',
                position: 'relative',
              }}
            >
              {/* Header Banner */}
              <div style={{ background: getThemeBackground(), padding: '28px 18px', textAlign: 'center', color: '#FFF', borderBottom: '2px solid #FBBF24' }}>
                <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }}>
                  🙏🏻 ॐ श्री गणेशाय नमः 🙏🏻
                </span>
                <h4 style={{ margin: '10px 0 4px 0', fontSize: '18px', fontWeight: 900, color: '#FFF', textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>{title || 'Mahaprasad Title'}</h4>
                <span style={{ fontSize: '12px', color: '#FEF3C7', fontWeight: 600 }}>Hissob Organizing Mandal & Trust</span>
              </div>

              {/* Body */}
              <div style={{ padding: '20px 18px', textAlign: 'center' }}>
                <span style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700 }}>आग्रहाचे निमंत्रण (Honored Guest):</span>
                <h3 style={{ color: '#F8FAFC', fontSize: '18px', fontWeight: 800, margin: '2px 0 14px 0' }}>{guestName || 'Shri Guest Name'}</h3>

                {/* Mahaprasad Menu Box */}
                {cardMode === 'mahaprasad' && mahaprasadMenu && (
                  <div style={{ background: 'rgba(217, 119, 6, 0.12)', border: '1px solid rgba(217, 119, 6, 0.4)', borderRadius: '12px', padding: '12px', marginBottom: '12px', textAlign: 'left' }}>
                    <div style={{ fontSize: '11px', color: '#FBBF24', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                      <UtensilsCrossed size={12} /> महाप्रसाद मेनू (Mahaprasad Menu):
                    </div>
                    <p style={{ margin: 0, color: '#FEF3C7', fontSize: '12px', fontWeight: 600, lineHeight: 1.5 }}>
                      {mahaprasadMenu}
                    </p>
                  </div>
                )}

                {/* Timings */}
                {cardMode === 'mahaprasad' && timingSlots && (
                  <div style={{ background: '#1E293B', borderRadius: '10px', padding: '8px 12px', border: '1px solid #334155', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#CBD5E1' }}>
                    <Clock size={14} style={{ color: '#FBBF24' }} />
                    <div>
                      <strong style={{ color: '#FFF' }}>महाप्रसाद वेळ: </strong>{timingSlots}
                    </div>
                  </div>
                )}

                {/* Chief Hosts */}
                {cardMode === 'mahaprasad' && chiefGuests && (
                  <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '14px' }}>
                    <strong style={{ color: '#CBD5E1' }}>निमंत्रक (Hosts): </strong>{chiefGuests}
                  </div>
                )}

                {/* Micro Pass Preview */}
                <div style={{ background: '#1E293B', borderRadius: '12px', padding: '10px', border: '1px dashed #475569', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  <QrCode size={26} style={{ color: '#FBBF24' }} />
                  <div style={{ textAlign: 'left' }}>
                    <span style={{ fontSize: '10px', color: '#94A3B8', display: 'block' }}>VIP PRASAD PASS</span>
                    <strong style={{ fontSize: '11px', color: '#FBBF24', fontFamily: 'monospace' }}>PASS-MAHAPRASAD-2026</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
