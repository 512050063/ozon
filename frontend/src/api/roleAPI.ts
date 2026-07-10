import request from './request';
import type { ApiResponse } from '@/types';

export interface Role {
  id: number;
  name: string;
  code: string;
  description?: string;
  permissions?: string[];
  isSystem: boolean;
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoleRequest {
  name: string;
  code: string;
  description?: string;
  permissions?: string[];
}

export interface UpdateRoleRequest {
  name?: string;
  code?: string;
  description?: string;
  permissions?: string[];
}

export const roleAPI = {
  // 获取所有角色
  getAllRoles: async (): Promise<ApiResponse<Role[]>> => {
    const response = await request.get('/roles');
    return response;
  },

  // 获取单个角色
  getRole: async (id: number): Promise<ApiResponse<Role>> => {
    const response = await request.get(`/roles/${id}`);
    return response;
  },

  // 创建角色
  createRole: async (data: CreateRoleRequest): Promise<ApiResponse<Role>> => {
    const response = await request.post('/roles', data);
    return response;
  },

  // 更新角色
  updateRole: async (id: number, data: UpdateRoleRequest): Promise<ApiResponse<Role>> => {
    const response = await request.put(`/roles/${id}`, data);
    return response;
  },

  // 删除角色
  deleteRole: async (id: number): Promise<ApiResponse<void>> => {
    const response = await request.delete(`/roles/${id}`);
    return response;
  },
};
