import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './hooks/use-auth'
import { ThemeProvider } from './components/theme-provider'
import { Toaster } from './components/ui/toaster'
import App from './App'
import './index.css'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// Configure default fetcher
const defaultFetcher = async (url: string) => {
  const response = await fetch(url, {
    credentials: 'include', // Include cookies for authentication
  })
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  
  return response.json()
}

// Set default query function
queryClient.setQueryDefaults([], {
  queryFn: ({ queryKey }) => defaultFetcher(queryKey[0] as string),
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="commission-tracker-theme">
        <AuthProvider>
          <App />
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)