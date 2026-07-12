import request from './request';

export interface OzonBrowserWorker {
  id: number;
  name: string;
  status: 'online' | 'offline' | 'disabled';
  capabilities?: string[];
  lastSeenAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateOzonWorkerResponse {
  token: string;
  worker: OzonBrowserWorker;
}

export const ozonWorkerAPI = {
  listWorkers: async (): Promise<{ success: boolean; data: OzonBrowserWorker[]; message?: string }> => {
    const response = await request.get('/ozon/browser/workers');
    return {
      success: response.success,
      data: response.data || [],
      message: response.message,
    };
  },

  createWorker: async (name: string): Promise<{ success: boolean; data?: CreateOzonWorkerResponse; message?: string }> => {
    const response = await request.post('/ozon/browser/workers', { name });
    return {
      success: response.success,
      data: response.data,
      message: response.message,
    };
  },
};
