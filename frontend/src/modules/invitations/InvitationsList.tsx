import React, { useEffect, useState } from 'react';
import { invitationsApi, type UserInvite, type EventInvite } from '../../api/invitations';
import { InviteUserModal } from './InviteUserModal';
import { BulkInviteModal } from './BulkInviteModal';
import { DigitalPatrikaBuilder } from './DigitalPatrikaBuilder';
import {
  Mail,
  UserPlus,
  Upload,
  Sparkles,
  Search,
  Copy,
  Share2,
  RefreshCw,
  Ban,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
  QrCode,
  Loader2,
  Crown,
  FileSpreadsheet,
  X,
  ScanLine,
} from 'lucide-react';

export const InvitationsList: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'team' | 'events'>('team');
  const [userInvites, setUserInvites] = useState<UserInvite[]>([]);
  const [eventInvites, setEventInvites] = useState<EventInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showPatrikaModal, setShowPatrikaModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);

  // Scanner modal state
  const [scanTokenInput, setScanTokenInput] = useState('');
  const [scanResultMsg, setScanResultMsg] = useState<{ success: boolean; msg: string } | null>(null);
  const [scanning, setScanning] = useState(false);

  const fetchInvites = async () => {
    setLoading(true);
    try {
      const [uData, eData] = await Promise.all([
        invitationsApi.getInvites(),
        invitationsApi.getEventInvites(),
      ]);
      setUserInvites(uData);
      setEventInvites(eData);
    } catch (err) {
      console.error('Failed to fetch invitations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvites();
  }, []);

  const handleResendUserInvite = async (id: string) => {
    try {
      await invitationsApi.resendInvite(id);
      alert('Invitation email resent with refreshed 7-day expiry!');
      fetchInvites();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to resend invitation.');
    }
  };

  const handleRevokeUserInvite = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this invitation link?')) return;
    try {
      await invitationsApi.revokeInvite(id);
      fetchInvites();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to revoke invitation.');
    }
  };

  const copyToClipboard = (text?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    alert('Link copied to clipboard!');
  };

  const handleGateScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanTokenInput.trim()) return;
    setScanning(true);
    setScanResultMsg(null);

    try {
      const res = await invitationsApi.checkInGuest(scanTokenInput.trim());
      setScanResultMsg({ success: true, msg: res.message });
      setScanTokenInput('');
      fetchInvites();
    } catch (err: any) {
      setScanResultMsg({ success: false, msg: err.response?.data?.detail || 'Check-in scan failed. Token invalid.' });
    } finally {
      setScanning(false);
    }
  };

  const handleExportExcel = async () => {
    const XLSX = await import('xlsx');
    if (activeTab === 'team') {
      const rows = userInvites.map((inv) => ({
        Email: inv.email,
        FullName: inv.full_name || '',
        Phone: inv.phone || '',
        Role: inv.role_name,
        Status: inv.status,
        ExpiresAt: new Date(inv.expires_at).toLocaleString(),
        ShareableLink: inv.shareable_url || '',
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Team_Invitations');
      XLSX.writeFile(wb, 'Hissob_Team_Invitations.xlsx');
    } else {
      const rows = eventInvites.map((inv) => ({
        EventTitle: inv.title,
        GuestName: inv.guest_name,
        VIPTier: inv.vip_tier,
        RSVPStatus: inv.rsvp_status,
        Headcount: inv.guests_count,
        SpecialRequests: inv.special_requests || '',
        CheckedIn: inv.checked_in ? 'YES' : 'NO',
        CheckedInTime: inv.checked_in_at ? new Date(inv.checked_in_at).toLocaleString() : '',
        PatrikaURL: inv.rsvp_url || '',
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Event_VIP_Patrikas');
      XLSX.writeFile(wb, 'Hissob_Event_VIP_RSVP_Roster.xlsx');
    }
  };

  const filteredUserInvites = userInvites.filter((inv) => {
    const matchesSearch =
      inv.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.full_name && inv.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      inv.role_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredEventInvites = eventInvites.filter((inv) => {
    const matchesSearch =
      inv.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.guest_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.guest_email && inv.guest_email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || inv.rsvp_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate Metrics
  const pendingCount = userInvites.filter((i) => i.status === 'pending').length;
  const acceptedCount = userInvites.filter((i) => i.status === 'accepted').length;
  const attendingRsvpCount = eventInvites.filter((i) => i.rsvp_status === 'attending').length;

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', color: 'var(--color-text-primary)' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 900, color: 'var(--color-text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Mail style={{ color: '#2563EB' }} /> Invitations & VIP RSVP Suite
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', margin: '4px 0 0 0' }}>
            Manage team member invitations, bulk volunteer onboarding, and digital festival patrika cards
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          <button
            onClick={() => setShowInviteModal(true)}
            style={{ padding: '10px 18px', background: '#2563EB', color: '#FFF', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(37,99,235,0.2)' }}
          >
            <UserPlus size={16} /> Invite Member / Volunteer
          </button>
          <button
            onClick={() => setShowBulkModal(true)}
            style={{ padding: '10px 18px', background: 'var(--color-bg-card)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}
          >
            <Upload size={16} /> Bulk Onboard
          </button>
          <button
            onClick={() => setShowPatrikaModal(true)}
            style={{ padding: '10px 18px', background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)', color: '#FFF', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(124,58,237,0.25)' }}
          >
            <Sparkles size={16} style={{ color: '#FDE047' }} /> New Digital Patrika
          </button>
          <button
            onClick={() => setShowScannerModal(true)}
            style={{ padding: '10px 18px', background: '#10B981', color: '#FFF', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(16,185,129,0.2)' }}
          >
            <QrCode size={16} /> Gate Check-In Scanner
          </button>
          <button
            onClick={handleExportExcel}
            style={{ padding: '10px 16px', background: '#059669', color: '#FFF', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(5,150,105,0.2)' }}
          >
            <FileSpreadsheet size={16} /> Export Excel
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div style={{ background: 'var(--color-bg-card)', borderRadius: '16px', padding: '18px 20px', border: '1px solid var(--color-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(245,158,11,0.12)', color: '#D97706' }}>
            <Clock size={24} />
          </div>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Pending Onboarding Invites</span>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--color-text-primary)' }}>{pendingCount}</div>
          </div>
        </div>

        <div style={{ background: 'var(--color-bg-card)', borderRadius: '16px', padding: '18px 20px', border: '1px solid var(--color-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(34,197,94,0.12)', color: '#16A34A' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Accepted Team Accounts</span>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--color-text-primary)' }}>{acceptedCount}</div>
          </div>
        </div>

        <div style={{ background: 'var(--color-bg-card)', borderRadius: '16px', padding: '18px 20px', border: '1px solid var(--color-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(124,58,237,0.12)', color: '#7C3AED' }}>
            <Crown size={24} />
          </div>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Attending VIP Guests</span>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--color-text-primary)' }}>{attendingRsvpCount}</div>
          </div>
        </div>
      </div>

      {/* Tabs Bar & Filters */}
      <div style={{ background: 'var(--color-bg-card)', borderRadius: '20px', border: '1px solid var(--color-border)', padding: '20px', marginBottom: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          {/* Navigation Tabs */}
          <div style={{ display: 'flex', background: 'var(--color-bg)', padding: '4px', borderRadius: '14px', border: '1px solid var(--color-border)' }}>
            <button
              onClick={() => setActiveTab('team')}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                border: 'none',
                background: activeTab === 'team' ? '#2563EB' : 'transparent',
                color: activeTab === 'team' ? '#FFF' : 'var(--color-text-secondary)',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Users size={16} /> Team & Volunteer Invites ({userInvites.length})
            </button>
            <button
              onClick={() => setActiveTab('events')}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                border: 'none',
                background: activeTab === 'events' ? '#7C3AED' : 'transparent',
                color: activeTab === 'events' ? '#FFF' : 'var(--color-text-secondary)',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Sparkles size={16} style={{ color: activeTab === 'events' ? '#FDE047' : '#7C3AED' }} /> Digital Event Patrikas ({eventInvites.length})
            </button>
          </div>

          {/* Search & Status Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ position: 'relative', minWidth: '240px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94A3B8' }} />
              <input
                type="text"
                placeholder="Search invites or guests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '9px 12px 9px 38px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '10px', color: 'var(--color-text-primary)', fontSize: '13px', outline: 'none' }}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '9px 12px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '10px', color: 'var(--color-text-primary)', fontSize: '13px', outline: 'none' }}
            >
              <option value="all">All Statuses</option>
              {activeTab === 'team' ? (
                <>
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="expired">Expired</option>
                  <option value="revoked">Revoked</option>
                </>
              ) : (
                <>
                  <option value="attending">Attending</option>
                  <option value="pending">Pending RSVP</option>
                  <option value="maybe">Maybe</option>
                  <option value="declined">Declined</option>
                </>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Tables */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-secondary)' }}>
          <Loader2 className="animate-spin" size={36} style={{ color: '#2563EB', margin: '0 auto 12px' }} />
          <p>Loading invitations list...</p>
        </div>
      ) : activeTab === 'team' ? (
        <div style={{ background: 'var(--color-bg-card)', borderRadius: '20px', border: '1px solid var(--color-border)', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          {filteredUserInvites.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--color-text-secondary)' }}>
              <AlertCircle size={40} style={{ margin: '0 auto 12px', color: '#94A3B8' }} />
              <h4 style={{ color: 'var(--color-text-primary)', fontSize: '16px', fontWeight: 700 }}>No Team Invitations Found</h4>
              <p style={{ fontSize: '13px' }}>Click "Invite Member / Volunteer" to dispatch your first tokenized invitation link.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                  <th style={{ padding: '14px 20px', fontWeight: 700 }}>RECIPIENT & ROLE</th>
                  <th style={{ padding: '14px 20px', fontWeight: 700 }}>STATUS</th>
                  <th style={{ padding: '14px 20px', fontWeight: 700 }}>EXPIRATION</th>
                  <th style={{ padding: '14px 20px', fontWeight: 700 }}>SHAREABLE LINK & WHATSAPP</th>
                  <th style={{ padding: '14px 20px', fontWeight: 700, textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredUserInvites.map((inv) => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--color-text-primary)', fontSize: '14px' }}>{inv.full_name || 'Unnamed Recipient'}</div>
                      <div style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>{inv.email}</div>
                      <span style={{ display: 'inline-block', marginTop: '4px', background: 'rgba(37,99,235,0.15)', color: '#60A5FA', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, textTransform: 'capitalize' }}>
                        {inv.role_name}
                      </span>
                    </td>

                    <td style={{ padding: '16px 20px' }}>
                      {inv.status === 'pending' && (
                        <span style={{ background: 'rgba(245,158,11,0.12)', color: '#D97706', border: '1px solid #F59E0B', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
                          ⏳ Pending
                        </span>
                      )}
                      {inv.status === 'accepted' && (
                        <span style={{ background: 'rgba(34,197,94,0.12)', color: '#16A34A', border: '1px solid #22C55E', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
                          ✓ Accepted
                        </span>
                      )}
                      {inv.status === 'expired' && (
                        <span style={{ background: 'rgba(239,68,68,0.12)', color: '#DC2626', border: '1px solid #EF4444', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
                          Expired
                        </span>
                      )}
                      {inv.status === 'revoked' && (
                        <span style={{ background: 'rgba(100,116,139,0.12)', color: '#64748B', border: '1px solid #94A3B8', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
                          Revoked
                        </span>
                      )}
                    </td>

                    <td style={{ padding: '16px 20px', color: 'var(--color-text-secondary)' }}>
                      {new Date(inv.expires_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>

                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          onClick={() => copyToClipboard(inv.shareable_url)}
                          title="Copy Invitation Link"
                          style={{ padding: '6px 10px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: '#3B82F6', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Copy size={14} /> Copy Link
                        </button>
                        {inv.whatsapp_link && (
                          <a
                            href={inv.whatsapp_link}
                            target="_blank"
                            rel="noreferrer"
                            title="Share on WhatsApp"
                            style={{ padding: '6px 10px', background: 'rgba(37,211,102,0.12)', border: '1px solid #25D366', color: '#16A34A', borderRadius: '8px', textDecoration: 'none', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Share2 size={14} /> WhatsApp
                          </a>
                        )}
                      </div>
                    </td>

                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                        {inv.status === 'pending' || inv.status === 'expired' ? (
                          <button
                            onClick={() => handleResendUserInvite(inv.id)}
                            title="Resend Invite"
                            style={{ padding: '6px 10px', background: '#2563EB', color: '#FFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <RefreshCw size={14} /> Resend
                          </button>
                        ) : null}

                        {inv.status === 'pending' ? (
                          <button
                            onClick={() => handleRevokeUserInvite(inv.id)}
                            title="Revoke Invite"
                            style={{ padding: '6px 10px', background: 'rgba(239,68,68,0.1)', color: '#DC2626', border: '1px solid #EF4444', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Ban size={14} /> Revoke
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        /* Event Patrikas & RSVP Tracker Table */
        <div style={{ background: 'var(--color-bg-card)', borderRadius: '20px', border: '1px solid var(--color-border)', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          {filteredEventInvites.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--color-text-secondary)' }}>
              <Sparkles size={40} style={{ margin: '0 auto 12px', color: '#7C3AED' }} />
              <h4 style={{ color: 'var(--color-text-primary)', fontSize: '16px', fontWeight: 700 }}>No Digital Event Patrikas Generated</h4>
              <p style={{ fontSize: '13px' }}>Click "New Digital Patrika" to create VIP invitation cards for your donors and guests.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                  <th style={{ padding: '14px 20px', fontWeight: 700 }}>EVENT & VIP GUEST</th>
                  <th style={{ padding: '14px 20px', fontWeight: 700 }}>RSVP STATUS</th>
                  <th style={{ padding: '14px 20px', fontWeight: 700 }}>ATTENDEES COUNT</th>
                  <th style={{ padding: '14px 20px', fontWeight: 700 }}>CHECK-IN PASS</th>
                  <th style={{ padding: '14px 20px', fontWeight: 700, textAlign: 'right' }}>PATRIKA URL</th>
                </tr>
              </thead>
              <tbody>
                {filteredEventInvites.map((inv) => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--color-text-primary)', fontSize: '14px' }}>{inv.guest_name}</div>
                      <div style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>{inv.title}</div>
                      <span style={{ display: 'inline-block', marginTop: '4px', background: 'rgba(124,58,237,0.15)', color: '#A855F7', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
                        ✨ {inv.vip_tier}
                      </span>
                    </td>

                    <td style={{ padding: '16px 20px' }}>
                      {inv.rsvp_status === 'attending' && (
                        <span style={{ background: 'rgba(34,197,94,0.12)', color: '#16A34A', border: '1px solid #22C55E', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
                          ✓ Attending
                        </span>
                      )}
                      {inv.rsvp_status === 'pending' && (
                        <span style={{ background: 'rgba(245,158,11,0.12)', color: '#D97706', border: '1px solid #F59E0B', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
                          Pending RSVP
                        </span>
                      )}
                      {inv.rsvp_status === 'maybe' && (
                        <span style={{ background: 'rgba(37,99,235,0.12)', color: '#2563EB', border: '1px solid #3B82F6', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
                          Maybe
                        </span>
                      )}
                      {inv.rsvp_status === 'declined' && (
                        <span style={{ background: 'rgba(239,68,68,0.12)', color: '#DC2626', border: '1px solid #EF4444', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
                          Declined
                        </span>
                      )}
                    </td>

                    <td style={{ padding: '16px 20px', color: 'var(--color-text-primary)', fontWeight: 700 }}>
                      {inv.guests_count} Guests
                    </td>

                    <td style={{ padding: '16px 20px' }}>
                      {inv.checked_in ? (
                        <span style={{ color: '#16A34A', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={16} /> Checked In ({new Date(inv.checked_in_at!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                        </span>
                      ) : (
                        <span style={{ color: '#94A3B8', fontSize: '12px' }}>Not scanned yet</span>
                      )}
                    </td>

                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <button
                        onClick={() => copyToClipboard(inv.rsvp_url)}
                        style={{ padding: '6px 12px', background: '#7C3AED', color: '#FFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Copy size={14} /> Copy RSVP URL
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Gate Scanner Modal */}
      {showScannerModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ maxWidth: '480px', width: '100%', background: 'var(--color-bg-card)', borderRadius: '24px', border: '1px solid var(--color-border)', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #059669 0%, #064E3B 100%)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ScanLine size={20} /> Gate Check-In Scanner
              </h3>
              <button onClick={() => { setShowScannerModal(false); setScanResultMsg(null); }} style={{ background: 'none', border: 'none', color: '#FFF', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              {scanResultMsg && (
                <div style={{ background: scanResultMsg.success ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', border: scanResultMsg.success ? '1px solid #22C55E' : '1px solid #EF4444', color: scanResultMsg.success ? '#16A34A' : '#DC2626', padding: '14px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, marginBottom: '20px', textAlign: 'center' }}>
                  {scanResultMsg.msg}
                </div>
              )}

              <form onSubmit={handleGateScanSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', color: 'var(--color-text-primary)', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    Enter or Scan Guest Ticket Pass Token:
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={scanTokenInput}
                    onChange={(e) => setScanTokenInput(e.target.value)}
                    placeholder="e.g. PASS_TOKEN_STRING"
                    />
                </div>

                <button
                  type="submit"
                  disabled={scanning}
                  style={{ padding: '12px', background: '#10B981', color: '#FFF', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: scanning ? 'not-allowed' : 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  {scanning ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />} Verify & Complete Check-In
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Render Modals */}
      <InviteUserModal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} onSuccess={() => { fetchInvites(); setShowInviteModal(false); }} />
      <BulkInviteModal isOpen={showBulkModal} onClose={() => setShowBulkModal(false)} onSuccess={() => { fetchInvites(); setShowBulkModal(false); }} />
      <DigitalPatrikaBuilder isOpen={showPatrikaModal} onClose={() => setShowPatrikaModal(false)} onSuccess={() => { fetchInvites(); setShowPatrikaModal(false); }} />
    </div>
  );
};
