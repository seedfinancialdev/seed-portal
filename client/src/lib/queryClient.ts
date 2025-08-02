import { QueryClient } from "@tanstack/react-query";

// Base URL helper
export const getBaseUrl = () => {
  console.log("🌐 getBaseUrl called - returning empty string for relative URLs");
  return "";
};

// API request helper
export const apiRequest = async (url: string, options: RequestInit = {}) => {
  const baseUrl = getBaseUrl();
  const fullUrl = `${baseUrl}${url}`;
  
  console.log("🌐 About to send request (old signature):", {
    method: options.method || "GET",
    originalUrl: url,
    baseUrl,
    fullUrl,
    headers: options.headers
  });

  const response = await fetch(fullUrl, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  console.log("🌐 Response received (old signature):", {
    status: response.status,
    statusText: response.statusText,
    url: response.url
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};

// Query client with default fetcher
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const url = Array.isArray(queryKey) ? queryKey[0] : queryKey;
        return apiRequest(url as string);
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
    mutations: {
      retry: 1,
    },
  },
});