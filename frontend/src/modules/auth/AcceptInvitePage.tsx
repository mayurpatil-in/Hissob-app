import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { invitationsApi, type PublicVerifyInviteResponse } from '../../api/invitations';
import { useAuthStore } from '../../store/authStore';
import { CheckCircle2, AlertTriangle, UserCheck, Lock, Phone, User, ArrowRight, Loader2 } from 'lucide-react';
import './login.css';

export const AcceptInvitePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [loading, setLoading] = useState(true);
  const [verifyData, setVerifyData] = useState<PublicVerifyInviteResponse | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setVerifyData({ valid: false, error: 'No invitation token found in URL.' });
      return;
    }

    invitationsApi
      .verifyPublicToken(token)
      .then((res) => {
        setVerifyData(res);
        if (res.full_name) setFullName(res.full_name);
      })
      .catch((err) => {
        setVerifyData({
          valid: false,
          error: err.response?.data?.detail || 'Failed to verify invitation token.',
        });
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await invitationsApi.acceptInvite({
        token,
        full_name: fullName,
        password,
        phone,
      });

      // Save tokens and user in Zustand store
      setAuth(res.access_token, res.refresh_token, res.user);

      // Redirect to dashboard
      navigate('/dashboard');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to accept invitation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="login-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0F172A' }}>
        <div style={{ textAlign: 'center', color: '#94A3B8' }}>
          <Loader2 className="animate-spin" size={42} style={{ color: '#3B82F6', margin: '0 auto 16px' }} />
          <p style={{ fontSize: '15px', fontWeight: 600 }}>Verifying secure invitation link...</p>
        </div>
      </div>
    );
  }

  if (!verifyData?.valid) {
    return (
      <div className="login-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0F172A', padding: '20px' }}>
        <div style={{ maxWidth: '460px', width: '100%', background: '#1E293B', borderRadius: '24px', border: '1px solid #334155', padding: '36px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239,68,68,0.15)', border: '1px solid #EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <AlertTriangle size={32} style={{ color: '#F87171' }} />
          </div>
          <h2 style={{ color: '#F8FAFC', fontSize: '22px', fontWeight: 800, marginBottom: '10px' }}>Invalid Invitation Link</h2>
          <p style={{ color: '#94A3B8', fontSize: '14px', lineHeight: 1.6, marginBottom: '28px' }}>
            {verifyData?.error || 'This invitation link is invalid, revoked, or has expired.'}
          </p>
          <button
            onClick={() => navigate('/login')}
            style={{ width: '100%', padding: '14px', background: '#2563EB', color: '#FFF', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            Go to Login <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0F172A', padding: '24px 16px' }}>
      <div style={{ maxWidth: '520px', width: '100%', background: '#1E293B', borderRadius: '24px', border: '1px solid #334155', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)', padding: '32px 28px', textAlign: 'center', borderBottom: '1px solid #334155' }}>
          {verifyData.logo_url && (
            <img
              src={verifyData.logo_url}
              alt="Org Logo"
              style={{ height: '48px', maxWidth: '140px', objectFit: 'contain', marginBottom: '14px', background: '#FFF', padding: '4px 10px', borderRadius: '10px' }}
            />
          )}
          <h2 style={{ color: '#F8FAFC', fontSize: '24px', fontWeight: 800, margin: '0 0 6px 0' }}>{verifyData.org_name}</h2>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(59,130,246,0.15)', border: '1px solid #3B82F6', color: '#60A5FA', padding: '4px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>
            <UserCheck size={14} /> Assigned Role: {verifyData.role_name}
          </div>
        </div>

        {/* Content Body */}
        <div style={{ padding: '28px' }}>
          {verifyData.custom_note && (
            <div style={{ background: 'rgba(15,23,42,0.6)', borderLeft: '4px solid #3B82F6', borderRadius: '8px', padding: '14px 16px', marginBottom: '24px' }}>
              <span style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700 }}>Note from Administrator:</span>
              <p style={{ margin: '4px 0 0 0', color: '#CBD5E1', fontStyle: 'italic', fontSize: '14px' }}>"{verifyData.custom_note}"</p>
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <span style={{ color: '#94A3B8', fontSize: '13px' }}>Invited Email:</span>
            <div style={{ color: '#F8FAFC', fontWeight: 700, fontSize: '16px', marginTop: '2px' }}>{verifyData.email}</div>
          </div>

          {errorMsg && (
            <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid #EF4444', color: '#F87171', padding: '12px 16px', borderRadius: '10px', fontSize: '14px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle size={18} /> {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', color: '#CBD5E1', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Full Name <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: '#64748B' }} />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  style={{ width: '100%', padding: '12px 14px 12px 42px', background: '#0F172A', border: '1px solid #334155', borderRadius: '12px', color: '#FFF', fontSize: '14px', outline: 'none' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', color: '#CBD5E1', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Phone Number (Optional)</label>
              <div style={{ position: 'relative' }}>
                <Phone size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: '#64748B' }} />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 9876543210"
                  style={{ width: '100%', padding: '12px 14px 12px 42px', background: '#0F172A', border: '1px solid #334155', borderRadius: '12px', color: '#FFF', fontSize: '14px', outline: 'none' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', color: '#CBD5E1', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Set Account Password <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: '#64748B' }} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  style={{ width: '100%', padding: '12px 14px 12px 42px', background: '#0F172A', border: '1px solid #334155', borderRadius: '12px', color: '#FFF', fontSize: '14px', outline: 'none' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', color: '#CBD5E1', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Confirm Password <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: '#64748B' }} />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  style={{ width: '100%', padding: '12px 14px 12px 42px', background: '#0F172A', border: '1px solid #334155', borderRadius: '12px', color: '#FFF', fontSize: '14px', outline: 'none' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%',
                padding: '14px',
                marginTop: '10px',
                background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '15px',
                cursor: submitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 10px 20px -5px rgba(37,99,235,0.4)',
              }}
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" size={18} /> Setting up account...
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} /> Accept Invitation & Access Dashboard
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
