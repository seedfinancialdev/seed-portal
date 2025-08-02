#!/usr/bin/env node

// Comprehensive HubSpot Integration Test
// This script tests deal creation, quote creation, and line item management

import { HubSpotService } from './server/hubspot.js';

async function testHubSpotIntegration() {
  console.log('🧪 Starting HubSpot Integration Test...\n');

  try {
    // Initialize HubSpot service
    const hubspotService = new HubSpotService();
    
    // Test 1: Verify HubSpot connection
    console.log('1️⃣ Testing HubSpot Connection...');
    const pipelines = await hubspotService.getPipelines();
    if (pipelines) {
      console.log('✅ HubSpot connection successful');
      console.log(`📊 Found ${pipelines.results?.length || 0} pipelines\n`);
    } else {
      console.log('❌ HubSpot connection failed\n');
      return;
    }

    // Test 2: Test contact verification
    console.log('2️⃣ Testing Contact Verification...');
    const testEmail = 'jonwalls.ins@gmail.com'; // Use existing contact from logs
    const contactResult = await hubspotService.verifyContactByEmail(testEmail);
    if (contactResult.verified && contactResult.contact) {
      console.log('✅ Contact verification successful');
      console.log(`👤 Contact: ${contactResult.contact.properties.firstname} ${contactResult.contact.properties.lastname}`);
      console.log(`🏢 Company: ${contactResult.contact.properties.company || 'No company'}\n`);
    } else {
      console.log('❌ Contact verification failed\n');
      return;
    }

    // Test 3: Test deal creation with enhanced naming
    console.log('3️⃣ Testing Deal Creation...');
    const contact = contactResult.contact;
    const companyName = contact.properties.company || 'Test Company';
    
    // Test different service combinations
    const serviceConfigs = [
      { includesBookkeeping: true, includesTaas: false, name: 'Bookkeeping Only' },
      { includesBookkeeping: false, includesTaas: true, name: 'TaaS Only' },
      { includesBookkeeping: true, includesTaas: true, name: 'Bookkeeping + TaaS' }
    ];

    const dealResults = [];
    for (const config of serviceConfigs) {
      console.log(`  Testing ${config.name}...`);
      
      const dealName = hubspotService.generateDealName(companyName, config);
      console.log(`  Generated deal name: "${dealName}"`);
      
      try {
        const deal = await hubspotService.createDeal(
          contact.id,
          companyName,
          500, // monthlyFee
          1000, // setupFee
          undefined, // ownerId
          config.includesBookkeeping,
          config.includesTaas
        );
        
        if (deal) {
          console.log(`  ✅ Deal created: ${deal.id}`);
          dealResults.push({ config, deal });
        } else {
          console.log(`  ❌ Deal creation failed for ${config.name}`);
        }
      } catch (error) {
        console.log(`  ❌ Deal creation error: ${error.message}`);
      }
    }

    if (dealResults.length === 0) {
      console.log('❌ No deals created successfully\n');
      return;
    }

    console.log(`✅ Created ${dealResults.length} deals successfully\n`);

    // Test 4: Test quote creation and line items
    console.log('4️⃣ Testing Quote Creation...');
    
    for (const { config, deal } of dealResults) {
      console.log(`  Testing quote for ${config.name}...`);
      
      const quoteName = hubspotService.generateQuoteName(companyName, config);
      console.log(`  Generated quote name: "${quoteName}"`);
      
      try {
        const quote = await hubspotService.createQuote(
          deal.id,
          companyName,
          500, // monthlyFee
          1000, // setupFee
          'jon@seedfinancial.io', // userEmail
          'Jon', // firstName
          'Wells', // lastName
          config.includesBookkeeping,
          config.includesTaas,
          config.includesTaas ? 300 : undefined, // taasMonthlyFee
          config.includesTaas ? 2100 : undefined, // taasPriorYearsFee
          config.includesBookkeeping ? 250 : undefined, // bookkeepingMonthlyFee
          config.includesBookkeeping ? 500 : undefined // bookkeepingSetupFee
        );
        
        if (quote) {
          console.log(`  ✅ Quote created: ${quote.id}`);
          console.log(`  📋 Quote title: "${quote.title}"`);
        } else {
          console.log(`  ❌ Quote creation failed for ${config.name}`);
        }
      } catch (error) {
        console.log(`  ❌ Quote creation error: ${error.message}`);
      }
    }

    console.log('\n🎉 HubSpot Integration Test Complete!');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testHubSpotIntegration().catch(console.error);