import React, { useState } from 'react';
import {
  Drawer, Row, Col, Card, Typography, Tag, Table, Button, Space, Spin, Empty, Tooltip
} from 'antd';
import {
  PhoneOutlined, MailOutlined, HomeOutlined,
  CrownOutlined, SafetyCertificateOutlined, PrinterOutlined,
  WhatsAppOutlined, DownloadOutlined
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getDonorSummary, getMyOrganization } from '../../api/services';
import { printReceiptWindow, shareReceiptViaWhatsApp } from '../../utils/printReceipt';
import { generateWhatsAppReceiptLink } from '../../utils/whatsapp';
import { exportToCSV } from '../../utils/exportTable';
import Tax80GCertificateModal, { type Tax80GData } from '../reports/Tax80GCertificateModal';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface Props {
  donorId: string | null;
  onClose: () => void;
}

const DonorDetailDrawer: React.FC<Props> = ({ donorId, onClose }) => {
  const [selected80GData, setSelected80GData] = useState<Tax80GData | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['donorSummary', donorId],
    queryFn: () => getDonorSummary(donorId!),
    enabled: Boolean(donorId),
  });
  const { data: myOrg } = useQuery({ queryKey: ['myOrganization'], queryFn: getMyOrganization });

  if (!donorId) return null;

  const donor = data?.donor;
  const metrics = data?.metrics;
  const receipts = data?.receipts || [];

  const columns = [
    {
      title: 'Receipt #',
      dataIndex: 'receipt_number',
      key: 'receipt_number',
      render: (num: string) => <b style={{ whiteSpace: 'nowrap' }}>{num}</b>,
    },
    {
      title: 'Date',
      dataIndex: 'receipt_date',
      key: 'receipt_date',
      render: (d: string) => <span style={{ whiteSpace: 'nowrap' }}>{d ? dayjs(d).format('DD-MM-YYYY') : ''}</span>,
    },
    {
      title: 'Amount (₹)',
      dataIndex: 'amount',
      key: 'amount',
      render: (val: number) => (
        <span style={{ fontWeight: 700, color: '#15803D', fontSize: 14, whiteSpace: 'nowrap' }}>
          ₹ {Number(val).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      title: 'Mode',
      dataIndex: 'payment_mode',
      key: 'payment_mode',
      render: (mode: string) => <Tag color="blue">{mode.toUpperCase()}</Tag>,
    },
    {
      title: 'Purpose',
      dataIndex: 'purpose',
      key: 'purpose',
      render: (p: string) => p || 'Festival Donation',
    },
    {
      title: 'Collector',
      dataIndex: 'collector_name',
      key: 'collector_name',
      render: (c: string) => <Tag color="orange">👤 {c}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Tooltip title="Print Receipt">
            <Button
              size="small"
              icon={<PrinterOutlined />}
              onClick={() => printReceiptWindow({
                receipt_number: record.receipt_number,
                receipt_date: record.receipt_date,
                amount: record.amount,
                payment_mode: record.payment_mode,
                purpose: record.purpose,
                collector_name: record.collector_name,
                donor: {
                  full_name: donor?.full_name || 'Donor',
                  phone: donor?.phone,
                  pan_number: donor?.pan_number,
                  is_80g_eligible: donor?.is_80g_eligible,
                },
              }, 'Hissob ERP')}
            />
          </Tooltip>
          <Tooltip title="Share Link via WhatsApp">
            <Button
              size="small"
              icon={<WhatsAppOutlined style={{ color: '#25D366' }} />}
              onClick={() => {
                const link = generateWhatsAppReceiptLink({
                  receiptId: record.id,
                  receiptNumber: record.receipt_number,
                  donorName: donor?.full_name || 'Donor',
                  donorPhone: donor?.phone,
                  amount: record.amount,
                  paymentMode: record.payment_mode,
                  receiptDate: record.receipt_date,
                  purpose: record.purpose,
                  orgName: myOrg?.name,
                });
                window.open(link, '_blank');
              }}
            />
          </Tooltip>
          <Tooltip title="Share Image via WhatsApp">
            <Button
              size="small"
              icon={<WhatsAppOutlined />}
              style={{ background: '#25D366', borderColor: '#25D366', color: '#fff' }}
              onClick={() => shareReceiptViaWhatsApp({
                id: record.id,
                receipt_number: record.receipt_number,
                receipt_date: record.receipt_date,
                amount: record.amount,
                payment_mode: record.payment_mode,
                purpose: record.purpose,
                collector_name: record.collector_name,
                donor: {
                  full_name: donor?.full_name || 'Donor',
                  phone: donor?.phone,
                  pan_number: donor?.pan_number,
                  address: donor?.address,
                  city: donor?.city,
                }
              })}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingRight: 20 }}>
            <div>
              <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Donor Comprehensive Profile</Text>
              <Title level={4} style={{ margin: 0, color: '#0B2347' }}>{donor?.full_name || 'Donor Details'}</Title>
            </div>
            {donor && (
              <Space>
                {donor.is_vip && <Tag color="gold" icon={<CrownOutlined />}>VIP Donor</Tag>}
                {donor.is_80g_eligible && <Tag color="green">80G Eligible</Tag>}
              </Space>
            )}
          </div>
        }
        placement="right"
        onClose={onClose}
        open={Boolean(donorId)}
        styles={{
          wrapper: { width: '840px', maxWidth: '100vw' },
          body: { padding: '12px 10px 24px' },
        }}
      >
        {isLoading || !donor ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Spin size="large" />
          </div>
        ) : (
          <div>
            {/* Profile Information */}
            <Card style={{ borderRadius: 12, background: 'linear-gradient(135deg, #0B2347 0%, #1E5AA8 100%)', color: '#fff', marginBottom: 20 }}>
              <Row gutter={[16, 16]} align="middle">
                <Col xs={24} sm={16}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: '50%', background: '#F97316',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 24, fontWeight: 900, color: '#FFF'
                    }}>
                      {donor.full_name.charAt(0)}
                    </div>
                    <div>
                      <h2 style={{ color: '#FFF', margin: 0, fontSize: 20, fontWeight: 800 }}>{donor.full_name}</h2>
                      <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>Donor #: {donor.donor_number || 'N/A'}</Text>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                    {donor.phone && <span><PhoneOutlined /> {donor.phone}</span>}
                    {donor.email && <span><MailOutlined /> {donor.email}</span>}
                    {donor.city && <span><HomeOutlined /> {donor.city}</span>}
                    {donor.pan_number && <span><b>PAN:</b> {donor.pan_number}</span>}
                  </div>
                </Col>

                <Col xs={24} sm={8} style={{ textAlign: 'right' }}>
                  {donor.is_80g_eligible && (
                    <Button
                      type="primary"
                      icon={<SafetyCertificateOutlined />}
                      style={{ background: '#2563EB', borderColor: '#2563EB', fontWeight: 700, borderRadius: 8 }}
                      onClick={() => {
                        setSelected80GData({
                          certificateNumber: `80G-2025-${donor.donor_number || donor.id.slice(0, 6)}`,
                          donorName: donor.full_name,
                          panNumber: donor.pan_number || 'PAN-NOT-PROVIDED',
                          address: donor.city ? `${donor.city}, India` : 'India',
                          financialYear: '2025-26',
                          totalDonationAmount: Number(metrics?.total_amount || 0),
                          receiptNumbers: receipts.map((r: any) => r.receipt_number),
                          trustName: 'HISSOB GANESH UTSAV CHARITABLE TRUST',
                          issueDate: dayjs().format('DD MMM YYYY'),
                        });
                      }}
                    >
                      Issue 80G Certificate
                    </Button>
                  )}
                </Col>
              </Row>
            </Card>

            {/* Lifetime Contribution Metrics */}
            <Row gutter={[12, 12]} className="hissob-stat-row" style={{ marginBottom: 20 }}>
              <Col xs={12} sm={12} className="hissob-stat-col">
                <Card
                  className="hissob-stat-card"
                  style={{
                    background: 'linear-gradient(180deg, #F0FDF4 0%, #FFFFFF 100%)',
                    border: '1px solid #BBF7D0',
                    borderTop: '4px solid #10B981',
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: 700, color: '#047857', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    💰 Lifetime Donated
                  </Text>
                  <div style={{ marginTop: 4, color: '#047857', fontSize: 18, fontWeight: 900, whiteSpace: 'nowrap' }}>
                    ₹ {Number(metrics?.total_amount || 0).toLocaleString('en-IN')}
                  </div>
                </Card>
              </Col>

              <Col xs={12} sm={12} className="hissob-stat-col">
                <Card
                  className="hissob-stat-card"
                  style={{
                    background: 'linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)',
                    border: '1px solid #E2E8F0',
                    borderTop: '4px solid #0B2347',
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: 700, color: '#0B2347', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    🧾 Total Receipts
                  </Text>
                  <div style={{ marginTop: 4, color: '#0B2347', fontSize: 20, fontWeight: 900 }}>
                    {metrics?.receipt_count || 0}
                  </div>
                </Card>
              </Col>

              <Col xs={12} sm={12} className="hissob-stat-col">
                <Card
                  className="hissob-stat-card"
                  style={{
                    background: 'linear-gradient(180deg, #FFF7ED 0%, #FFFFFF 100%)',
                    border: '1px solid #FFEDD5',
                    borderTop: '4px solid #F97316',
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: 700, color: '#C2410C', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    📊 Avg Donation
                  </Text>
                  <div style={{ marginTop: 4, color: '#C2410C', fontSize: 18, fontWeight: 900, whiteSpace: 'nowrap' }}>
                    ₹ {Math.round(metrics?.average_donation || 0).toLocaleString('en-IN')}
                  </div>
                </Card>
              </Col>

              <Col xs={12} sm={12} className="hissob-stat-col">
                <Card
                  className="hissob-stat-card"
                  style={{
                    background: 'linear-gradient(180deg, #EFF6FF 0%, #FFFFFF 100%)',
                    border: '1px solid #DBEAFE',
                    borderTop: '4px solid #2563EB',
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: 700, color: '#1E40AF', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    💳 Cash / Digital
                  </Text>
                  <div style={{ marginTop: 4, fontSize: 14, fontWeight: 900, whiteSpace: 'nowrap' }}>
                    <span style={{ color: '#EA580C' }}>₹{Number(metrics?.cash_total || 0).toLocaleString('en-IN')}</span>
                    <span style={{ color: '#94A3B8', margin: '0 4px' }}>/</span>
                    <span style={{ color: '#2563EB' }}>₹{Number(metrics?.digital_total || 0).toLocaleString('en-IN')}</span>
                  </div>
                </Card>
              </Col>
            </Row>

            {/* Donation History Table */}
            <Card
              className="hissob-card"
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>📜 Complete Donation History ({receipts.length})</span>
                  <Button
                    icon={<DownloadOutlined />}
                    size="small"
                    onClick={() => exportToCSV(
                      receipts.map((r: any) => ({
                        receipt_number: r.receipt_number,
                        receipt_date: r.receipt_date,
                        amount: r.amount,
                        payment_mode: r.payment_mode,
                        purpose: r.purpose,
                        collector: r.collector_name,
                      })),
                      `Donor_Statement_${donor.full_name.replace(/\s+/g, '_')}_${dayjs().format('YYYYMMDD')}`,
                      [
                        { key: 'receipt_number', title: 'Receipt #' },
                        { key: 'receipt_date', title: 'Date' },
                        { key: 'amount', title: 'Amount (₹)' },
                        { key: 'payment_mode', title: 'Payment Mode' },
                        { key: 'purpose', title: 'Purpose' },
                        { key: 'collector', title: 'Collector' },
                      ]
                    )}
                  >
                    Export Statement
                  </Button>
                </div>
              }
            >
              {receipts.length === 0 ? (
                <Empty description="No donations recorded for this donor yet" />
              ) : (
                <Table
                  dataSource={receipts}
                  columns={columns}
                  rowKey="id"
                  pagination={{ pageSize: 5 }}
                  scroll={{ x: 'max-content' }}
                />
              )}
            </Card>
          </div>
        )}
      </Drawer>

      {/* 80G Tax Exemption Certificate Modal */}
      <Tax80GCertificateModal
        open={Boolean(selected80GData)}
        onClose={() => setSelected80GData(null)}
        data={selected80GData}
      />
    </>
  );
};

export default DonorDetailDrawer;
