import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    console.error('[ApiRequest] ❌ HTTP Error:', res.status, text);
    throw new Error(`${res.status}: ${text}`);
  }
}

// Global CSRF token cache
let csrfToken: string | null = null;

// Get CSRF token - fetch from dedicated endpoint
async function getCSRFToken(): Promise<string | null> {
  if (csrfToken) return csrfToken;
  
  try {
    // Fetch CSRF token from the dedicated endpoint - also needs base URL in dev
    const csrfUrl = '/api/csrf-token';
    const fullCsrfUrl = csrfUrl.startsWith('http') ? csrfUrl : `${getBaseUrl()}${csrfUrl}`;
    const response = await fetch(fullCsrfUrl, {
      method: 'GET',
      credentials: 'include', // Include session cookies
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.csrfToken) {
        csrfToken = data.csrfToken;
        return data.csrfToken;
      }
    }
  } catch (error) {
    console.warn('Failed to fetch CSRF token:', error);
  }
  
  return null;
}

// Use relative URLs for all API calls - PRODUCTION ONLY
function getBaseUrl(): string {
  console.log('🌐 getBaseUrl called - returning empty string for relative URLs');
  return ''; // Always use relative URLs
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
    
    // Get CSRF token for state-changing requests
    const csrfTokenValue = (method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE') 
      ? await getCSRFToken() : null;
    
    // Build request options with custom headers support
    const requestOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(csrfTokenValue && { 'X-CSRF-Token': csrfTokenValue }), // Add CSRF token for state-changing requests
        ...(options.headers || {}), // Merge custom headers (like Authorization)
      },
      credentials: 'include', // This sends session cookies for authentication
    };

    // Handle body based on whether it's already stringified or not
    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      requestOptions.body = typeof data === 'string' ? data : JSON.stringify(data);
    }

    // Apply base URL - should always be relative now
    const baseUrl = getBaseUrl();
    const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
    
    console.log('🌐 About to send request (old signature):', { 
      method, 
      originalUrl: url,
      baseUrl: baseUrl,
      fullUrl: fullUrl, 
      headers: requestOptions.headers 
    });
    
    const response = await fetch(fullUrl, requestOptions);
    
    console.log('🌐 Response received (old signature):', { 
      status: response.status, 
      statusText: response.statusText,
      url: response.url 
    });
    
    // Log response body for debugging
    if (url === '/api/quotes' && method === 'POST') {
      const clonedResponse = response.clone();
      try {
        const responseText = await clonedResponse.text();
        console.log('🌐 POST /api/quotes response body (old signature):', responseText);
      } catch (e) {
        console.log('🌐 Could not read response body (old signature):', e);
      }
    }
    
    return response;
  }

  // Get CSRF token for state-changing requests
  const csrfTokenValue = (method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE') 
    ? await getCSRFToken() : null;
  
  // For new signature calls, build standard request options
  const requestOptions: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(csrfTokenValue && { 'X-CSRF-Token': csrfTokenValue }), // Add CSRF token for state-changing requests
    },
    credentials: 'include', // This sends session cookies for authentication
  };

  if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    requestOptions.body = JSON.stringify(data);
  }

  // Apply base URL in development mode
  const fullUrl = url.startsWith('http') ? url : `${getBaseUrl()}${url}`;
  
  console.log('🌐 About to send request:', { method, url: fullUrl, headers: requestOptions.headers });
  
  const response = await fetch(fullUrl, requestOptions);
  
  console.log('🌐 Response received:', { 
    status: response.status, 
    statusText: response.statusText,
    url: response.url 
  });
  
  // Log response body for debugging
  if (url === '/api/quotes' && method === 'POST') {
    const clonedResponse = response.clone();
    try {
      const responseText = await clonedResponse.text();
      console.log('🌐 POST /api/quotes response body:', responseText);
    } catch (e) {
      console.log('🌐 Could not read response body:', e);
    }
  }
  
  return response;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey.join("/") as string;
    // Apply base URL redirection for development like other API calls
    const fullUrl = url.startsWith('http') ? url : `${getBaseUrl()}${url}`;
    
    const res = await fetch(fullUrl, {
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
