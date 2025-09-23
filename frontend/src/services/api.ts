import { CreateRoomRequest, CreateRoomResponse, Room } from '../types';

// Use current location for API calls - all traffic goes through frontend nginx
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    console.log(`[API] Using VITE_API_URL: ${import.meta.env.VITE_API_URL}`);
    return import.meta.env.VITE_API_URL;
  }
  
  // Use current location - nginx will proxy backend requests
  const currentLocation = window.location;
  const apiUrl = `${currentLocation.protocol}//${currentLocation.hostname}${currentLocation.port ? `:${currentLocation.port}` : ''}`;
  
  console.log(`[API] Current location:`, {
    href: currentLocation.href,
    hostname: currentLocation.hostname,
    port: currentLocation.port,
    protocol: currentLocation.protocol
  });
  console.log(`[API] Generated API URL: ${apiUrl}`);
  
  return apiUrl;
};

export class ApiService {
  private static async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const apiBaseUrl = getApiBaseUrl();
    const url = `${apiBaseUrl}${endpoint}`;
    
    console.log(`[API] Making request to: ${url}`);
    console.log(`[API] Current location: ${window.location.href}`);
    console.log(`[API] Request options:`, options);
    
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      console.log(`[API] Response status: ${response.status} ${response.statusText}`);
      console.log(`[API] Response headers:`, Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error(`[API] Request failed: ${url} - ${response.status} - ${error.error || 'Unknown error'}`);
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log(`[API] Response data:`, data);
      return data;
    } catch (error) {
      console.error(`[API] Network error for ${url}:`, error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error(`Network error: Unable to connect to ${apiBaseUrl}. Please check if the backend server is running.`);
      }
      throw error;
    }
  }

  static async createRoom(data: CreateRoomRequest): Promise<CreateRoomResponse> {
    return this.request<CreateRoomResponse>('/api/rooms/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async getRoom(roomId: string): Promise<Room> {
    return this.request<Room>(`/api/rooms/${roomId}`);
  }

  static async checkRoomExists(roomId: string): Promise<{ exists: boolean }> {
    return this.request<{ exists: boolean }>(`/api/rooms/${roomId}/exists`);
  }

  static async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.request<{ status: string; timestamp: string }>('/health');
  }

  static async testConnectivity(): Promise<void> {
    const apiBaseUrl = getApiBaseUrl();
    console.log(`[API] Testing connectivity to: ${apiBaseUrl}`);
    
    try {
      // Test basic connectivity
      const response = await fetch(`${apiBaseUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`[API] Connectivity test successful:`, data);
      } else {
        console.error(`[API] Connectivity test failed: ${response.status} ${response.statusText}`);
        throw new Error(`Backend server responded with ${response.status}`);
      }
    } catch (error) {
      console.error(`[API] Connectivity test error:`, error);
      throw new Error(`Cannot connect to backend at ${apiBaseUrl}. Please ensure the backend server is running and accessible.`);
    }
  }
}
