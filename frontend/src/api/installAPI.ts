import request from './request';

export interface InstallCheck {
  key: string;
  label: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
}

export interface InstallStatus {
  installed: boolean;
  lockFile: string;
  lockedAt?: string;
}

export interface DatabaseConfigPayload {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  backendPort?: number;
  corsOrigin?: string;
  chromePath?: string;
  jwtSecret?: string;
}

export interface AdminPayload {
  username: string;
  password: string;
  nickname?: string;
}

export const installAPI = {
  getStatus(): Promise<{ success: boolean; data: InstallStatus; message: string }> {
    return request.get('/install/status');
  },

  runCheck(): Promise<{ success: boolean; data: InstallCheck[]; message: string }> {
    return request.post('/install/check');
  },

  configureDatabase(payload: DatabaseConfigPayload): Promise<{ success: boolean; data: any; message: string }> {
    return request.post('/install/database', payload);
  },

  importBaselineData(bundle: any): Promise<{ success: boolean; data: any; message: string }> {
    return request.post('/install/baseline-data', bundle);
  },

  createAdmin(payload: AdminPayload): Promise<{ success: boolean; data: any; message: string }> {
    return request.post('/install/admin', payload);
  },

  finalize(): Promise<{ success: boolean; data: InstallStatus; message: string }> {
    return request.post('/install/finalize');
  },
};
