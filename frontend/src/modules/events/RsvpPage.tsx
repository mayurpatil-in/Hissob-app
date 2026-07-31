import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { invitationsApi, type PublicRsvpInfoResponse } from '../../api/invitations';
import {
  Calendar,
  MapPin,
  Phone,
  CheckCircle,
  XCircle,
  HelpCircle,
  Users,
  Sparkles,
  QrCode,
  Loader2,
  HeartHandshake,
  Download,
  Palette,
  IndianRupee,
  ExternalLink,
} from 'lucide-react';

type PatrikaTheme = 'royal' | 'saffron' | 'emerald' | 'dark';

export const RsvpPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const cardRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<PublicRsvpInfoResponse | null>(null);
  const [rsvpStatus, setRsvpStatus] = useState<'attending' | 'declined' | 'maybe'>('attending');
  const [guestsCount, setGuestsCount] = useState<number>(1);
  const [specialRequests, setSpecialRequests] = useState('');
  const [theme, setTheme] = useState<PatrikaTheme>('saffron');
  const [downloading, setDownloading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setErrorMsg('No invitation token found in URL.');
      return;
    }

    invitationsApi
      .getPublicRsvpInfo(token)
      .then((res) => {
        setInfo(res);
        if (res.rsvp_status && res.rsvp_status !== 'pending') {
          setRsvpStatus(res.rsvp_status as any);
        }
        setGuestsCount(res.guests_count || 1);
        if (res.special_requests) setSpecialRequests(res.special_requests);
      })
      .catch((err) => {
        setErrorMsg(err.response?.data?.detail || 'Digital Patrika invitation not found.');
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmitRsvp = async (statusChoice: 'attending' | 'declined' | 'maybe') => {
    setRsvpStatus(statusChoice);
    setSubmitting(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await invitationsApi.submitPublicRsvp(token, {
        rsvp_status: statusChoice,
        guests_count: guestsCount,
        special_requests: specialRequests,
      });

      setSuccessMsg(res.message);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to record RSVP response.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadCard = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, { scale: 2, useCORS: true, backgroundColor: '#0F172A' });
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `Patrika_${info?.guest_name || 'Guest'}.png`;
      link.click();
    } catch (err) {
      console.error('Download card error:', err);
    } finally {
      setDownloading(false);
    }
  };

  const getThemeGradient = () => {
    switch (theme) {
      case 'saffron':
        return 'linear-gradient(135deg, #D97706 0%, #B45309 100%)';
      case 'royal':
        return 'linear-gradient(135deg, #7C3AED 0%, #4C1D95 100%)';
      case 'emerald':
        return 'linear-gradient(135deg, #059669 0%, #064E3B 100%)';
      case 'dark':
        return 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)';
      default:
        return 'linear-gradient(135deg, #D97706 0%, #B45309 100%)';
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0F172A', color: '#94A3B8' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 className="animate-spin" size={42} style={{ color: '#D97706', margin: '0 auto 16px' }} />
          <p style={{ fontSize: '15px', fontWeight: 600 }}>Loading Digital Patrika Invitation...</p>
        </div>
      </div>
    );
  }

  if (errorMsg && !info) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0F172A', padding: '20px' }}>
        <div style={{ maxWidth: '440px', width: '100%', background: '#1E293B', borderRadius: '24px', padding: '36px', textAlign: 'center', border: '1px solid #334155' }}>
          <XCircle size={48} style={{ color: '#F87171', margin: '0 auto 16px' }} />
          <h2 style={{ color: '#F8FAFC', fontSize: '20px', fontWeight: 800 }}>Invitation Link Error</h2>
          <p style={{ color: '#94A3B8', fontSize: '14px', margin: '10px 0 0 0' }}>{errorMsg}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0F172A', padding: '32px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      {/* Top Utility Controls */}
      <div style={{ maxWidth: '600px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', background: '#1E293B', padding: '12px 18px', borderRadius: '16px', border: '1px solid #334155' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Palette size={18} style={{ color: '#FBBF24' }} />
          <span style={{ color: '#94A3B8', fontSize: '12px', fontWeight: 700 }}>Theme:</span>
          {(['saffron', 'royal', 'emerald', 'dark'] as PatrikaTheme[]).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                border: theme === t ? '2px solid #FFF' : 'none',
                background:
                  t === 'saffron'
                    ? '#D97706'
                    : t === 'royal'
                    ? '#7C3AED'
                    : t === 'emerald'
                    ? '#059669'
                    : '#334155',
                cursor: 'pointer',
              }}
              title={`${t} theme`}
            />
          ))}
        </div>

        <button
          onClick={handleDownloadCard}
          disabled={downloading}
          style={{ padding: '8px 14px', background: '#334155', color: '#FFF', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          {downloading ? <Loader2 className="animate-spin" size={14} /> : <Download size={14} />} Download Pass Card
        </button>
      </div>

      {/* Main Patrika Container */}
      <div
        id="patrika-card-container"
        ref={cardRef}
        style={{ maxWidth: '600px', width: '100%', background: '#1E293B', borderRadius: '28px', border: '1px solid #334155', overflow: 'hidden', boxShadow: '0 25px 60px -15px rgba(0,0,0,0.6)' }}
      >
        {/* Dynamic Banner Header */}
        <div style={{ background: getThemeGradient(), padding: '40px 28px', textAlign: 'center', color: '#FFF', position: 'relative' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.3)', padding: '4px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '14px' }}>
            <Sparkles size={14} style={{ color: '#FDE047' }} /> {info?.vip_tier} Patrika
          </div>

          {info?.org_logo && (
            <div style={{ marginBottom: '14px' }}>
              <img src={info.org_logo} alt="Logo" style={{ height: '52px', objectFit: 'contain', background: '#FFF', padding: '4px 12px', borderRadius: '12px' }} />
            </div>
          )}

          <h1 style={{ fontSize: '28px', fontWeight: 900, margin: '0 0 6px 0', textShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>{info?.title}</h1>
          <p style={{ fontSize: '16px', color: '#FEF3C7', margin: 0, fontWeight: 600 }}>{info?.org_name}</p>
        </div>

        {/* Content Details */}
        <div style={{ padding: '32px 28px' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <span style={{ color: '#94A3B8', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Cordially Invited Guest</span>
            <h2 style={{ color: '#F8FAFC', fontSize: '24px', fontWeight: 800, margin: '4px 0 0 0' }}>{info?.guest_name}</h2>
          </div>

          {/* Event Metadata Grid */}
          <div style={{ background: '#0F172A', borderRadius: '18px', padding: '20px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '28px' }}>
            {info?.mahaprasad_menu && (
              <div style={{ background: 'rgba(217, 119, 6, 0.12)', border: '1px solid rgba(217, 119, 6, 0.4)', borderRadius: '14px', padding: '14px' }}>
                <span style={{ fontSize: '12px', color: '#FBBF24', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                  🍱 महाप्रसाद मेनू (Mahaprasad Menu):
                </span>
                <p style={{ margin: 0, color: '#FEF3C7', fontSize: '14px', fontWeight: 600, lineHeight: 1.6 }}>
                  {info.mahaprasad_menu}
                </p>
              </div>
            )}

            {info?.timing_slots && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#CBD5E1', fontSize: '14px' }}>
                <Calendar size={20} style={{ color: '#F59E0B' }} />
                <div>
                  <strong style={{ color: '#F8FAFC', display: 'block' }}>महाप्रसाद वेळ & बॅचेस (Timings)</strong>
                  <span style={{ color: '#FBBF24', fontWeight: 700 }}>{info.timing_slots}</span>
                </div>
              </div>
            )}

            {info?.chief_guests && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#CBD5E1', fontSize: '14px' }}>
                <Users size={20} style={{ color: '#F59E0B' }} />
                <div>
                  <strong style={{ color: '#F8FAFC', display: 'block' }}>निमंत्रक व विश्वस्त (Chief Hosts & Trustees)</strong>
                  <span>{info.chief_guests}</span>
                </div>
              </div>
            )}

            {info?.festival_dates && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#CBD5E1', fontSize: '14px' }}>
                <Calendar size={20} style={{ color: '#F59E0B' }} />
                <div>
                  <strong style={{ color: '#F8FAFC', display: 'block' }}>Dates & Schedule</strong>
                  <span>{info.festival_dates}</span>
                </div>
              </div>
            )}

            {info?.org_address && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#CBD5E1', fontSize: '14px' }}>
                <MapPin size={20} style={{ color: '#F59E0B' }} />
                <div>
                  <strong style={{ color: '#F8FAFC', display: 'block' }}>Venue Location</strong>
                  <span>{info.org_address}</span>
                </div>
              </div>
            )}

            {info?.org_phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#CBD5E1', fontSize: '14px' }}>
                <Phone size={20} style={{ color: '#F59E0B' }} />
                <div>
                  <strong style={{ color: '#F8FAFC', display: 'block' }}>Helpline / Contact</strong>
                  <span>{info.org_phone}</span>
                </div>
              </div>
            )}
          </div>

          {/* RSVP Status Form */}
          <div style={{ background: 'rgba(217, 119, 6, 0.08)', borderRadius: '20px', border: '1px solid rgba(217, 119, 6, 0.3)', padding: '24px' }}>
            <h3 style={{ color: '#F8FAFC', fontSize: '18px', fontWeight: 800, margin: '0 0 16px 0', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <HeartHandshake size={20} style={{ color: '#FBBF24' }} /> Confirm Your Attendance
            </h3>

            {successMsg && (
              <div style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid #22C55E', color: '#4ADE80', padding: '12px 16px', borderRadius: '12px', fontSize: '14px', marginBottom: '20px', textAlign: 'center', fontWeight: 600 }}>
                {successMsg}
              </div>
            )}

            {/* Attendance Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
              <button
                type="button"
                onClick={() => handleSubmitRsvp('attending')}
                disabled={submitting}
                style={{
                  padding: '14px 10px',
                  borderRadius: '14px',
                  border: rsvpStatus === 'attending' ? '2px solid #22C55E' : '1px solid #334155',
                  background: rsvpStatus === 'attending' ? 'rgba(34,197,94,0.2)' : '#0F172A',
                  color: rsvpStatus === 'attending' ? '#4ADE80' : '#CBD5E1',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <CheckCircle size={22} style={{ color: rsvpStatus === 'attending' ? '#4ADE80' : '#64748B' }} /> Attending
              </button>

              <button
                type="button"
                onClick={() => handleSubmitRsvp('maybe')}
                disabled={submitting}
                style={{
                  padding: '14px 10px',
                  borderRadius: '14px',
                  border: rsvpStatus === 'maybe' ? '2px solid #F59E0B' : '1px solid #334155',
                  background: rsvpStatus === 'maybe' ? 'rgba(245,158,11,0.2)' : '#0F172A',
                  color: rsvpStatus === 'maybe' ? '#FBBF24' : '#CBD5E1',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <HelpCircle size={22} style={{ color: rsvpStatus === 'maybe' ? '#FBBF24' : '#64748B' }} /> Maybe
              </button>

              <button
                type="button"
                onClick={() => handleSubmitRsvp('declined')}
                disabled={submitting}
                style={{
                  padding: '14px 10px',
                  borderRadius: '14px',
                  border: rsvpStatus === 'declined' ? '2px solid #EF4444' : '1px solid #334155',
                  background: rsvpStatus === 'declined' ? 'rgba(239,68,68,0.2)' : '#0F172A',
                  color: rsvpStatus === 'declined' ? '#F87171' : '#CBD5E1',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <XCircle size={22} style={{ color: rsvpStatus === 'declined' ? '#F87171' : '#64748B' }} /> Regret
              </button>
            </div>

            {/* Guests Count */}
            {rsvpStatus !== 'declined' && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: '#CBD5E1', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
                  Number of Attendees (Family / Guests):
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', background: '#0F172A', border: '1px solid #334155', borderRadius: '12px', overflow: 'hidden' }}>
                    <button
                      type="button"
                      onClick={() => setGuestsCount((c) => Math.max(1, c - 1))}
                      style={{ padding: '10px 16px', background: 'none', border: 'none', color: '#FFF', fontWeight: 800, cursor: 'pointer', fontSize: '16px' }}
                    >
                      -
                    </button>
                    <span style={{ padding: '0 16px', color: '#FBBF24', fontWeight: 800, fontSize: '16px' }}>{guestsCount}</span>
                    <button
                      type="button"
                      onClick={() => setGuestsCount((c) => c + 1)}
                      style={{ padding: '10px 16px', background: 'none', border: 'none', color: '#FFF', fontWeight: 800, cursor: 'pointer', fontSize: '16px' }}
                    >
                      +
                    </button>
                  </div>
                  <span style={{ color: '#94A3B8', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Users size={16} /> Total Attendees
                  </span>
                </div>
              </div>
            )}

            {/* Special Request */}
            <div>
              <label style={{ display: 'block', color: '#CBD5E1', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Special Assistance / Note to Organizer (Optional):
              </label>
              <textarea
                rows={2}
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                placeholder="e.g. Mahaprasad dietary requirement, Senior citizen wheelchair access..."
                style={{ width: '100%', padding: '10px 14px', background: '#0F172A', border: '1px solid #334155', borderRadius: '12px', color: '#FFF', fontSize: '13px', outline: 'none', resize: 'vertical' }}
              />
            </div>
          </div>

          {/* Donation Pledge Section */}
          {(info?.upi_id || info?.tenant_slug) && (
            <div style={{ marginTop: '24px', background: 'rgba(34,197,94,0.08)', borderRadius: '20px', border: '1px solid rgba(34,197,94,0.3)', padding: '20px', textAlign: 'center' }}>
              <h4 style={{ color: '#F8FAFC', fontSize: '15px', fontWeight: 800, margin: '0 0 6px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <IndianRupee size={18} style={{ color: '#4ADE80' }} /> Support & Sponsor Celebration
              </h4>
              <p style={{ color: '#94A3B8', fontSize: '12px', margin: '0 0 14px 0' }}>
                Pledge a donation or sponsor Mahaprasad directly for {info.org_name}.
              </p>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {info.upi_id && (
                  <div style={{ background: '#0F172A', padding: '8px 14px', borderRadius: '10px', border: '1px solid #334155', color: '#4ADE80', fontSize: '13px', fontWeight: 700 }}>
                    UPI: {info.upi_id}
                  </div>
                )}
                {info.tenant_slug && (
                  <a
                    href={`/pay/${info.tenant_slug}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ padding: '8px 18px', background: '#16A34A', color: '#FFF', borderRadius: '10px', textDecoration: 'none', fontWeight: 700, fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    Donate via UPI <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Entrance QR Badge */}
          <div style={{ marginTop: '24px', textAlign: 'center', background: '#0F172A', borderRadius: '20px', padding: '24px', border: '1px dashed #475569' }}>
            <QrCode size={32} style={{ color: '#FBBF24', margin: '0 auto 8px' }} />
            <h4 style={{ color: '#F8FAFC', fontSize: '15px', fontWeight: 700, margin: '0 0 4px 0' }}>Digital Entrance VIP Ticket Token</h4>
            <p style={{ color: '#64748B', fontSize: '12px', margin: 0 }}>Show this screen at the entrance check-in counter for instant VIP scanner entry.</p>
            <div style={{ marginTop: '12px', background: '#1E293B', padding: '8px 16px', borderRadius: '8px', display: 'inline-block', fontFamily: 'monospace', color: '#FBBF24', fontSize: '12px', fontWeight: 700 }}>
              PASS: {info?.token.slice(0, 16).toUpperCase()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
