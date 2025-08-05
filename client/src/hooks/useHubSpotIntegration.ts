import { useState } from 'react';
import { apiRequest } from '@/lib/queryClient';

interface HubSpotContact {
  companyName?: string;
  [key: string]: any;
}

export function useHubSpotIntegration() {
  const [hubspotVerificationStatus, setHubspotVerificationStatus] = useState<'idle' | 'verifying' | 'verified' | 'not-found'>('idle');
  const [hubspotContact, setHubspotContact] = useState<HubSpotContact | null>(null);
  const [lastVerifiedEmail, setLastVerifiedEmail] = useState('');
  const [verificationTimeoutId, setVerificationTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const verifyHubSpotEmail = async (email: string) => {
    if (!email || email === lastVerifiedEmail) return;
    
    // Clear any pending verification timeout
    if (verificationTimeoutId) {
      clearTimeout(verificationTimeoutId);
    }
    
    setHubspotVerificationStatus('verifying');
    setLastVerifiedEmail(email);
    
    try {
      // Check for existing quotes and verify HubSpot contact in parallel
      const [hubspotResponse, existingQuotesResponse] = await Promise.all([
        apiRequest('POST', '/api/hubspot/verify-contact', { email }),
        apiRequest('POST', '/api/quotes/check-existing', { email })
      ]);

      const hubspotData = await hubspotResponse.json();
      const existingQuotesData = await existingQuotesResponse.json();

      if (hubspotData.verified && hubspotData.contact) {
        setHubspotVerificationStatus('verified');
        setHubspotContact(hubspotData.contact);
      } else {
        setHubspotVerificationStatus('not-found');
        setHubspotContact(null);
      }

      return {
        hubspotData,
        existingQuotesData
      };
    } catch (error) {
      console.error('Error verifying HubSpot email:', error);
      setHubspotVerificationStatus('not-found');
      setHubspotContact(null);
      throw error;
    }
  };

  const pushQuoteToHubSpot = async (quoteId: number) => {
    try {
      console.log('[HubSpot] Attempting to push quote ID:', quoteId);
      const response = await apiRequest('POST', '/api/hubspot/push-quote', { quoteId });
      const result = await response.json();
      console.log('[HubSpot] Push successful:', result);
      return result;
    } catch (error: any) {
      console.error('[HubSpot] Error pushing quote to HubSpot:', error);
      console.error('[HubSpot] Error details:', {
        message: error?.message,
        status: error?.status,
        statusText: error?.statusText,
        body: error?.body
      });
      
      // Try to extract more meaningful error message
      let errorMessage = 'Failed to push quote to HubSpot';
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.body) {
        errorMessage = error.body;
      } else if (error?.statusText) {
        errorMessage = error.statusText;
      }
      
      // Re-throw with better error message
      const enhancedError = new Error(errorMessage);
      enhancedError.name = 'HubSpotPushError';
      throw enhancedError;
    }
  };

  return {
    hubspotVerificationStatus,
    hubspotContact,
    lastVerifiedEmail,
    verifyHubSpotEmail,
    pushQuoteToHubSpot,
    setVerificationTimeoutId
  };
}