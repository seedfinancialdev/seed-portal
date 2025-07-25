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
      const response = await apiRequest('POST', '/api/hubspot/push-quote', { quoteId });
      return response.json();
    } catch (error) {
      console.error('Error pushing quote to HubSpot:', error);
      throw error;
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