import request from './request';
import type { ApiResponse } from '@/types';

export interface MembershipInfo {
  hasClaimedTrial: boolean;
  trialExpiration?: string;
  memberExpiration?: string;
}

// 获取当前用户会员信息
export const getMembershipInfo = async (): Promise<ApiResponse<MembershipInfo>> => {
  const response = await request.get('/membership');
  return response as unknown as ApiResponse<MembershipInfo>;
};

// 领取试用会员
export const claimTrial = async (): Promise<ApiResponse<void>> => {
  const response = await request.post('/membership/trial');
  return response as unknown as ApiResponse<void>;
};

// 升级会员
export const upgradeMembership = async (plan: 'standard' | 'professional'): Promise<ApiResponse<void>> => {
  const response = await request.post('/membership/upgrade', { plan });
  return response as unknown as ApiResponse<void>;
};
