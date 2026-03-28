// Define and export the data structure
export interface TemplateRollout {
  key: string;
  activeVersion: string;
  canaryVersion?: string;
  canaryPercentage: number;
  status: 'healthy' | 'unstable' | 'failed';
  lastValidationFailure?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || `API Error: ${response.status}`);
  }

  if (response.status === 204) return {} as T;
  return response.json();
}

export const rolloutApi = {
  getTemplates: () => fetchApi<TemplateRollout[]>('/admin/templates'),
  updateCanary: (key: string, percentage: number) => 
    fetchApi(`/admin/templates/${key}/canary`, { 
      method: 'PATCH', 
      body: JSON.stringify({ percentage }) 
    }),
  promote: (key: string) => fetchApi(`/admin/templates/${key}/promote`, { method: 'POST' }),
  rollback: (key: string) => fetchApi(`/admin/templates/${key}/rollback`, { method: 'POST' }),
  killSwitch: (key: string) => fetchApi(`/admin/templates/${key}/kill`, { method: 'POST' }),
};