import request from './request';
import type { ApiResponse } from '@/types';

export interface OzonConversation {
  conversationId: string;
  buyerName: string;
  lastMessage: string;
  updatedAt: string;
  unreadCount: number;
  raw?: any;
}

export interface OzonMessage {
  messageId: string;
  sender: string;
  text: string;
  createdAt: string;
  raw?: any;
}

export interface OzonConversationListResponse {
  conversations: OzonConversation[];
  total: number;
}

export interface OzonConversationMessagesResponse {
  conversationId: string;
  messages: OzonMessage[];
}

export const ozonMessageAPI = {
  getConversations: async (
    storeId: number,
    params: { limit?: number; offset?: number; unreadOnly?: boolean; channel?: string } = {}
  ): Promise<ApiResponse<OzonConversationListResponse>> => {
    const response = await request.get(`/ozon/messages/${storeId}/conversations`, { params });
    return response;
  },

  getConversationMessages: async (
    storeId: number,
    conversationId: string,
    params: { limit?: number } = {}
  ): Promise<ApiResponse<OzonConversationMessagesResponse>> => {
    const response = await request.get(`/ozon/messages/${storeId}/conversations/${conversationId}`, { params });
    return response;
  },

  sendReply: async (storeId: number, conversationId: string, data: { text: string }): Promise<ApiResponse<void>> => {
    const response = await request.post(`/ozon/messages/${storeId}/conversations/${conversationId}/reply`, data);
    return response;
  },
};
