import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Clone the response so we can read it without consuming the original
    const clonedRes = res.clone();
    const text = (await clonedRes.text()) || res.statusText;
    
    // ENHANCED DEBUGGING for authentication issues
    console.error('[ApiRequest] ❌ HTTP Error:', {
      status: res.status,
      statusText: res.statusText,
      url: res.url,
      text: text,
      headers: Object.fromEntries(res.headers.entries()),
      cookiesInResponse: res.headers.get('set-cookie'),
      timestamp: new Date().toISOString()
    });
    
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

    // CRITICAL: Log frontend request details for debugging
    console.log('[ApiRequest] 🚀 Frontend request details:', {
      url,
      method,
      hasCredentials: requestOptions.credentials === 'include',
      headers: requestOptions.headers,
      cookiesAvailable: document.cookie ? 'YES' : 'NO',
      cookieSnippet: document.cookie.substring(0, 100),
      location: window.location.href,
      origin: window.location.origin,
      protocol: window.location.protocol,
      userAgent: navigator.userAgent.substring(0, 50),
      timestamp: new Date().toISOString()
    });

    const response = await fetch(url, requestOptions);
    
    // Log response details for debugging
    console.log('[ApiRequest] 📥 Response details:', {
      url,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      cookiesSet: response.headers.get('set-cookie'),
      timestamp: new Date().toISOString()
    });
    
    await throwIfResNotOk(response);
    return await response.json();
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

  // CRITICAL: Log frontend request details for debugging (new signature)
  console.log('[ApiRequest] 🚀 Frontend request details (new sig):', {
    url,
    method,
    hasCredentials: requestOptions.credentials === 'include',
    headers: requestOptions.headers,
    cookiesAvailable: document.cookie ? 'YES' : 'NO',
    cookieSnippet: document.cookie.substring(0, 100),
    timestamp: new Date().toISOString()
  });

  const response = await fetch(url, requestOptions);
  
  // Log response details for debugging (new signature)
  console.log('[ApiRequest] 📥 Response details (new sig):', {
    url,
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries()),
    cookiesSet: response.headers.get('set-cookie'),
    timestamp: new Date().toISOString()
  });
  
  await throwIfResNotOk(response);
  return await response.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey.join("/") as string;
    
    // CRITICAL: Log query function request details
    console.log('[QueryFn] 🔍 Query request details:', {
      url,
      queryKey,
      cookiesAvailable: document.cookie ? 'YES' : 'NO',
      cookieSnippet: document.cookie.substring(0, 100),
      timestamp: new Date().toISOString()
    });
    
    const res = await fetch(url, {
      credentials: "include", // Session cookies only, no OAuth token
    });

    // Log query function response details
    console.log('[QueryFn] 📥 Query response details:', {
      url,
      status: res.status,
      statusText: res.statusText,
      headers: Object.fromEntries(res.headers.entries()),
      cookiesSet: res.headers.get('set-cookie'),
      timestamp: new Date().toISOString()
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      console.log('[QueryFn] ⚠️ 401 detected, returning null');
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
