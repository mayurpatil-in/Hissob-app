import React, { useState } from 'react';
import { invitationsApi, type UserInvite } from '../../api/invitations';
import { X, Upload, Users, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

interface BulkInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (invites: UserInvite[]) => void;
}

export const BulkInviteModal: React.FC<BulkInviteModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [rawText, setRawText] = useState('');
  const [defaultRole, setDefaultRole] = useState('volunteer');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [summary, setSummary] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSummary(null);

    // Parse CSV or lines formatted as: email, name, phone
    const lines = rawText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length === 0) {
      setErrorMsg('Please enter or paste at least one email line.');
      return;
    }

    const invitations = lines.map((line) => {
      const parts = line.split(',').map((p) => p.trim());
      return {
        email: parts[0],
        full_name: parts[1] || undefined,
        phone: parts[2] || undefined,
        role_name: defaultRole,
        custom_note: 'Bulk onboarded team invitation',
      };
    });

    setSubmitting(true);
    try {
      const results = await invitationsApi.bulkSendInvites(invitations);
      setSummary(`Successfully created and dispatched ${results.length} invitations!`);
      onSuccess(results);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to dispatch bulk invitations.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ maxWidth: '600px', width: '100%', background: '#1E293B', borderRadius: '24px', border: '1px solid #334155', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
        <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ color: '#F8FAFC', fontSize: '18px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={20} style={{ color: '#3B82F6' }} /> Bulk Volunteer & Team Onboarding
            </h3>
            <p style={{ color: '#94A3B8', fontSize: '12px', margin: '2px 0 0 0' }}>Paste email addresses or CSV lines to send batch invites</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          {summary ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <CheckCircle2 size={48} style={{ color: '#4ADE80', margin: '0 auto 12px' }} />
              <h4 style={{ color: '#F8FAFC', fontSize: '18px', fontWeight: 800 }}>Batch Complete</h4>
              <p style={{ color: '#94A3B8', fontSize: '14px', marginBottom: '24px' }}>{summary}</p>
              <button onClick={onClose} style={{ padding: '12px 28px', background: '#2563EB', color: '#FFF', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleBulkSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {errorMsg && (
                <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid #EF4444', color: '#F87171', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={16} /> {errorMsg}
                </div>
              )}

              <div>
                <label style={{ display: 'block', color: '#CBD5E1', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Default Role for Batch</label>
                <select
                  value={defaultRole}
                  onChange={(e) => setDefaultRole(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', background: '#0F172A', border: '1px solid #334155', borderRadius: '10px', color: '#FFF', fontSize: '13px', outline: 'none' }}
                >
                  <option value="member">Organization Member</option>
                  <option value="collector">Donation Collector</option>
                  <option value="treasurer">Treasurer / Accountant</option>
                  <option value="trustee">Trustee / Committee Member</option>
                  <option value="volunteer">Volunteer / Helper</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', color: '#CBD5E1', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Paste Email List or CSV Data (One entry per line):
                </label>
                <span style={{ display: 'block', color: '#64748B', fontSize: '11px', marginBottom: '6px' }}>
                  Format: <code>email, Full Name, Phone</code> (e.g. <code>rahul@gmail.com, Rahul Sharma, 9876543210</code>)
                </span>
                <textarea
                  rows={6}
                  required
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="volunteer1@gmail.com, Rahul Sharma&#10;volunteer2@gmail.com, Priya Patel&#10;volunteer3@gmail.com"
                  style={{ width: '100%', padding: '12px', background: '#0F172A', border: '1px solid #334155', borderRadius: '12px', color: '#FFF', fontSize: '13px', fontFamily: 'monospace', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={onClose} style={{ padding: '10px 18px', background: '#334155', color: '#FFF', border: 'none', borderRadius: '10px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '10px 22px', background: '#2563EB', color: '#FFF', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {submitting ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />} Dispatch Batch Invites
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
