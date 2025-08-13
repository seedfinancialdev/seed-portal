import React, { createContext, useContext, useEffect, useReducer, ReactNode } from 'react';
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

type NavigationState = {
  history: string[];
  currentIndex: number;
};

type NavigationAction = 
  | { type: 'INITIALIZE'; location: string }
  | { type: 'NAVIGATE'; location: string }
  | { type: 'GO_BACK' }
  | { type: 'GO_FORWARD' }
  | { type: 'SET_INDEX'; index: number }
  | { type: 'CLEAR' };

function navigationReducer(state: NavigationState, action: NavigationAction): NavigationState {
  switch (action.type) {
    case 'INITIALIZE':
      return {
        history: [action.location],
        currentIndex: 0
      };
    
    case 'NAVIGATE':
      if (state.history.length === 0) {
        return {
          history: [action.location],
          currentIndex: 0
        };
      }
      
      const lastLocation = state.history[state.currentIndex];
      if (action.location === lastLocation) {
        return state; // No change
      }
      
      // Remove forward history and add new location
      const newHistory = state.history.slice(0, state.currentIndex + 1);
      newHistory.push(action.location);
      
      return {
        history: newHistory,
        currentIndex: newHistory.length - 1
      };
    
    case 'GO_BACK':
      if (state.currentIndex > 0) {
        return {
          ...state,
          currentIndex: state.currentIndex - 1
        };
      }
      return state;
    
    case 'GO_FORWARD':
      if (state.currentIndex < state.history.length - 1) {
        return {
          ...state,
          currentIndex: state.currentIndex + 1
        };
      }
      return state;
    
    case 'SET_INDEX':
      return {
        ...state,
        currentIndex: action.index
      };
    
    case 'CLEAR':
      return {
        history: [],
        currentIndex: -1
      };
    
    default:
      return state;
  }
}

export function NavigationHistoryProvider({ children }: NavigationHistoryProviderProps) {
  const [location, setLocation] = useLocation();
  const [state, dispatch] = useReducer(navigationReducer, {
    history: [],
    currentIndex: -1
  });

  // Track location changes
  useEffect(() => {
    if (!location) return;
    
    if (state.history.length === 0) {
      dispatch({ type: 'INITIALIZE', location });
    } else {
      dispatch({ type: 'NAVIGATE', location });
    }
  }, [location]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const currentPath = window.location.pathname;
      const historyIndex = state.history.indexOf(currentPath);
      
      if (historyIndex !== -1) {
        dispatch({ type: 'SET_INDEX', index: historyIndex });
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [state.history]);

  const canGoBack = state.currentIndex > 0;
  const canGoForward = state.currentIndex < state.history.length - 1;

  const goBack = () => {
    if (canGoBack) {
      const previousPath = state.history[state.currentIndex - 1];
      dispatch({ type: 'GO_BACK' });
      setLocation(previousPath);
      window.history.pushState(null, '', previousPath);
    }
  };

  const goForward = () => {
    if (canGoForward) {
      const nextPath = state.history[state.currentIndex + 1];
      dispatch({ type: 'GO_FORWARD' });
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
    dispatch({ type: 'CLEAR' });
  };

  const value: NavigationHistoryState = {
    history: state.history,
    currentIndex: state.currentIndex,
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