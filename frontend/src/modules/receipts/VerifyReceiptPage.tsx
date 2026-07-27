import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { verifyPublicReceipt } from '../../api/services';
import { Result, Card, Button, Typography, Spin, Divider, Tag } from 'antd';
import { CheckCircleFilled, CloseCircleFilled, PrinterOutlined, SafetyCertificateFilled } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const VerifyReceiptPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, isError, error } = useQuery<any, Error>({
    queryKey: ['verifyReceipt', id],
    queryFn: () => verifyPublicReceipt(id!),
    enabled: !!id,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc' }}>
        <Spin size="large" tip="Verifying Receipt..." />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', padding: 20 }}>
        <Card style={{ maxWidth: 420, width: '100%', margin: '20px', borderRadius: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.05)', border: 'none' }}>
          <Result
            status="error"
            title={<span style={{ fontWeight: 800 }}>Verification Failed</span>}
            subTitle={<span style={{ color: '#64748b', fontSize: 15 }}>{error?.message || "The receipt you are trying to verify does not exist or has been deleted."}</span>}
            extra={[
              <Button type="primary" size="large" style={{ borderRadius: 12, height: 48, fontWeight: 600, padding: '0 32px' }} key="home" onClick={() => navigate('/')}>
                Back to Home
              </Button>
            ]}
          />
        </Card>
      </div>
    );
  }

  const isCancelled = data.status === 'cancelled';

  return (
    <div style={{ 
      display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', 
      background: 'linear-gradient(-45deg, #f0fdf4, #dcfce3, #f8fafc, #e2e8f0)',
      backgroundSize: '400% 400%',
      animation: 'gradientBG 15s ease infinite',
      padding: 16 
    }}>
      <style>
        {`
          @keyframes gradientBG {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          @keyframes pulse-glow {
            0% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.4); transform: scale(1); }
            50% { transform: scale(1.05); }
            70% { box-shadow: 0 0 0 20px rgba(22, 163, 74, 0); transform: scale(1); }
            100% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0); transform: scale(1); }
          }
          @keyframes float-badge {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-4px); }
            100% { transform: translateY(0px); }
          }
          .verified-icon {
            border-radius: 50%;
            animation: pulse-glow 2.5s infinite;
          }
          .glass-card {
            background: rgba(255, 255, 255, 0.85) !important;
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.3) !important;
          }
          .receipt-row {
            padding: 12px 0;
            border-bottom: 1px dashed rgba(0,0,0,0.06);
          }
          .receipt-row:last-child {
            border-bottom: none;
          }
          .donor-name-val {
            text-align: right;
            word-break: break-word;
            padding-left: 12px;
            flex: 1;
          }
          @media (max-width: 380px) {
            .glass-card { border-radius: 16px !important; }
            .header-padding { padding: 20px 16px 16px !important; }
            .body-padding { padding: 16px !important; }
            .amount-title { font-size: 36px !important; }
            .verified-icon { font-size: 50px !important; }
            .verified-title { font-size: 20px !important; }
            .receipt-row { font-size: 13px !important; }
          }
        `}
      </style>
      <Card 
        className="glass-card"
        style={{ 
          maxWidth: 400, 
          width: '100%', 
          borderRadius: 24, 
          boxShadow: '0 20px 40px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.05)',
          overflow: 'hidden',
          marginBottom: 20
        }}
        bodyStyle={{ padding: 0 }}
      >
        <div className="header-padding" style={{ 
          background: isCancelled ? 'linear-gradient(135deg, #fee2e2, #fca5a5)' : 'linear-gradient(135deg, #15803d 0%, #16a34a 100%)', 
          padding: '30px 20px 24px', 
          textAlign: 'center',
          color: isCancelled ? '#991b1b' : '#fff',
          position: 'relative'
        }}>
          {/* Subtle pattern overlay */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.15, backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '12px 12px' }}></div>
          
          <div style={{ position: 'relative', zIndex: 1 }}>
            {isCancelled ? (
              <CloseCircleFilled className="verified-icon" style={{ fontSize: 60, marginBottom: 12, color: '#dc2626' }} />
            ) : (
              <CheckCircleFilled className="verified-icon" style={{ fontSize: 60, marginBottom: 12, color: '#fff', background: '#16a34a' }} />
            )}
            <Title className="verified-title" level={3} style={{ color: isCancelled ? '#991b1b' : '#fff', margin: 0, fontWeight: 900, letterSpacing: '0.5px', fontSize: 22 }}>
            {isCancelled ? 'Receipt Cancelled' : 'Verified Authentic'}
          </Title>
          <Text style={{ color: isCancelled ? '#991b1b' : '#dcfce3', opacity: 0.9, fontSize: 14, fontWeight: 500, display: 'block', marginTop: 4 }}>
            <SafetyCertificateFilled style={{ marginRight: 4 }} /> Issued by {data.org_name}
          </Text>
          </div>
        </div>

        <div className="body-padding" style={{ padding: '24px 20px', position: 'relative' }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            {data.org_logo_url && (
              <img src={data.org_logo_url} alt="Org Logo" style={{ height: 60, width: 60, borderRadius: 12, marginBottom: 12, objectFit: 'cover', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
            )}
            <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Donation Amount</div>
            <Title className="amount-title" level={1} style={{ margin: 0, color: '#0f172a', fontWeight: 900, fontSize: 42 }}>
              ₹{Number(data.amount).toLocaleString('en-IN')}
            </Title>
            <Tag color={data.payment_mode === 'cash' ? 'green' : 'blue'} style={{ marginTop: 12, padding: '4px 16px', borderRadius: 20, fontWeight: 700, fontSize: 13, border: 'none' }}>
              {data.payment_mode.toUpperCase()}
            </Tag>
          </div>

          <div style={{ background: 'rgba(241, 245, 249, 0.5)', borderRadius: 16, padding: '8px 16px', marginBottom: 20 }}>
            <div className="receipt-row" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text style={{ color: '#64748b', fontWeight: 500, flexShrink: 0 }}>Receipt No.</Text>
              <Text strong style={{ color: '#1e293b' }}>{data.receipt_number}</Text>
            </div>
            <div className="receipt-row" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text style={{ color: '#64748b', fontWeight: 500, flexShrink: 0 }}>Date</Text>
              <Text strong style={{ color: '#1e293b' }}>{dayjs(data.receipt_date).format('DD MMM YYYY')}</Text>
            </div>
            <div className="receipt-row" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text style={{ color: '#64748b', fontWeight: 500, flexShrink: 0 }}>Donor Name</Text>
              <Text strong className="donor-name-val" style={{ color: '#1e293b' }}>{data.donor_name}</Text>
            </div>
            {data.purpose && (
              <div className="receipt-row" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text style={{ color: '#64748b', fontWeight: 500, flexShrink: 0 }}>Purpose</Text>
                <Text strong className="donor-name-val" style={{ color: '#1e293b' }}>{data.purpose}</Text>
              </div>
            )}
            {data.transaction_ref && (
              <div className="receipt-row" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text style={{ color: '#64748b', fontWeight: 500, flexShrink: 0 }}>Ref / UTR</Text>
                <Text strong style={{ color: '#1e293b' }}>{data.transaction_ref}</Text>
              </div>
            )}
          </div>

          <Divider dashed style={{ borderColor: '#cbd5e1' }} />
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'inline-block', background: '#f8fafc', padding: '6px 16px', borderRadius: 20, border: '1px solid #e2e8f0', marginBottom: 20 }}>
              <Text style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                Verified at {dayjs(data.verified_at).format('DD MMM YYYY, hh:mm A')}
              </Text>
            </div>
            <div>
              <Button type="primary" block size="large" onClick={() => window.print()} icon={<PrinterOutlined />} 
                style={{ 
                  height: 48, borderRadius: 12, fontWeight: 700, fontSize: 15,
                  background: 'linear-gradient(135deg, #0f172a, #1e293b)', 
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)'
                }}>
                Print Details
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <div style={{ textAlign: 'center', fontSize: 12, color: '#64748b', marginTop: 10 }}>
        Powered By <a href="https://hisob.in" target="_blank" rel="noopener noreferrer" style={{ color: '#16a34a', fontWeight: 700 }}>Hisob.in</a><br/>
        Developed by <a href="https://mayurpatil.in" target="_blank" rel="noopener noreferrer" style={{ color: '#0f172a', fontWeight: 600 }}>mayurpatil.in</a>
      </div>
    </div>
  );
};

export default VerifyReceiptPage;
