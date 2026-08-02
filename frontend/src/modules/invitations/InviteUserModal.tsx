import React, { useState } from 'react';
import { invitationsApi, type UserInvite } from '../../api/invitations';
import { X, Send, Mail, User, Shield, FileText, CheckCircle2, Copy, Share2, Loader2 } from 'lucide-react';

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (invite: UserInvite) => void;
}

export const InviteUserModal: React.FC<InviteUserModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone] = useState('');
  const [roleName, setRoleName] = useState('collector');
  const [customNote, setCustomNote] = useState('');
  const [expiresInDays] = useState(7);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [createdInvite, setCreatedInvite] = useState<UserInvite | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');

    try {
      const invite = await invitationsApi.sendInvite({
        email,
        full_name: fullName,
        phone,
        role_name: roleName,
        custom_note: customNote,
        expires_in_days: expiresInDays,
      });

      setCreatedInvite(invite);
      onSuccess(invite);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to dispatch invitation.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Invitation URL copied to clipboard!');
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ maxWidth: '540px', width: '100%', background: '#1E293B', borderRadius: '24px', border: '1px solid #334155', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
        
        {/* Modal Header */}
        <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ color: '#F8FAFC', fontSize: '18px', fontWeight: 800, margin: 0 }}>Invite Team Member / Volunteer</h3>
            <p style={{ color: '#94A3B8', fontSize: '12px', margin: '2px 0 0 0' }}>Send secure tokenized onboarding invitation link</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px' }}>
          {createdInvite ? (
            <div style={{ textAlign: 'center' }}>
              <CheckCircle2 size={48} style={{ color: '#4ADE80', margin: '0 auto 12px' }} />
              <h4 style={{ color: '#F8FAFC', fontSize: '18px', fontWeight: 800, margin: '0 0 4px 0' }}>Invitation Sent Successfully!</h4>
              <p style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '20px' }}>
                An invitation email has been sent to <strong>{createdInvite.email}</strong>. You can also copy or share the direct link below.
              </p>

              <div style={{ background: '#0F172A', border: '1px solid #334155', borderRadius: '12px', padding: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="text"
                  readOnly
                  value={createdInvite.shareable_url}
                  style={{ flex: 1, background: 'none', border: 'none', color: '#60A5FA', fontSize: '13px', outline: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(createdInvite.shareable_url || '')}
                  style={{ padding: '8px 12px', background: '#2563EB', color: '#FFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Copy size={14} /> Copy
                </button>
              </div>

              {createdInvite.whatsapp_link && (
                <a
                  href={createdInvite.whatsapp_link}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 20px', background: '#25D366', color: '#FFF', textDecoration: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '14px', marginBottom: '16px' }}
                >
                  <Share2 size={16} /> Share via WhatsApp Link
                </a>
              )}

              <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => {
                    setCreatedInvite(null);
                    setEmail('');
                    setFullName('');
                  }}
                  style={{ flex: 1, padding: '12px', background: '#334155', color: '#FFF', border: 'none', borderRadius: '10px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Invite Another
                </button>
                <button
                  onClick={onClose}
                  style={{ flex: 1, padding: '12px', background: '#2563EB', color: '#FFF', border: 'none', borderRadius: '10px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {errorMsg && (
                <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid #EF4444', color: '#F87171', padding: '10px 14px', borderRadius: '10px', fontSize: '13px' }}>
                  {errorMsg}
                </div>
              )}

              <div>
                <label style={{ display: 'block', color: '#CBD5E1', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Email Address <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#64748B' }} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    style={{ width: '100%', padding: '10px 12px 10px 38px', background: '#0F172A', border: '1px solid #334155', borderRadius: '10px', color: '#FFF', fontSize: '13px', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', color: '#CBD5E1', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Full Name (Optional)</label>
                  <div style={{ position: 'relative' }}>
                    <User size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#64748B' }} />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Ramesh Kumar"
                      style={{ width: '100%', padding: '10px 12px 10px 38px', background: '#0F172A', border: '1px solid #334155', borderRadius: '10px', color: '#FFF', fontSize: '13px', outline: 'none' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', color: '#CBD5E1', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Assign RBAC Role</label>
                  <div style={{ position: 'relative' }}>
                    <Shield size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#64748B' }} />
                    <select
                      value={roleName}
                      onChange={(e) => setRoleName(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px 10px 38px', background: '#0F172A', border: '1px solid #334155', borderRadius: '10px', color: '#FFF', fontSize: '13px', outline: 'none' }}
                    >
                      <option value="member">Organization Member</option>
                      <option value="collector">Donation Collector</option>
                      <option value="treasurer">Treasurer / Accountant</option>
                      <option value="trustee">Trustee / Committee Head</option>
                      <option value="volunteer">Volunteer / Helper</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', color: '#CBD5E1', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Personal Note / Instructions</label>
                <div style={{ position: 'relative' }}>
                  <FileText size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#64748B' }} />
                  <textarea
                    rows={2}
                    value={customNote}
                    onChange={(e) => setCustomNote(e.target.value)}
                    placeholder="e.g. Welcome to Ganesh Utsav 2026 organizing team!"
                    style={{ width: '100%', padding: '10px 12px 10px 38px', background: '#0F172A', border: '1px solid #334155', borderRadius: '10px', color: '#FFF', fontSize: '13px', outline: 'none', resize: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{ padding: '10px 18px', background: '#334155', color: '#FFF', border: 'none', borderRadius: '10px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '10px 22px', background: '#2563EB', color: '#FFF', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {submitting ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />} Dispatch Invitation
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
