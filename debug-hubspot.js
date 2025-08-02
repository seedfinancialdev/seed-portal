// Quick HubSpot debug check
const fs = require('fs');

// Check environment variables
console.log('🔍 Checking HubSpot configuration...');
console.log('HUBSPOT_ACCESS_TOKEN exists:', !!process.env.HUBSPOT_ACCESS_TOKEN);
console.log('HUBSPOT_ACCESS_TOKEN length:', process.env.HUBSPOT_ACCESS_TOKEN?.length || 0);

// Test basic HubSpot API call
if (process.env.HUBSPOT_ACCESS_TOKEN) {
  fetch('https://api.hubapi.com/crm/v3/pipelines/deals', {
    headers: {
      'Authorization': `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    }
  })
  .then(response => {
    console.log('HubSpot API Response Status:', response.status);
    if (!response.ok) {
      return response.text().then(text => {
        console.log('HubSpot API Error:', text);
      });
    }
    return response.json();
  })
  .then(data => {
    if (data) {
      console.log('✅ HubSpot API connection successful');
      console.log('Pipelines found:', data.results?.length || 0);
    }
  })
  .catch(error => {
    console.log('❌ HubSpot API connection failed:', error.message);
  });
} else {
  console.log('❌ HUBSPOT_ACCESS_TOKEN not found');
}