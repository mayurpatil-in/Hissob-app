import React, { useState, useMemo } from 'react';
import { Card, Row, Col, Typography, Button, Tag, Progress, Alert, Space, Spin, Table, message, Tooltip } from 'antd';
import {
  RobotOutlined, SafetyCertificateOutlined,
  AudioOutlined, CheckCircleOutlined,
  ExperimentOutlined, WarningOutlined, DashboardOutlined,
  ThunderboltOutlined, SearchOutlined, FileTextOutlined,
  CopyOutlined, DownloadOutlined, InfoCircleOutlined,
  FilePdfOutlined
} from '@ant-design/icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import AIInsightsWidget from './AIInsightsWidget';
import AIChatWidget from './AIChatWidget';
import AIVoiceAssistantModal from './AIVoiceAssistantModal';
import { useNavigate } from 'react-router-dom';
import {
  getMyOrganization, getDashboardSummary, getAIInsights,
  runAIAudit, getAIExecutiveReport,
  type AIAuditResponse, type AuditFinding, type AIReportResponse,
} from '../../api/services';

const { Title, Text } = Typography;

// ── Compute real AI Health Score from live data ──
function computeHealthScore(summary: any, insights: any): { score: number; label: string; color: string; detail: string } {
  if (!summary) return { score: 0, label: 'LOADING', color: '#94A3B8', detail: 'Fetching data…' };

  const m = summary.metrics || {};
  let score = 100;
  const issues: string[] = [];

  const pendingCount = m.pending_count ?? 0;
  if (pendingCount > 10) { score -= 15; issues.push(`${pendingCount} unsettled cash receipts`); }
  else if (pendingCount > 3) { score -= 8; issues.push(`${pendingCount} unsettled cash receipts`); }
  else if (pendingCount > 0) { score -= 3; }

  const totalColl = m.total_collections ?? 0;
  const settlementPct = m.settlement_pct ?? 100;
  if (settlementPct < 30 && totalColl > 0) { score -= 10; issues.push(`Only ${settlementPct}% cash settled`); }

  const highAlerts = (insights?.insights || []).filter((i: any) => i.impact_level === 'high').length;
  if (highAlerts >= 3) { score -= 15; }
  else if (highAlerts >= 1) { score -= 5 * highAlerts; }

  score = Math.max(0, Math.min(100, score));

  let label: string;
  let color: string;
  if (score >= 90) { label = 'OPTIMAL'; color = '#22C55E'; }
  else if (score >= 70) { label = 'GOOD'; color = '#3B82F6'; }
  else if (score >= 50) { label = 'ATTENTION'; color = '#F59E0B'; }
  else { label = 'CRITICAL'; color = '#EF4444'; }

  const detail = issues.length > 0 ? issues[0] : 'No financial discrepancies detected';
  return { score, label, color, detail };
}

const SEVERITY_CONFIG: Record<string, { color: string; icon: string; tagColor: string }> = {
  high: { color: '#EF4444', icon: '🔴', tagColor: 'error' },
  medium: { color: '#F59E0B', icon: '🟡', tagColor: 'warning' },
  info: { color: '#3B82F6', icon: '🟢', tagColor: 'processing' },
};

const AIInsightsPage: React.FC = () => {
  const navigate = useNavigate();
  const [isAiVoiceModalOpen, setIsAiVoiceModalOpen] = useState(false);
  const [auditResult, setAuditResult] = useState<AIAuditResponse | null>(null);
  const [reportResult, setReportResult] = useState<AIReportResponse | null>(null);

  // ── Live data queries ──
  const { data: org } = useQuery({ queryKey: ['my-organization'], queryFn: getMyOrganization });
  const { data: summary, isLoading: summaryLoading } = useQuery({ queryKey: ['dashboardSummary'], queryFn: getDashboardSummary, staleTime: 30_000 });
  const { data: insightsData } = useQuery({ queryKey: ['aiInsights'], queryFn: getAIInsights, staleTime: 60_000 });

  // ── Mutations ──
  const auditMutation = useMutation({
    mutationFn: runAIAudit,
    onSuccess: (data) => { setAuditResult(data); message.success(`Audit complete: ${data.total_findings} finding(s) detected`); },
    onError: () => message.error('Failed to run AI audit scan'),
  });

  const reportMutation = useMutation({
    mutationFn: getAIExecutiveReport,
    onSuccess: (data) => { setReportResult(data); message.success('Executive report generated successfully'); },
    onError: () => message.error('Failed to generate executive report'),
  });

  const providerLabel = useMemo(() => org?.ai_provider === 'openai' ? 'OpenAI GPT-4o-Mini' : 'Google Gemini 2.0 Flash', [org]);
  const health = useMemo(() => computeHealthScore(summary, insightsData), [summary, insightsData]);
  const highAlerts = useMemo(() => (insightsData?.insights || []).filter((i: any) => i.impact_level === 'high').length, [insightsData]);

  // ── Audit table columns ──
  const auditColumns = [
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      width: 90,
      render: (sev: string) => {
        const cfg = SEVERITY_CONFIG[sev] || SEVERITY_CONFIG.info;
        return <Tag color={cfg.tagColor}>{cfg.icon} {sev.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Finding',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: AuditFinding) => (
        <div>
          <Text style={{ fontWeight: 700, color: '#0B2347' }}>{title}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>{record.description}</Text>
        </div>
      ),
    },
    {
      title: 'Suggestion',
      dataIndex: 'suggestion',
      key: 'suggestion',
      width: 280,
      render: (text: string) => <Text style={{ fontSize: 12, color: '#F97316', fontWeight: 600 }}><ThunderboltOutlined /> {text}</Text>,
    },
    {
      title: 'Records',
      dataIndex: 'affected_records',
      key: 'affected_records',
      width: 150,
      render: (records: string[]) => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {records.slice(0, 3).map((r, i) => <Tag key={i} style={{ fontSize: 11 }}>{r}</Tag>)}
          {records.length > 3 && <Tag style={{ fontSize: 11 }}>+{records.length - 3} more</Tag>}
        </div>
      ),
    },
  ];

  // ── Render formatted report text ──
  const renderReport = (text: string) => {
    return text.split('\n').map((line, idx) => {
      if (line.startsWith('# ')) return <Title key={idx} level={3} style={{ color: '#0B2347', marginTop: 16 }}>{line.slice(2)}</Title>;
      if (line.startsWith('## ')) return <Title key={idx} level={4} style={{ color: '#1E40AF', marginTop: 14, marginBottom: 6 }}>{line.slice(3)}</Title>;
      if (line.startsWith('---')) return <hr key={idx} style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '12px 0' }} />;
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const rendered = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) return <strong key={pIdx}>{part.slice(2, -2)}</strong>;
        return part;
      });
      if (line.startsWith('- ')) return <div key={idx} style={{ paddingLeft: 12, marginBottom: 3, display: 'flex', alignItems: 'flex-start' }}><span style={{ color: '#0066FF', marginRight: 8, fontWeight: 900 }}>•</span><span>{rendered}</span></div>;
      if (/^\d+\. /.test(line)) return <div key={idx} style={{ paddingLeft: 12, marginBottom: 3 }}>{rendered}</div>;
      return <div key={idx} style={{ marginBottom: line.trim() ? 4 : 2 }}>{rendered}</div>;
    });
  };

  const handleCopyReport = () => {
    if (reportResult?.report_text) {
      navigator.clipboard.writeText(reportResult.report_text);
      message.success('Report copied to clipboard');
    }
  };

  const handleDownloadReport = () => {
    if (reportResult?.report_text) {
      const blob = new Blob([reportResult.report_text], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AI_Executive_Report_${new Date().toISOString().slice(0, 10)}.md`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleDownloadReportPDF = () => {
    if (!reportResult?.report_text) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const orgName = org?.name || 'Hisob ERP Platform';
    const lines = reportResult.report_text.split('\n');

    let parsedHtml = '';
    lines.forEach((line) => {
      if (line.startsWith('# ')) {
        parsedHtml += `<h1 style="color: #0b2347; border-bottom: 2px solid #0066FF; padding-bottom: 8px; margin-top: 24px; font-size: 22px;">${line.slice(2)}</h1>`;
      } else if (line.startsWith('## ')) {
        parsedHtml += `<h2 style="color: #1e40af; border-left: 4px solid #0066FF; padding-left: 10px; margin-top: 20px; font-size: 16px; background: #f8fafc; padding-top: 6px; padding-bottom: 6px;">${line.slice(3)}</h2>`;
      } else if (line.startsWith('---')) {
        parsedHtml += `<hr style="border: none; border-top: 1px dashed #cbd5e1; margin: 16px 0;" />`;
      } else if (line.startsWith('- ')) {
        const text = line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        parsedHtml += `<li style="margin-bottom: 6px; font-size: 13px; color: #1e293b;">${text}</li>`;
      } else if (/^\d+\. /.test(line)) {
        const text = line.replace(/^\d+\.\s*/, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        parsedHtml += `<div style="margin-bottom: 6px; font-size: 13px; padding-left: 12px; color: #1e293b;"><strong>•</strong> ${text}</div>`;
      } else if (line.trim()) {
        const text = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        parsedHtml += `<p style="margin-bottom: 8px; font-size: 13px; color: #334155;">${text}</p>`;
      }
    });

    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>AI Executive Report - ${orgName}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #0f172a; line-height: 1.6; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px double #0066FF; padding-bottom: 16px; margin-bottom: 24px; }
          .title { font-size: 24px; font-weight: 800; color: #0b2347; text-transform: uppercase; margin: 0; }
          .subtitle { font-size: 13px; color: #64748B; margin-top: 4px; }
          .badge { background: #EFF6FF; color: #0066FF; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 700; border: 1px solid #BFDBFE; }
          .footer { margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 16px; display: flex; justify-content: space-between; font-size: 11px; color: #64748B; }
          .sig-box { margin-top: 60px; display: flex; justify-content: space-between; }
          .sig-line { width: 220px; border-top: 1px solid #000; text-align: center; padding-top: 6px; font-weight: bold; font-size: 12px; }
          @media print {
            body { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">${orgName}</h1>
            <div class="subtitle">Smart AI Financial Intelligence Center • Executive Audit Report</div>
          </div>
          <div class="badge">AI Engine: ${reportResult.ai_provider || 'OpenAI / Gemini'}</div>
        </div>

        <div>${parsedHtml}</div>

        <div class="sig-box">
          <div class="sig-line">Treasurer / Trustee Signature</div>
          <div class="sig-line">Auditor Verification</div>
        </div>

        <div class="footer">
          <div>Generated on: ${new Date().toLocaleString()}</div>
          <div>Hisob ERP Platform • Confidential Financial Audit</div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(fullHtml);
    printWindow.document.close();
  };


  return (
    <div className="ai-insights-module animate-fadeIn">
      <style>{`
        @media (max-width: 768px) {
          .ai-insights-module .page-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 12px !important;
          }
          .ai-insights-module .page-header button {
            width: 100% !important;
          }
          .ai-insights-module .ant-card-head {
            flex-wrap: wrap !important;
            padding: 12px 16px !important;
          }
          .ai-insights-module .ant-card-extra {
            margin-top: 8px !important;
            width: 100% !important;
          }
          .ai-insights-module .ant-card-extra button {
            width: 100% !important;
          }
        }
      `}</style>

      {/* ── Page Header ── */}
      <div className="page-header" style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#0B2347', fontWeight: 900 }}>
            <RobotOutlined style={{ color: '#F97316', marginRight: 8 }} />
            Smart AI Financial Intelligence Center
          </Title>

          <Text type="secondary">
            Powered by {providerLabel} • Real-time database Q&A chatbot, LLM audit engine & voice receipt parser
          </Text>
        </div>
        <Button
          type="primary"
          icon={<AudioOutlined />}
          size="large"
          onClick={() => setIsAiVoiceModalOpen(true)}
          style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)', borderColor: '#F97316', borderRadius: 8, fontWeight: 700 }}
        >
          AI Voice Receipt Assistant
        </Button>
      </div>

      {/* ── Interactive LLM Financial Chatbot ── */}
      <div style={{ marginBottom: 24 }}>
        <AIChatWidget embedded />
      </div>

      {/* ── Top AI Health Cards Banner ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <Card className="hissob-card" style={{ borderTop: `4px solid ${health.color}` }}>
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>AI HEALTH SCORE</Text>
            {summaryLoading ? (
              <div style={{ textAlign: 'center', padding: 12 }}><Spin size="small" /></div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                  <Title level={3} style={{ margin: 0, color: health.color, fontWeight: 900 }}>{health.score} / 100</Title>
                  <Tag color={health.score >= 90 ? 'success' : health.score >= 70 ? 'processing' : health.score >= 50 ? 'warning' : 'error'} icon={health.score >= 70 ? <CheckCircleOutlined /> : <WarningOutlined />}>{health.label}</Tag>
                </div>
                <Progress percent={health.score} strokeColor={health.color} showInfo={false} size="small" style={{ marginTop: 8 }} />
                <Text type="secondary" style={{ fontSize: 11 }}>{health.detail}</Text>
              </>
            )}
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="hissob-card" style={{ borderTop: '4px solid #3B82F6' }}>
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>LLM INTELLIGENCE ENGINE</Text>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              <Title level={4} style={{ margin: 0, color: '#0B2347', fontWeight: 800 }}>{org?.ai_provider === 'openai' ? 'GPT-4o-Mini' : 'Gemini 2.0'}</Title>
              <Tag color="processing">ACTIVE</Tag>
            </div>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 12 }}>Scanning 100% of receipts & vendor payouts</Text>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="hissob-card" style={{ borderTop: `4px solid ${highAlerts > 0 ? '#EF4444' : '#F97316'}` }}>
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>ANOMALY DETECTION</Text>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              <Title level={3} style={{ margin: 0, color: highAlerts > 0 ? '#EF4444' : '#22C55E', fontWeight: 900 }}>{highAlerts} {highAlerts === 1 ? 'Alert' : 'Alerts'}</Title>
              <Tag color={highAlerts > 0 ? 'error' : 'orange'} icon={highAlerts > 0 ? <WarningOutlined /> : <SafetyCertificateOutlined />}>{highAlerts > 0 ? 'ACTION NEEDED' : 'SECURE'}</Tag>
            </div>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 12 }}>
              {highAlerts > 0 ? `${highAlerts} high-impact alert${highAlerts > 1 ? 's' : ''} require${highAlerts === 1 ? 's' : ''} attention` : 'Zero unverified high-value transactions'}
            </Text>
          </Card>
        </Col>
      </Row>

      {/* ── Smart AI Financial Insights ── */}
      <div style={{ marginBottom: 20 }}>
        <AIInsightsWidget />
      </div>

      {/* ── AI Financial Audit Scanner ── */}
      <Card
        className="hissob-card"
        style={{ marginBottom: 20, borderTop: '4px solid #F97316' }}
        title={
          <Space>
            <SearchOutlined style={{ color: '#F97316', fontSize: 18 }} />
            <span style={{ fontWeight: 700, color: '#0B2347' }}>AI Financial Audit Scanner</span>
            <Tooltip title="Scans receipts, expenses, donors & settlements for 8 types of anomalies">
              <InfoCircleOutlined style={{ color: '#94A3B8' }} />
            </Tooltip>
          </Space>
        }
        extra={
          <Button
            type="primary"
            icon={<SearchOutlined />}
            loading={auditMutation.isPending}
            onClick={() => auditMutation.mutate()}
            style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)', borderColor: '#F97316', fontWeight: 700, borderRadius: 8 }}
          >
            {auditMutation.isPending ? 'Scanning…' : 'Run AI Audit'}
          </Button>
        }
      >
        {!auditResult && !auditMutation.isPending && (
          <div style={{ textAlign: 'center', padding: '30px 0', color: '#94A3B8' }}>
            <SearchOutlined style={{ fontSize: 40, marginBottom: 12, color: '#CBD5E1' }} />
            <br />
            <Text type="secondary">Click <b>"Run AI Audit"</b> to scan your financial data for anomalies, duplicates, and compliance issues.</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>
              Checks: Duplicate UPI • Large Receipts • Stale Cash • Over-Budget • Vendor Concentration • Inactive VIP • Missing Bills • Round Amounts
            </Text>
          </div>
        )}

        {auditMutation.isPending && (
          <div style={{ textAlign: 'center', padding: 30 }}>
            <Spin size="large" />
            <p style={{ marginTop: 12, color: '#6B7280' }}>AI is scanning your financial records…</p>
          </div>
        )}

        {auditResult && (
          <>
            {/* Audit Summary Bar */}
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
              <Col xs={12} sm={6}>
                <div style={{ padding: 12, background: '#F8FAFC', borderRadius: 8, textAlign: 'center' }}>
                  <Text type="secondary" style={{ fontSize: 10, fontWeight: 700 }}>HEALTH SCORE</Text>
                  <div>
                    <Text style={{ fontSize: 24, fontWeight: 900, color: auditResult.health_score >= 80 ? '#22C55E' : auditResult.health_score >= 50 ? '#F59E0B' : '#EF4444' }}>
                      {auditResult.health_score}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}> / 100</Text>
                  </div>
                </div>
              </Col>
              <Col xs={12} sm={6}>
                <div style={{ padding: 12, background: '#FEF2F2', borderRadius: 8, textAlign: 'center' }}>
                  <Text type="secondary" style={{ fontSize: 10, fontWeight: 700 }}>HIGH</Text>
                  <div><Text style={{ fontSize: 24, fontWeight: 900, color: '#EF4444' }}>{auditResult.high_count}</Text></div>
                </div>
              </Col>
              <Col xs={12} sm={6}>
                <div style={{ padding: 12, background: '#FFFBEB', borderRadius: 8, textAlign: 'center' }}>
                  <Text type="secondary" style={{ fontSize: 10, fontWeight: 700 }}>MEDIUM</Text>
                  <div><Text style={{ fontSize: 24, fontWeight: 900, color: '#F59E0B' }}>{auditResult.medium_count}</Text></div>
                </div>
              </Col>
              <Col xs={12} sm={6}>
                <div style={{ padding: 12, background: '#EFF6FF', borderRadius: 8, textAlign: 'center' }}>
                  <Text type="secondary" style={{ fontSize: 10, fontWeight: 700 }}>INFO</Text>
                  <div><Text style={{ fontSize: 24, fontWeight: 900, color: '#3B82F6' }}>{auditResult.info_count}</Text></div>
                </div>
              </Col>
            </Row>

            {auditResult.findings.length === 0 ? (
              <Alert type="success" showIcon icon={<CheckCircleOutlined />} message="All Clear — No Anomalies Detected" description="Your financial records passed all 8 audit checks. No duplicates, compliance issues, or suspicious patterns found." />
            ) : (
              <Table
                dataSource={auditResult.findings.map((f, i) => ({ ...f, key: i }))}
                columns={auditColumns}
                pagination={false}
                size="small"
                scroll={{ x: 800 }}
              />
            )}
          </>
        )}
      </Card>

      {/* ── AI Executive Summary Report ── */}
      <Card
        className="hissob-card"
        style={{ marginBottom: 20, borderTop: '4px solid #3B82F6' }}
        title={
          <Space>
            <FileTextOutlined style={{ color: '#3B82F6', fontSize: 18 }} />
            <span style={{ fontWeight: 700, color: '#0B2347' }}>AI Executive Summary Report</span>
          </Space>
        }
        extra={
          <Space>
            {reportResult && (
              <>
                <Button icon={<FilePdfOutlined style={{ color: '#EF4444' }} />} onClick={handleDownloadReportPDF} size="small" style={{ fontWeight: 600 }}>Save as PDF</Button>
                <Button icon={<DownloadOutlined />} onClick={handleDownloadReport} size="small">Markdown</Button>
                <Button icon={<CopyOutlined />} onClick={handleCopyReport} size="small">Copy</Button>
              </>
            )}

            <Button
              type="primary"
              icon={<FileTextOutlined />}
              loading={reportMutation.isPending}
              onClick={() => reportMutation.mutate()}
              style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', borderColor: '#3B82F6', fontWeight: 700, borderRadius: 8 }}
            >
              {reportMutation.isPending ? 'Generating…' : 'Generate Report'}
            </Button>
          </Space>
        }
      >
        {!reportResult && !reportMutation.isPending && (
          <div style={{ textAlign: 'center', padding: '30px 0', color: '#94A3B8' }}>
            <FileTextOutlined style={{ fontSize: 40, marginBottom: 12, color: '#CBD5E1' }} />
            <br />
            <Text type="secondary">Click <b>"Generate Report"</b> to get an LLM-powered executive financial summary with analysis and recommendations.</Text>
          </div>
        )}

        {reportMutation.isPending && (
          <div style={{ textAlign: 'center', padding: 30 }}>
            <Spin size="large" />
            <p style={{ marginTop: 12, color: '#6B7280' }}>AI is generating your executive report…</p>
          </div>
        )}

        {reportResult && (
          <div style={{ padding: '8px 4px', lineHeight: 1.7, fontSize: 13, color: '#1E293B' }}>
            {reportResult.ai_provider && (
              <Tag color="blue" style={{ marginBottom: 12 }}>
                Powered by {reportResult.ai_provider} {reportResult.is_llm_powered ? '✨' : '📊'}
              </Tag>
            )}
            {renderReport(reportResult.report_text)}
          </div>
        )}
      </Card>

      {/* ── Bottom Row: Audit Logs + Financial Snapshot ── */}
      <Row gutter={[20, 20]}>
        <Col xs={24} md={12}>
          <Card className="hissob-card" title={<span><SafetyCertificateOutlined style={{ color: '#F97316' }} /> AI Fraud & Anomaly Audit Scanner</span>}>
            <div style={{ padding: 12, background: '#F8FAFC', borderRadius: 8, marginBottom: 14 }}>
              <Space align="start">
                <CheckCircleOutlined style={{ fontSize: 20, color: '#22C55E', marginTop: 2 }} />
                <div>
                  <Text style={{ fontWeight: 700, color: '#0B2347' }}>Multi-Tenant Security & Role Isolation</Text><br />
                  <Text type="secondary" style={{ fontSize: 12 }}>AI verifies that only authorized Treasurers & Trustees verify settlement batches.</Text>
                </div>
              </Space>
            </div>
            <div style={{ padding: 12, background: '#F8FAFC', borderRadius: 8, marginBottom: 14 }}>
              <Space align="start">
                <CheckCircleOutlined style={{ fontSize: 20, color: '#22C55E', marginTop: 2 }} />
                <div>
                  <Text style={{ fontWeight: 700, color: '#0B2347' }}>Duplicate Receipt Prevention</Text><br />
                  <Text type="secondary" style={{ fontSize: 12 }}>AI cross-checks UTR reference numbers to prevent double recording of UPI donations.</Text>
                </div>
              </Space>
            </div>
            <Button type="default" icon={<ExperimentOutlined />} onClick={() => navigate('/audit')} style={{ width: '100%', borderColor: '#F97316', color: '#F97316', fontWeight: 600 }}>
              Inspect Live System Audit Logs
            </Button>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card className="hissob-card" title={<span><DashboardOutlined style={{ color: '#3B82F6' }} /> Live Financial Snapshot</span>}>
            {summaryLoading ? (
              <div style={{ textAlign: 'center', padding: 30 }}><Spin /></div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ padding: 12, background: '#F0FDF4', borderRadius: 8, border: '1px solid #BBF7D0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontWeight: 700, color: '#166534' }}>Total Collections</Text>
                      <Text style={{ fontWeight: 900, fontSize: 16, color: '#166534' }}>₹ {(summary?.metrics?.total_collections ?? 0).toLocaleString('en-IN')}</Text>
                    </div>
                  </div>
                  <div style={{ padding: 12, background: '#EFF6FF', borderRadius: 8, border: '1px solid #BFDBFE' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontWeight: 700, color: '#1E40AF' }}>Settled Amount</Text>
                      <Text style={{ fontWeight: 900, fontSize: 16, color: '#1E40AF' }}>₹ {(summary?.metrics?.settled_amount ?? 0).toLocaleString('en-IN')}</Text>
                    </div>
                  </div>
                  <div style={{ padding: 12, background: '#FFFBEB', borderRadius: 8, border: '1px solid #FDE68A' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontWeight: 700, color: '#92400E' }}>Pending Settlement</Text>
                      <Text style={{ fontWeight: 900, fontSize: 16, color: '#92400E' }}>
                        ₹ {(summary?.metrics?.pending_amount ?? 0).toLocaleString('en-IN')}
                        <span style={{ fontWeight: 500, fontSize: 11, color: '#B45309', marginLeft: 6 }}>({summary?.metrics?.pending_count ?? 0} receipts)</span>
                      </Text>
                    </div>
                  </div>
                  <div style={{ padding: 12, background: '#F5F3FF', borderRadius: 8, border: '1px solid #DDD6FE' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontWeight: 700, color: '#5B21B6' }}>Active Donors</Text>
                      <Text style={{ fontWeight: 900, fontSize: 16, color: '#5B21B6' }}>
                        {summary?.metrics?.active_donors ?? 0}
                        <span style={{ fontWeight: 500, fontSize: 11, color: '#7C3AED', marginLeft: 6 }}>({summary?.metrics?.vip_donors ?? 0} VIP)</span>
                      </Text>
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 16, padding: 12, background: '#EFF6FF', borderRadius: 8, border: '1px solid #BFDBFE' }}>
                  <Text style={{ fontWeight: 700, color: '#1E40AF' }}>
                    <ThunderboltOutlined style={{ marginRight: 6 }} />AI Recommendation:
                  </Text><br />
                  <Text style={{ fontSize: 12, color: '#1E3A8A' }}>
                    {(summary?.metrics?.pending_count ?? 0) > 0
                      ? 'Collectors should submit cash settlements to the Treasurer before EOD to maintain clear audit compliance.'
                      : 'All financials are up to date. Enable WhatsApp Receipt sharing to boost donor engagement during peak festival days.'}
                  </Text>
                </div>
              </>
            )}
          </Card>
        </Col>
      </Row>

      {/* ── AI Voice Assistant Modal ── */}
      <AIVoiceAssistantModal
        open={isAiVoiceModalOpen}
        onCancel={() => setIsAiVoiceModalOpen(false)}
        onApplyParsedData={() => { setIsAiVoiceModalOpen(false); navigate('/receipts'); }}
      />
    </div>
  );
};

export default AIInsightsPage;
