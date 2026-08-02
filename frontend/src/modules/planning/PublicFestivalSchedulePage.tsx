import React, { useState } from 'react';
import {
  Card, Typography, Tag, Button, Modal, Form, Input,
  App, Space, Spin, Divider, Badge, theme
} from 'antd';
import {
  CalendarOutlined, ClockCircleOutlined, ShareAltOutlined,
  CopyOutlined, EnvironmentOutlined, CheckCircleOutlined
} from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { getPublicFestivalSchedule, submitPublicYajmanRequest } from '../../api/services';

const { Title, Text, Paragraph } = Typography;

const EVENT_TYPE_TAGS: Record<string, { label: string; color: string; icon: string }> = {
  aarti: { label: 'Maha Aarti', color: 'orange', icon: '🪔' },
  pooja: { label: 'Special Pooja', color: 'gold', icon: '🌸' },
  cultural: { label: 'Cultural Program', color: 'purple', icon: '🎭' },
  blood_donation: { label: 'Social Drive', color: 'red', icon: '🩸' },
  annoutsav: { label: 'Mahaprasad', color: 'green', icon: '🍲' },
  other: { label: 'Event', color: 'blue', icon: '🎪' },
};

export const PublicFestivalSchedulePage: React.FC = () => {
  const { festivalId = '' } = useParams<{ festivalId: string }>();
  const { message } = App.useApp();
  const { token } = theme.useToken();

  const [filterType, setFilterType] = useState<string>('all');
  const [isYajmanModalOpen, setIsYajmanModalOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [selectedEventForYajman, setSelectedEventForYajman] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [form] = Form.useForm();

  const { data, isLoading, error } = useQuery({
    queryKey: ['public-schedule', festivalId],
    queryFn: () => getPublicFestivalSchedule(festivalId),
    enabled: !!festivalId,
  });

  const yajmanMutation = useMutation({
    mutationFn: submitPublicYajmanRequest,
    onSuccess: (res) => {
      message.success(res.message);
      setIsYajmanModalOpen(false);
      form.resetFields();
    },
    onError: () => message.error('Failed to submit sponsorship request. Please try again.'),
  });

  const festivalName = data?.festival?.name;

  React.useEffect(() => {
    if (festivalName) {
      document.title = `🪔 ${festivalName} — Live Event & Aarti Schedule`;
    }
  }, [festivalName]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <Spin size="large" description="Loading Festival Event Schedule..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ maxWidth: 600, margin: '60px auto', textAlign: 'center', padding: 24 }}>
        <Title level={3} style={{ color: token.colorText }}>Festival Schedule Not Found</Title>
        <Text type="secondary" style={{ color: token.colorTextSecondary }}>The public event schedule link might be invalid or the festival has concluded.</Text>
      </div>
    );
  }

  const { festival, schedules = [] } = data;

  const todayStr = dayjs().format('YYYY-MM-DD');

  const todayEvents = schedules.filter((s: any) => dayjs(s.event_date).format('YYYY-MM-DD') === todayStr);

  const filteredSchedules = schedules.filter((s: any) => {
    const isPast = dayjs(s.event_date).isBefore(dayjs(), 'day');
    if (filterType === 'upcoming') return !isPast;
    if (filterType === 'completed') return isPast;
    if (filterType === 'aarti') return s.event_type === 'aarti';
    if (filterType === 'annoutsav') return s.event_type === 'annoutsav';
    if (filterType === 'cultural') return s.event_type === 'cultural';
    return true;
  });

  const searchedSchedules = filteredSchedules.filter((s: any) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      s.title?.toLowerCase().includes(term) ||
      s.yajman_name?.toLowerCase().includes(term) ||
      s.description?.toLowerCase().includes(term) ||
      s.location?.toLowerCase().includes(term)
    );
  });

  const parseTimeToMinutes = (timeStr?: string): number => {
    if (!timeStr) return 0;
    const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (!match) return 0;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3]?.toUpperCase();

    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    return hours * 60 + minutes;
  };

  const sortedSchedules = [...searchedSchedules].sort((a: any, b: any) => {
    const isPastA = dayjs(a.event_date).isBefore(dayjs(), 'day');
    const isPastB = dayjs(b.event_date).isBefore(dayjs(), 'day');

    if (!isPastA && isPastB) return -1;
    if (isPastA && !isPastB) return 1;

    const dateDiff = dayjs(a.event_date).valueOf() - dayjs(b.event_date).valueOf();
    if (dateDiff !== 0) return dateDiff;

    return parseTimeToMinutes(a.start_time) - parseTimeToMinutes(b.start_time);
  });

  const openGoogleMaps = () => {
    const loc = festival.venue || '';
    if (loc.startsWith('http://') || loc.startsWith('https://') || loc.includes('goo.gl') || loc.includes('maps.app') || loc.includes('google.com/maps')) {
      window.open(loc.startsWith('http') ? loc : `https://${loc}`, '_blank');
      return;
    }
    const query = encodeURIComponent(`${festival.name} ${festival.venue}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  };

  const copyPublicLink = () => {
    navigator.clipboard.writeText(window.location.href);
    message.success('Public schedule link copied to clipboard!');
  };

  const shareOnWhatsApp = () => {
    const text = `🪔 *${festival.name} — Live Event & Aarti Schedule*\n📍 Venue: ${festival.venue}\n\nCheck today's Aarti times, Mahaprasad, & Yajman sponsors live here:\n${window.location.href}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const addToCalendar = (event: any) => {
    const title = encodeURIComponent(`${festival.name}: ${event.title}`);
    const details = encodeURIComponent(`${event.description || ''}\nYajman: ${event.yajman_name || 'N/A'}\nVenue: ${event.location}`);
    const location = encodeURIComponent(event.location || festival.venue);
    const dateStr = dayjs(event.event_date).format('YYYYMMDD');
    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}&dates=${dateStr}/${dateStr}`;
    window.open(calendarUrl, '_blank');
  };

  return (
    <div style={{ backgroundColor: token.colorBgLayout, minHeight: '100vh', paddingBottom: 60, fontFamily: "'Inter', sans-serif" }}>
      {/* ── Top Festive Hero Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0B2347 0%, #1E3A8A 50%, #0F172A 100%)',
        color: '#FFFFFF',
        padding: '40px 16px 54px 16px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 6px 24px rgba(11, 35, 71, 0.25)',
      }}>
        <div style={{
          position: 'absolute',
          top: '-50px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '600px',
          height: '250px',
          background: 'radial-gradient(circle, rgba(249, 115, 22, 0.25) 0%, rgba(11, 35, 71, 0) 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: 840, margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, backgroundColor: 'rgba(249, 115, 22, 0.18)', border: '1px solid rgba(249, 115, 22, 0.4)', borderRadius: 20, padding: '4px 14px', marginBottom: 14 }}>
            <span style={{ fontSize: 14 }}>🪔</span>
            <span style={{ color: '#FDBA74', fontSize: 11, fontWeight: 800, letterSpacing: '0.5px' }}>
              OFFICIAL FESTIVAL EVENT & RITUAL SCHEDULE
            </span>
          </div>

          <Title level={1} style={{ color: '#FFFFFF', margin: '4px 0 8px 0', fontWeight: 900, fontSize: 32, letterSpacing: '-0.5px' }}>
            {festival.name}
          </Title>

          <Text style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: 15, display: 'block', marginBottom: 18 }}>
            Organized by <strong style={{ color: '#FB923C', fontWeight: 800 }}>{festival.mandal_name}</strong>
          </Text>

          <Space wrap style={{ justifyContent: 'center', marginBottom: 22 }}>
            <Tag icon={<CalendarOutlined />} style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', color: '#FFFFFF', border: '1px solid rgba(255, 255, 255, 0.25)', fontSize: 13, padding: '5px 12px', borderRadius: 10, fontWeight: 600 }}>
              {dayjs(festival.start_date).format('DD MMM')} - {dayjs(festival.end_date).format('DD MMM YYYY')}
            </Tag>

            <Tag
              icon={<EnvironmentOutlined />}
              style={{
                backgroundColor: 'rgba(251, 146, 60, 0.2)',
                color: '#FFEDD5',
                border: '1px solid rgba(251, 146, 60, 0.5)',
                fontSize: 13,
                padding: '6px 14px',
                borderRadius: 10,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'normal',
                maxWidth: '100%',
                display: 'inline-flex',
                alignItems: 'center',
                textAlign: 'center',
                lineHeight: '1.4',
                wordBreak: 'break-word'
              }}
              onClick={openGoogleMaps}
            >
              📍 {festival.venue?.startsWith('http') || festival.venue?.includes('goo.gl') || festival.venue?.includes('maps') ? 'Exact Map Pin Location (Get Directions →)' : festival.venue}
            </Tag>
          </Space>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
            <Button
              type="primary"
              icon={<ShareAltOutlined />}
              style={{ backgroundColor: '#25D366', borderColor: '#25D366', fontWeight: 700, borderRadius: 10, height: 38 }}
              onClick={shareOnWhatsApp}
            >
              Share on WhatsApp
            </Button>

            <Button
              icon={<EnvironmentOutlined />}
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)', color: '#FFFFFF', borderColor: 'rgba(255, 255, 255, 0.3)', fontWeight: 600, borderRadius: 10, height: 38 }}
              onClick={() => setIsMapModalOpen(true)}
            >
              📍 View Map & Directions
            </Button>

            <Button
              icon={<CopyOutlined />}
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)', color: '#FFFFFF', borderColor: 'rgba(255, 255, 255, 0.3)', fontWeight: 600, borderRadius: 10, height: 38 }}
              onClick={copyPublicLink}
            >
              Copy Link
            </Button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 840, margin: '-28px auto 0 auto', padding: '0 16px', position: 'relative', zIndex: 10 }}>

        <Card
          style={{
            borderRadius: 18,
            boxShadow: '0 8px 30px rgba(249, 115, 22, 0.15)',
            marginBottom: 24,
            border: '2px solid #F97316',
            backgroundColor: token.colorBgContainer,
          }}
          styles={{ body: { padding: '22px 24px' } }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <Title level={4} style={{ margin: 0, color: token.colorText, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800 }}>
              <Badge status="processing" color="#F97316" /> Today's Live Program Schedule
            </Title>
            <Tag color="red" style={{ fontWeight: 800, borderRadius: 10, padding: '2px 10px' }}>TODAY: {dayjs().format('DD MMM YYYY')}</Tag>
          </div>

          {todayEvents.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {todayEvents.map((ev: any) => (
                <div
                  key={ev.id}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 12,
                    backgroundColor: token.colorBgLayout,
                    border: `1px solid ${token.colorBorder}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text strong style={{ fontSize: 16, color: token.colorText }}>
                      {EVENT_TYPE_TAGS[ev.event_type]?.icon} {ev.title}
                    </Text>
                    <Tag color={EVENT_TYPE_TAGS[ev.event_type]?.color || 'blue'}>
                      {EVENT_TYPE_TAGS[ev.event_type]?.label || 'Event'}
                    </Tag>
                  </div>

                  <Text style={{ fontSize: 13, color: token.colorTextSecondary }}>
                    <ClockCircleOutlined /> Time: <strong style={{ color: token.colorText }}>{ev.start_time || 'All Day'}</strong> • <EnvironmentOutlined /> {ev.location}
                  </Text>

                  {ev.yajman_name && (
                    <Text style={{ color: '#F97316', fontWeight: 600, fontSize: 13 }}>
                      👑 Yajman Sponsor: {ev.yajman_name}
                    </Text>
                  )}

                  {ev.description && (
                    <Text style={{ fontSize: 12, color: token.colorTextSecondary }}>{ev.description}</Text>
                  )}

                  <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center' }}>
                    <Button
                      size="small"
                      icon={<CalendarOutlined />}
                      onClick={() => addToCalendar(ev)}
                    >
                      Add to Calendar
                    </Button>
                    {ev.yajman_name ? (
                      <Tag color="green" style={{ borderRadius: 10, fontWeight: 700, margin: 0 }}>
                        ✓ SPONSORED BY {ev.yajman_name.toUpperCase()}
                      </Tag>
                    ) : (
                      <Button
                        size="small"
                        type="link"
                        style={{ color: '#F97316', padding: 0, fontWeight: 600 }}
                        onClick={() => {
                          setSelectedEventForYajman(ev);
                          setIsYajmanModalOpen(true);
                        }}
                      >
                        Sponsor This Aarti →
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <Text style={{ color: token.colorTextSecondary }}>No scheduled programs for today. Check the full festival schedule below!</Text>
            </div>
          )}
        </Card>

        <Card style={{ borderRadius: 16, backgroundColor: token.colorBgContainer, border: `1px solid ${token.colorBorder}`, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }} styles={{ body: { padding: '24px' } }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <Title level={4} style={{ margin: 0, color: token.colorText, fontWeight: 800 }}>Full Event Schedule & Timetable</Title>

            <Space wrap size={[6, 6]}>
              <Button
                size="small"
                type={filterType === 'all' ? 'primary' : 'default'}
                style={filterType === 'all' ? { backgroundColor: '#F97316', borderColor: '#F97316' } : {}}
                onClick={() => setFilterType('all')}
              >
                All ({schedules.length})
              </Button>
              <Button
                size="small"
                type={filterType === 'completed' ? 'primary' : 'default'}
                style={filterType === 'completed' ? { backgroundColor: '#64748B', borderColor: '#64748B', fontWeight: 600 } : {}}
                onClick={() => setFilterType('completed')}
              >
                📜 Completed History ({schedules.filter((s: any) => dayjs(s.event_date).isBefore(dayjs(), 'day')).length})
              </Button>
              <Button
                size="small"
                type={filterType === 'aarti' ? 'primary' : 'default'}
                onClick={() => setFilterType('aarti')}
              >
                🪔 Aartis
              </Button>
              <Button
                size="small"
                type={filterType === 'annoutsav' ? 'primary' : 'default'}
                onClick={() => setFilterType('annoutsav')}
              >
                🍲 Mahaprasad
              </Button>
              <Button
                size="small"
                type={filterType === 'cultural' ? 'primary' : 'default'}
                onClick={() => setFilterType('cultural')}
              >
                🎭 Cultural
              </Button>
            </Space>
          </div>

          <Input
            placeholder="🔍 Search Aarti, Mahaprasad, Yajman Sponsor, or Event Title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            allowClear
            style={{ borderRadius: 10, marginBottom: 16 }}
          />

          <Divider style={{ margin: '12px 0 20px 0' }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {sortedSchedules.length > 0 ? (
              sortedSchedules.map((item: any, idx: number) => {
              const tagInfo = EVENT_TYPE_TAGS[item.event_type] || EVENT_TYPE_TAGS.other;
              const isPast = dayjs(item.event_date).isBefore(dayjs(), 'day');
              const isToday = dayjs(item.event_date).isSame(dayjs(), 'day');

              return (
                <div
                  key={item.id || `item-${idx}`}
                  style={{
                    padding: '16px',
                    borderRadius: 12,
                    border: isPast ? `1px solid ${token.colorBorder}` : isToday ? '1px solid #FDBA74' : `1px solid ${token.colorBorder}`,
                    borderLeft: isPast ? '4px solid #64748B' : isToday ? '4px solid #F97316' : '4px solid #3B82F6',
                    backgroundColor: token.colorBgLayout,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    boxShadow: isToday ? '0 4px 16px rgba(249, 115, 22, 0.08)' : 'none',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Text strong style={{ fontSize: 16, color: token.colorText }}>
                          {tagInfo.icon} {item.title}
                        </Text>
                        {isToday && <Tag color="red" style={{ fontWeight: 800, borderRadius: 8 }}>TODAY 🔴</Tag>}
                        {isPast && <Tag style={{ backgroundColor: token.colorBgContainer, color: token.colorTextSecondary, borderRadius: 8, fontSize: 10, fontWeight: 700, border: `1px solid ${token.colorBorder}` }}>✓ COMPLETED</Tag>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                        <Text style={{ fontSize: 12, color: token.colorTextSecondary }}>
                          <CalendarOutlined /> {dayjs(item.event_date).format('DD MMM YYYY (ddd)')}
                        </Text>
                        {item.start_time && (
                          <Text style={{ fontSize: 12, color: token.colorTextSecondary }}>
                            <ClockCircleOutlined /> {item.start_time}
                          </Text>
                        )}
                      </div>
                    </div>

                    <Tag color={isPast ? 'default' : tagInfo.color} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8 }}>
                      {tagInfo.label}
                    </Tag>
                  </div>

                  {item.yajman_name ? (
                    <div style={{
                      backgroundColor: isPast ? token.colorBgContainer : 'rgba(254, 243, 199, 0.15)',
                      padding: '6px 10px',
                      borderRadius: 8,
                      border: isPast ? `1px solid ${token.colorBorder}` : '1px solid rgba(251, 191, 36, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <Text style={{ color: isPast ? token.colorTextSecondary : '#F59E0B', fontSize: 12, fontWeight: 700 }}>
                        👑 Yajman Sponsor: {item.yajman_name}
                      </Text>
                      <Tag color={isPast ? 'default' : 'green'} style={{ borderRadius: 10, margin: 0, fontWeight: 700 }}>
                        {isPast ? 'CONCLUDED' : 'BOOKED'}
                      </Tag>
                    </div>
                  ) : isPast ? (
                    <div style={{ backgroundColor: token.colorBgContainer, padding: '6px 10px', borderRadius: 8, border: `1px solid ${token.colorBorder}` }}>
                      <Text style={{ fontSize: 12, color: token.colorTextSecondary }}>
                        ✓ Event Concluded
                      </Text>
                    </div>
                  ) : (
                    <div style={{ backgroundColor: token.colorBgContainer, padding: '6px 10px', borderRadius: 8, border: `1px dashed ${token.colorBorder}` }}>
                      <Text style={{ fontSize: 12, fontStyle: 'italic', color: token.colorTextSecondary }}>
                        ✨ Sponsorship Open for this Aarti
                      </Text>
                    </div>
                  )}

                  {item.description && (
                    <Paragraph style={{ margin: 0, fontSize: 12, color: token.colorTextSecondary }}>
                      {item.description}
                    </Paragraph>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, paddingTop: 6, borderTop: `1px solid ${token.colorBorder}` }}>
                    <Text style={{ fontSize: 11, color: token.colorTextSecondary }}>
                      <EnvironmentOutlined /> {item.location || festival.venue}
                    </Text>

                    <Space>
                      {!isPast && (
                        <Button size="small" icon={<CalendarOutlined />} onClick={() => addToCalendar(item)}>
                          Remind Me
                        </Button>
                      )}

                      {item.yajman_name ? (
                        <Button
                          size="small"
                          disabled
                          style={{
                            backgroundColor: isPast ? token.colorBgContainer : 'rgba(16, 185, 129, 0.12)',
                            borderColor: isPast ? token.colorBorder : 'rgba(16, 185, 129, 0.3)',
                            color: isPast ? token.colorTextSecondary : '#10B981',
                            fontWeight: 600
                          }}
                        >
                          <CheckCircleOutlined /> {isPast ? 'Concluded' : 'Sponsored'}
                        </Button>
                      ) : isPast ? (
                        <Button size="small" disabled style={{ backgroundColor: token.colorBgContainer, borderColor: token.colorBorder, color: token.colorTextSecondary }}>
                          Closed
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          type="primary"
                          style={{ backgroundColor: '#F97316', borderColor: '#F97316', fontWeight: 600 }}
                          onClick={() => {
                            setSelectedEventForYajman(item);
                            setIsYajmanModalOpen(true);
                          }}
                        >
                          Sponsor Aarti 🪔
                        </Button>
                      )}
                    </Space>
                  </div>
                </div>
              );
            })
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <Text style={{ color: token.colorTextSecondary }}>No programs match your search term "{searchTerm}".</Text>
              </div>
            )}
          </div>
        </Card>

        <div style={{ textAlign: 'center', marginTop: 30, color: token.colorTextSecondary, fontSize: 12 }}>
          <div>Powered by <strong style={{ color: token.colorText }}>Hisob ERP</strong> • Festival & Trust Management Platform</div>
          <div style={{ marginTop: 4, fontSize: 11, color: token.colorTextSecondary }}>
            Designed & Developed by{' '}
            <a
              href="https://www.mayurpatil.in"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#F97316', fontWeight: 600, textDecoration: 'none' }}
            >
              www.mayurpatil.in
            </a>
          </div>
        </div>
      </div>

      <Modal
        title={`Sponsor Aarti: ${selectedEventForYajman?.title || 'Festival Event'}`}
        open={isYajmanModalOpen}
        onCancel={() => setIsYajmanModalOpen(false)}
        onOk={() => {
          form.validateFields().then((values) => {
            yajmanMutation.mutate({
              festival_id: festival.id,
              event_id: selectedEventForYajman?.id,
              title: selectedEventForYajman?.title,
              preferred_date: selectedEventForYajman?.event_date,
              ...values,
            });
          });
        }}
        confirmLoading={yajmanMutation.isPending}
        destroyOnHidden
      >
        <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 16 }}>
          Submit your details to sponsor this Aarti or Mahaprasad program. The Festival Committee will contact you to confirm Yajman details.
        </Paragraph>

        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Your Full Name" rules={[{ required: true, message: 'Name is required' }]}>
            <Input placeholder="e.g. Shri Ramesh Patil & Family" />
          </Form.Item>

          <Form.Item name="phone" label="WhatsApp / Contact Phone Number" rules={[{ required: true, message: 'Phone number is required' }]}>
            <Input placeholder="e.g. 9876543210" />
          </Form.Item>

          <Form.Item name="notes" label="Special Pooja Notes or Devotional Intention">
            <Input.TextArea rows={2} placeholder="e.g. Seeking blessings for family health and prosperity..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Modal: Google Maps Location Preview ── */}
      <Modal
        title={<span>📍 Venue & Location Directions: {festival.name}</span>}
        open={isMapModalOpen}
        onCancel={() => setIsMapModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsMapModalOpen(false)}>
            Close
          </Button>,
          <Button
            key="navigate"
            type="primary"
            icon={<EnvironmentOutlined />}
            style={{ backgroundColor: '#F97316', borderColor: '#F97316', fontWeight: 700 }}
            onClick={openGoogleMaps}
          >
            Open in Google Maps App 🧭
          </Button>,
        ]}
        width={640}
        destroyOnHidden
      >
        <div style={{ padding: '8px 0' }}>
          <Paragraph strong style={{ fontSize: 15, color: '#0B2347', marginBottom: 4 }}>
            📍 {festival.venue}
          </Paragraph>
          <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 16 }}>
            Organized by {festival.mandal_name}
          </Text>

          {/* Embedded Google Maps iFrame */}
          <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #CBD5E1', height: 320 }}>
            <iframe
              title="Festival Venue Location"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
              src={`https://maps.google.com/maps?q=${encodeURIComponent(`${festival.name} ${festival.venue}`)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};
