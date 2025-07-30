import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Helper to get authorization header
function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('google_access_token');
  if (token) {
    return { 'Authorization': `Bearer ${token}` };
  }
  return {};
}

export async function apiRequest(
  url: string,
  options?: {
    method?: string;
    body?: string;
    headers?: Record<string, string>;
  }
): Promise<any> {
  const { method = 'GET', body, headers = {} } = options || {};
  
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
      ...headers,
    },
    body,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return await res.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      headers: {
        ...getAuthHeader(),
      },
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 1 * 60 * 1000, // 1 minute for faster initial loads
      gcTime: 5 * 60 * 1000, // Garbage collect after 5 minutes
      retry: (failureCount, error) => {
        // Don't retry on authentication errors or client errors
        if (error instanceof Error && error.message.includes('401')) return false;
        if (error instanceof Error && error.message.includes('4')) return false; // Any 4xx error
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: (failureCount, error) => {
        // Only retry network errors, not business logic errors
        if (error instanceof Error && error.message.includes('Network')) return failureCount < 2;
        return false;
      },
      onError: (error) => {
        // Only log unexpected errors, not auth/validation errors
        if (error instanceof Error && 
            !error.message.includes('401') && 
            !error.message.includes('400') &&
            !error.message.includes('422')) {
          console.error('Unexpected mutation error:', error.message);
        }
      },
    },
  },
});
