import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useLocation } from 'wouter';

interface NavigationHistoryState {
  history: string[];
  currentIndex: number;
  canGoBack: boolean;
  canGoForward: boolean;
  goBack: () => void;
  goForward: () => void;
  navigateTo: (path: string) => void;
  clearHistory: () => void;
}

const NavigationHistoryContext = createContext<NavigationHistoryState | undefined>(undefined);

interface NavigationHistoryProviderProps {
  children: ReactNode;
}

export function NavigationHistoryProvider({ children }: NavigationHistoryProviderProps) {
  const [location, setLocation] = useLocation();
  const [history, setHistory] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  // Initialize history with current location only once
  useEffect(() => {
    if (history.length === 0 && location) {
      setHistory([location]);
      setCurrentIndex(0);
    }
  }, [location]);

  // Track location changes and update history
  useEffect(() => {
    if (!location) return;
    
    // Initialize history if empty
    if (history.length === 0) {
      setHistory([location]);
      setCurrentIndex(0);
      return;
    }
    
    const lastLocation = history[currentIndex];
    
    // Only add to history if it's a different location
    if (location !== lastLocation) {
      // Remove any forward history when navigating to a new location
      setHistory(prevHistory => {
        const newHistory = prevHistory.slice(0, currentIndex + 1);
        newHistory.push(location);
        return newHistory;
      });
      setCurrentIndex(currentIndex + 1);
    }
  }, [location]); // Only depend on location

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // Browser back/forward was used - sync our history
      const currentPath = window.location.pathname;
      const historyIndex = history.indexOf(currentPath);
      
      if (historyIndex !== -1) {
        setCurrentIndex(historyIndex);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [history]);

  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < history.length - 1;

  const goBack = () => {
    if (canGoBack) {
      const newIndex = currentIndex - 1;
      const previousPath = history[newIndex];
      setCurrentIndex(newIndex);
      setLocation(previousPath);
      
      // Update browser history
      window.history.pushState(null, '', previousPath);
    }
  };

  const goForward = () => {
    if (canGoForward) {
      const newIndex = currentIndex + 1;
      const nextPath = history[newIndex];
      setCurrentIndex(newIndex);
      setLocation(nextPath);
      
      // Update browser history
      window.history.pushState(null, '', nextPath);
    }
  };

  const navigateTo = (path: string) => {
    setLocation(path);
    // History will be updated by the useEffect above
  };

  const clearHistory = () => {
    setHistory([location]);
    setCurrentIndex(0);
  };

  const value: NavigationHistoryState = {
    history,
    currentIndex,
    canGoBack,
    canGoForward,
    goBack,
    goForward,
    navigateTo,
    clearHistory,
  };

  return (
    <NavigationHistoryContext.Provider value={value}>
      {children}
    </NavigationHistoryContext.Provider>
  );
}

export function useNavigationHistory() {
  const context = useContext(NavigationHistoryContext);
  if (context === undefined) {
    throw new Error('useNavigationHistory must be used within a NavigationHistoryProvider');
  }
  return context;
}

// Hook for easy back navigation
export function useBackNavigation() {
  const { goBack, canGoBack, history, currentIndex } = useNavigationHistory();
  
  const getPreviousPage = () => {
    if (canGoBack && currentIndex > 0) {
      return history[currentIndex - 1];
    }
    return null;
  };

  return {
    goBack,
    canGoBack,
    previousPage: getPreviousPage(),
  };
}