import { apiClient } from './client';

export interface UserInvite {
  id: string;
  tenant_id: string;
  email: string;
  full_name?: string;
  phone?: string;
  role_name: string;
  token: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expires_at: string;
  accepted_at?: string;
  custom_note?: string;
  created_at: string;
  shareable_url?: string;
  whatsapp_link?: string;
}

export interface EventInvite {
  id: string;
  tenant_id: string;
  festival_id?: string;
  title: string;
  guest_name: string;
  guest_email?: string;
  guest_phone?: string;
  vip_tier: string;
  mahaprasad_menu?: string;
  timing_slots?: string;
  chief_guests?: string;
  token: string;
  rsvp_status: 'pending' | 'attending' | 'declined' | 'maybe';
  guests_count: number;
  special_requests?: string;
  checked_in: boolean;
  checked_in_at?: string;
  qr_code_url?: string;
  created_at: string;
  rsvp_url?: string;
}

export interface PublicVerifyInviteResponse {
  valid: boolean;
  email?: string;
  full_name?: string;
  org_name?: string;
  logo_url?: string;
  role_name?: string;
  custom_note?: string;
  expires_at?: string;
  error?: string;
}

export interface PublicRsvpInfoResponse {
  token: string;
  title: string;
  guest_name: string;
  vip_tier: string;
  mahaprasad_menu?: string;
  timing_slots?: string;
  chief_guests?: string;
  rsvp_status: 'pending' | 'attending' | 'declined' | 'maybe';
  guests_count: number;
  special_requests?: string;
  org_name: string;
  org_logo?: string;
  org_address?: string;
  org_phone?: string;
  upi_id?: string;
  tenant_slug?: string;
  org_qr?: string;
  festival_name?: string;
  festival_dates?: string;
}

export const invitationsApi = {
  // --- User Team Invitations ---
  sendInvite: async (payload: {
    email: string;
    full_name?: string;
    phone?: string;
    role_name: string;
    custom_note?: string;
    expires_in_days?: number;
  }): Promise<UserInvite> => {
    const res = await apiClient.post('/invitations/send', payload);
    return res.data;
  },

  bulkSendInvites: async (invitations: Array<{
    email: string;
    full_name?: string;
    phone?: string;
    role_name: string;
    custom_note?: string;
  }>): Promise<UserInvite[]> => {
    const res = await apiClient.post('/invitations/bulk', { invitations });
    return res.data;
  },

  getInvites: async (status?: string): Promise<UserInvite[]> => {
    const res = await apiClient.get('/invitations', { params: { status } });
    return res.data;
  },

  resendInvite: async (inviteId: string): Promise<UserInvite> => {
    const res = await apiClient.post(`/invitations/${inviteId}/resend`);
    return res.data;
  },

  revokeInvite: async (inviteId: string): Promise<UserInvite> => {
    const res = await apiClient.post(`/invitations/${inviteId}/revoke`);
    return res.data;
  },

  verifyPublicToken: async (token: string): Promise<PublicVerifyInviteResponse> => {
    const res = await apiClient.get(`/invitations/public/verify/${token}`);
    return res.data;
  },

  acceptInvite: async (payload: {
    token: string;
    full_name: string;
    password: string;
    phone?: string;
  }) => {
    const res = await apiClient.post('/invitations/public/accept', payload);
    return res.data;
  },

  // --- Digital Event Patrika & VIP RSVP ---
  createEventInvite: async (payload: {
    festival_id?: string;
    title: string;
    guest_name: string;
    guest_email?: string;
    guest_phone?: string;
    vip_tier?: string;
    mahaprasad_menu?: string;
    timing_slots?: string;
    chief_guests?: string;
  }): Promise<EventInvite> => {
    const res = await apiClient.post('/events/invitations', payload);
    return res.data;
  },

  bulkCreateEventInvites: async (payload: {
    festival_id?: string;
    title: string;
    guests: Array<{
      guest_name: string;
      guest_email?: string;
      guest_phone?: string;
      vip_tier?: string;
    }>;
  }): Promise<EventInvite[]> => {
    const res = await apiClient.post('/events/invitations/bulk', payload);
    return res.data;
  },

  getEventInvites: async (params?: { festival_id?: string; rsvp_status?: string }): Promise<EventInvite[]> => {
    const res = await apiClient.get('/events/invitations', { params });
    return res.data;
  },

  getPublicRsvpInfo: async (token: string): Promise<PublicRsvpInfoResponse> => {
    const res = await apiClient.get(`/events/invitations/public/rsvp/${token}`);
    return res.data;
  },

  submitPublicRsvp: async (token: string, payload: {
    rsvp_status: 'attending' | 'declined' | 'maybe';
    guests_count: number;
    special_requests?: string;
  }) => {
    const res = await apiClient.post(`/events/invitations/public/rsvp/${token}`, payload);
    return res.data;
  },

  checkInGuest: async (token: string) => {
    const res = await apiClient.post(`/events/invitations/check-in/${token}`);
    return res.data;
  },
};
