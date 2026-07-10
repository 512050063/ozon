import request from './request';
import type { ApiResponse } from '@/types';

export interface PricingStrategy {
  id: number;
  name: string;
  basePrice: number;
  shippingPrice: number;
  tariffRate: number;
  profitRate: number;
  platformFeeRate: number;
  otherCost: number | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePricingStrategyRequest {
  name: string;
  basePrice: number;
  shippingPrice: number;
  tariffRate: number;
  profitRate: number;
  platformFeeRate: number;
  otherCost?: number | null;
  isDefault?: boolean;
}

export interface UpdatePricingStrategyRequest extends Partial<CreatePricingStrategyRequest> {
  id: number;
}

const API_BASE = '/pricing';

export const pricingAPI = {
  getStrategies: async (): Promise<ApiResponse<PricingStrategy[]>> => {
    const response = await request.get(API_BASE);
    return response;
  },

  getStrategy: async (id: number): Promise<ApiResponse<PricingStrategy>> => {
    const response = await request.get(`${API_BASE}/${id}`);
    return response;
  },

  createStrategy: async (data: CreatePricingStrategyRequest): Promise<ApiResponse<PricingStrategy>> => {
    const payload = {
      name: data.name,
      basePrice: data.basePrice,
      shippingPrice: data.shippingPrice,
      tariffRate: data.tariffRate,
      profitRate: data.profitRate,
      platformFeeRate: data.platformFeeRate,
      otherCost: data.otherCost,
      isDefault: data.isDefault || false,
    };
    return await request.post(API_BASE, payload);
  },

  updateStrategy: async (
    id: number,
    data: Partial<CreatePricingStrategyRequest>
  ): Promise<ApiResponse<PricingStrategy>> => {
    const payload = {
      name: data.name,
      basePrice: data.basePrice,
      shippingPrice: data.shippingPrice,
      tariffRate: data.tariffRate,
      profitRate: data.profitRate,
      platformFeeRate: data.platformFeeRate,
      otherCost: data.otherCost,
      isDefault: data.isDefault,
    };
    return await request.put(`${API_BASE}/${id}`, payload);
  },

  deleteStrategy: async (id: number): Promise<ApiResponse<null>> => {
    return await request.delete(`${API_BASE}/${id}`);
  },

  setDefaultStrategy: async (id: number): Promise<ApiResponse<null>> => {
    return await request.post(`${API_BASE}/${id}/set-default`);
  },
};
