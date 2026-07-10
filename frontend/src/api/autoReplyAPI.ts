import request from './request';
import type { ApiResponse } from '@/types';
import { getFullImageUrl } from '@/utils/common';

export interface ProductSelectionRef {
  id: number;
  name: string;
  ozonId: string;
  imageUrl: string | null;
}

export interface AutoReplyRule {
  id: number;
  userId: number;
  type: 'store' | 'product';
  keyword: string;
  replyContent: string;
  enabled: boolean;
  priority: number;
  productSelectionId: number | null;
  productSelection: ProductSelectionRef | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAutoReplyRuleRequest {
  type: 'store' | 'product';
  keyword: string;
  replyContent: string;
  enabled?: boolean;
  priority?: number;
  productSelectionId?: number | null;
}

export interface UpdateAutoReplyRuleRequest extends Partial<CreateAutoReplyRuleRequest> {
  id: number;
}

const API_BASE = '/auto-reply';

const normalizeRule = (rule: AutoReplyRule): AutoReplyRule => ({
  ...rule,
  productSelection: rule.productSelection
    ? {
        ...rule.productSelection,
        imageUrl: getFullImageUrl(rule.productSelection.imageUrl) || rule.productSelection.imageUrl,
      }
    : null,
});

export const autoReplyAPI = {
  getRules: async (page: number, value: number, keyword: string): Promise<ApiResponse<AutoReplyRule[]>> => {
    const response = await request.get(API_BASE, {
      params: {
        page,
        limit: value,
        keyword: keyword?.trim() || undefined,
      },
    });
    if (response.success && Array.isArray(response.data)) {
      response.data = response.data.map(normalizeRule);
    }
    return response;
  },

  getRule: async (id: number): Promise<ApiResponse<AutoReplyRule>> => {
    const response = await request.get(`${API_BASE}/${id}`);
    if (response.success && response.data) {
      response.data = normalizeRule(response.data);
    }
    return response;
  },

  createRule: async (data: CreateAutoReplyRuleRequest): Promise<ApiResponse<AutoReplyRule>> => {
    const payload = {
      type: data.type || 'store',
      keyword: data.keyword,
      replyContent: data.replyContent,
      enabled: data.enabled !== undefined ? data.enabled : true,
      priority: data.priority !== undefined ? data.priority : 0,
      productSelectionId: data.type === 'product' ? data.productSelectionId : null,
    };
    const response = await request.post(API_BASE, payload);
    if (response.success && response.data) {
      response.data = normalizeRule(response.data);
    }
    return response;
  },

  updateRule: async (
    id: number,
    data: Partial<CreateAutoReplyRuleRequest>
  ): Promise<ApiResponse<AutoReplyRule>> => {
    const response = await request.put(`${API_BASE}/${id}`, data);
    if (response.success && response.data) {
      response.data = normalizeRule(response.data);
    }
    return response;
  },

  deleteRule: async (id: number): Promise<ApiResponse<null>> => {
    return await request.delete(`${API_BASE}/${id}`);
  },
};
