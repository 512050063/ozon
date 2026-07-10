import request from './request';
import type { LoginRequest, AuthResponse, ApiResponse, User } from '@/types';

export interface WechatLoginQRCodeResponse {
  sceneStr: string;
  qrCodeUrl: string;
  expireAt: string;
}

export interface WechatLoginStatusResponse {
  status: 'pending' | 'scanned' | 'confirmed' | 'expired' | 'invalid';
  token?: string;
  user?: any;
}

export const authAPI = {
  login: async (data: LoginRequest): Promise<ApiResponse<AuthResponse>> => {
    const response = await request.post('/auth/login', data);
    return response;
  },

  logout: async (): Promise<ApiResponse<any>> => {
    const response = await request.post('/auth/logout');
    return response;
  },

  checkSessionStatus: async (): Promise<ApiResponse<{ status: 'active' | 'kicked' | 'logout' | 'expired' | 'invalid' }>> => {
    const response = await request.get('/auth/session/status');
    return response;
  },

  register: async (data: {
    username: string;
    password: string;
  }): Promise<ApiResponse<{ user: User }>> => {
    const response = await request.post('/auth/register', data);
    return response;
  },

  getProfile: async (): Promise<ApiResponse<any>> => {
    const response = await request.get('/auth/me');
    return response;
  },

  forgotPassword: async (data: {
    resetToken: string;
    newPassword: string;
  }): Promise<ApiResponse<any>> => {
    const response = await request.post('/auth/forgot-password', data);
    return response;
  },

  verifyForgotPasswordCode: async (data: {
    username: string;
    phone: string;
    verificationCode: string;
  }): Promise<ApiResponse<{ resetToken: string }>> => {
    const response = await request.post('/auth/forgot-password/verify', data);
    return response;
  },

  changePassword: async (data: { oldPassword: string; newPassword: string }): Promise<ApiResponse<any>> => {
    const response = await request.put('/auth/change-password', data);
    return response;
  },

  // 微信登录相关接口
  getWechatLoginQRCode: async (): Promise<ApiResponse<WechatLoginQRCodeResponse>> => {
    const response = await request.get('/auth/wechat/qrcode');
    return response;
  },

  checkWechatLoginStatus: async (sceneStr: string): Promise<ApiResponse<WechatLoginStatusResponse>> => {
    const response = await request.get(`/auth/wechat/status?sceneStr=${encodeURIComponent(sceneStr)}`);
    return response;
  },

  // 模拟微信扫码回调（测试用）
  simulateWechatCallback: async (sceneStr: string, openid: string, unionid?: string): Promise<ApiResponse<any>> => {
    const response = await request.post('/auth/wechat/callback', { sceneStr, openid, unionid });
    return response;
  },

  // 更新用户资料
  updateProfile: async (data: {
    username?: string;
    nickname?: string;
    phone?: string;
    email?: string;
    avatar?: string;
    code?: string;
    unbind?: boolean;
  }): Promise<ApiResponse<any>> => {
    const response = await request.put('/auth/profile', data);
    return response;
  },

  // 上传头像
  uploadAvatar: async (file: File): Promise<ApiResponse<any>> => {
    const formData = new FormData();
    formData.append('avatar', file);
    const response = await request.post('/auth/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response;
  },

  deleteAvatarHistoryItem: async (avatar: string): Promise<ApiResponse<any>> => {
    const response = await request.delete('/auth/avatar/history', {
      data: { avatar },
    });
    return response;
  },

  // 微信解绑
  unbindWechat: async (): Promise<ApiResponse<any>> => {
    const response = await request.post('/auth/wechat/unbind');
    return response;
  },

  // 发送验证码
  sendVerificationCode: async (phone: string, scene?: string, username?: string): Promise<ApiResponse<any>> => {
    const response = await request.post('/auth/send-verification-code', { phone, scene, username });
    return response;
  },

  // 验证验证码
  verifyCode: async (data: { phone: string; code: string; scene?: string }): Promise<ApiResponse<any>> => {
    const response = await request.post('/auth/verify-code', data);
    return response;
  },
};
