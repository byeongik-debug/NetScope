let baseUrl = 'http://127.0.0.1:8000';
let accessToken: string | null = null;

export const setApiBaseUrl = (url: string) => {
  baseUrl = url.replace(/\/$/, '');
};

export const getApiBaseUrl = () => baseUrl;
export const setAccessToken = (token: string | null) => { accessToken = token; };
export const getAccessToken = () => accessToken;

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {'Content-Type': 'application/json', ...(accessToken ? {Authorization: `Bearer ${accessToken}`} : {}), ...options?.headers},
    ...options
  });
  if (!response.ok) throw new Error(`API ${response.status}: ${response.statusText}`);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
