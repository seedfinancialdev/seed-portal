import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    console.error('[ApiRequest] ❌ HTTP Error:', res.status, text);
    throw new Error(`${res.status}: ${text}`);
  }
}

// Overloaded function to support both old and new calling patterns
export async function apiRequest(
  urlOrMethod: string,
  optionsOrUrl?: any,
  dataOrUndefined?: any
): Promise<Response> {
  let method: string;
  let url: string;
  let data: any;

  // Check if called with new signature: apiRequest(method, url, data)
  if (typeof optionsOrUrl === 'string' && dataOrUndefined !== undefined) {
    method = urlOrMethod;
    url = optionsOrUrl;
    data = dataOrUndefined;
  }
  // Check if called with new signature: apiRequest(method, url)
  else if (typeof optionsOrUrl === 'string' && dataOrUndefined === undefined) {
    method = urlOrMethod;
    url = optionsOrUrl;
    data = undefined;
  }
  // Old signature: apiRequest(url, options)
  else {
    url = urlOrMethod;
    const options = optionsOrUrl || {};
    method = options.method || 'GET';
    // Handle both raw data objects and pre-stringified JSON bodies
    if (options.body) {
      if (typeof options.body === 'string') {
        data = options.body; // Already stringified
      } else {
        data = options.body; // Raw object, will be stringified later
      }
    }
    
    // Build request options with custom headers support
    const requestOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}), // Merge custom headers (like Authorization)
      },
      credentials: 'include', // This sends session cookies for authentication
    };

    // Handle body based on whether it's already stringified or not
    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      requestOptions.body = typeof data === 'string' ? data : JSON.stringify(data);
    }

    const response = await fetch(url, requestOptions);
    
    return response;
  }

  // For new signature calls, build standard request options
  const requestOptions: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // This sends session cookies for authentication
  };

  if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    requestOptions.body = JSON.stringify(data);
  }

  const response = await fetch(url, requestOptions);
  return response;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include", // Session cookies only, no OAuth token
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
