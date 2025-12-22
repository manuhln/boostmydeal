import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    if (res.status === 401) {
      console.log('401 error detected - clearing token and redirecting to login');
      // Handle unauthorized - remove token and redirect to login
      localStorage.removeItem('authToken');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
        window.location.href = '/login';
      }
    }
    
    let errorMessage = `${res.status}: ${res.statusText}`;
    try {
      const errorData = await res.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch {
      // Keep the default error message if we can't parse JSON
      const text = (await res.text()) || res.statusText;
      errorMessage = `${res.status}: ${text}`;
    }
    
    throw new Error(errorMessage);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<any> {
  const token = localStorage.getItem('authToken');
  
  const res = await fetch(url, {
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
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
      queryFn: async ({ queryKey }) => {
        const token = localStorage.getItem('authToken');
        console.log('QueryClient - Making request to:', queryKey[0], 'Token exists:', !!token);
        
        const res = await fetch(queryKey[0] as string, {
          credentials: "include",
          headers: {
            ...(token ? { "Authorization": `Bearer ${token}` } : {}),
          },
        });

        console.log('QueryClient - Response status:', res.status);

        if (!res.ok) {
          if (res.status === 401) {
            console.log('QueryClient - 401 error, clearing token');
            localStorage.removeItem('authToken');
            if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
              window.location.href = '/login';
            }
            return null;
          }
          throw new Error(`${res.status}: ${res.statusText}`);
        }

        return res.json();
      },
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
