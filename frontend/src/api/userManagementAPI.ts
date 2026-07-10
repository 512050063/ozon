import request from './request';
import type { ApiResponse } from '@/types';
import type { User } from '@/types';

export interface CreateUserRequest {
  username: string;
  password: string;
  status?: 'pending' | 'active' | 'inactive';
  roleId?: number;
  memberLevel?: 'trial' | 'free' | 'standard' | 'professional';
  nickname?: string;
  phone?: string;
}

export interface UpdateUserRequest extends Partial<CreateUserRequest> {
  id: number;
}

export const userManagementAPI = {
  // 获取所有用户
  getUsers: async (): Promise<ApiResponse<User[]>> => {
    const response = await request.get('/users');
    return response;
  },

  // 获取单个用户
  getUser: async (id: number): Promise<ApiResponse<User>> => {
    const response = await request.get(`/users/${id}`);
    return response;
  },

  // 创建用户
  createUser: async (data: CreateUserRequest): Promise<ApiResponse<User>> => {
    const response = await request.post('/users', data);
    return response;
  },

  // 更新用户
  updateUser: async (id: number, data: Partial<CreateUserRequest>): Promise<ApiResponse<User>> => {
    const response = await request.put(`/users/${id}`, data);
    return response;
  },

  // 切换用户状态
  toggleUserStatus: async (id: number): Promise<ApiResponse<User>> => {
    const response = await request.patch(`/users/${id}/status`);
    return response;
  },

  // 删除用户
  deleteUser: async (id: number): Promise<ApiResponse<void>> => {
    const response = await request.delete(`/users/${id}`);
    return response;
  },
};
