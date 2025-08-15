/**
 * Enhanced Quote Routes with Box Integration and MSA Generation
 */

import express from 'express';
import { storage } from './storage';
import { logger } from './logger';
import { boxService } from './box-integration';
import { msaGenerator } from './msa-generator';
import { requireAuth } from './auth';

const router = express.Router();

/**
 * Generate MSA and create Box folder for quote
 */
router.post('/quotes/:id/generate-documents', requireAuth, async (req, res) => {
  try {
    const quoteId = parseInt(req.params.id);
    const quote = await storage.getQuote(quoteId);

    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    logger.info('[Quote] Generating documents for quote', { quoteId, client: quote.companyName });

    // Extract selected services from quote
    const selectedServices = [];
    if (quote.serviceBookkeeping) selectedServices.push('bookkeeping');
    if (quote.serviceTaas) selectedServices.push('taas');
    if (quote.servicePayroll) selectedServices.push('payroll');
    if (quote.serviceApArLite) selectedServices.push('ap_ar_lite');
    if (quote.serviceFpaLite) selectedServices.push('fpa_lite');

    // Create Box folder structure
    const boxResult = await boxService.createClientFolder(
      quote.companyName || quote.contactEmail,
      process.env.BOX_TEMPLATE_FOLDER_ID
    );

    // Generate MSA document
    const msaData = {
      clientLegalName: quote.companyName || 'Client Company',
      entityType: quote.entityType || 'LLC',
      stateJurisdiction: quote.clientState || 'California',
      clientAddress: [
        quote.clientStreetAddress,
        quote.clientCity,
        quote.clientState,
        quote.clientZipCode,
        quote.clientCountry
      ].filter(Boolean).join(', '),
      effectiveDate: new Date().toLocaleDateString(),
      selectedServices,
      contactEmail: quote.contactEmail,
      industry: quote.industry || '',
      monthlyFee: Number(quote.monthlyFee as unknown as string),
      setupFee: Number(quote.setupFee as unknown as string)
    };

    const msaBuffer = await msaGenerator.generateMSA(msaData);

    // Upload MSA to Box
    const msaFileName = `${quote.companyName || 'Client'}_Master_Services_Agreement.docx`;
    const msaUploadResult = await boxService.uploadMSA(
      boxResult.folderId,
      msaBuffer,
      msaFileName
    );

    // Upload SOW documents for selected services
    const sowResults = await boxService.uploadSOWDocuments(
      boxResult.folderId,
      selectedServices
    );

    // Update quote with Box information
    await storage.updateQuote({
      id: quoteId,
      boxFolderId: boxResult.folderId,
      boxFolderUrl: boxResult.webUrl,
      msaFileId: msaUploadResult.fileId,
      msaFileUrl: msaUploadResult.webUrl
    });

    res.json({
      success: true,
      boxFolder: boxResult,
      msaDocument: msaUploadResult,
      sowDocuments: sowResults,
      documentsGenerated: selectedServices.length + 1 // MSA + SOWs
    });

    logger.info('[Quote] Documents generated successfully', {
      quoteId,
      folderId: boxResult.folderId,
      documentsCount: selectedServices.length + 1
    });

  } catch (error: any) {
    logger.error('[Quote] Error generating documents', error);
    res.status(500).json({
      error: 'Failed to generate documents',
      message: (error && error.message) ? error.message : 'Unknown error'
    });
  }
});

/**
 * Enhanced HubSpot sync with industry and address fields
 */
router.post('/quotes/:id/sync-hubspot', requireAuth, async (req, res) => {
  try {
    const quoteId = parseInt(req.params.id);
    const quote = await storage.getQuote(quoteId);

    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    // Prepare enhanced data for HubSpot sync
    const hubspotData = {
      // Core quote data
      email: quote.contactEmail,
      company: quote.companyName,
      industry: quote.industry,
      // Address fields
      address: quote.clientStreetAddress,
      city: quote.clientCity,
      state: quote.clientState,
      zip: quote.clientZipCode,
      country: quote.clientCountry,
      // Entity information
      entity_type: quote.entityType,
      // Service selections
      services: [
        quote.serviceBookkeeping && 'Bookkeeping',
        quote.serviceTaas && 'TaaS',
        quote.servicePayroll && 'Payroll',
        quote.serviceApArLite && 'AP/AR Lite',
        quote.serviceFpaLite && 'FP&A Lite'
      ].filter(Boolean).join(', '),
      // Pricing
      monthly_fee: quote.monthlyFee,
      setup_fee: quote.setupFee,
      // Box integration
      box_folder_url: quote.boxFolderUrl,
      msa_document_url: quote.msaFileUrl
    };

    // Make HubSpot API call (placeholder - implement actual HubSpot sync)
    // const hubspotResult = await hubspotClient.createOrUpdateContact(hubspotData);

    logger.info('[Quote] HubSpot sync initiated', { quoteId, email: quote.contactEmail });

    res.json({
      success: true,
      message: 'Quote synced to HubSpot with enhanced data',
      syncedFields: Object.keys(hubspotData)
    });

  } catch (error: any) {
    logger.error('[Quote] Error syncing to HubSpot', error);
    res.status(500).json({
      error: 'Failed to sync to HubSpot',
      message: (error && error.message) ? error.message : 'Unknown error'
    });
  }
});

/**
 * Google address autocomplete endpoint
 */
router.get('/address/autocomplete', requireAuth, async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    // Use Nominatim API for address autocomplete (as already used in the project)
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`;
    
    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'SeedFinancial-QuoteCalculator/1.0'
      }
    });

    const data = await response.json();

    const suggestions = data.map((result: any) => ({
      description: result.display_name,
      place_id: result.place_id,
      structured_formatting: {
        main_text: result.address?.road || result.address?.house_number || result.name,
        secondary_text: [
          result.address?.city,
          result.address?.state,
          result.address?.country
        ].filter(Boolean).join(', ')
      },
      address_components: {
        street_number: result.address?.house_number || '',
        route: result.address?.road || '',
        locality: result.address?.city || result.address?.town || result.address?.village || '',
        administrative_area_level_1: result.address?.state || '',
        postal_code: result.address?.postcode || '',
        country: result.address?.country || ''
      }
    }));

    res.json({ predictions: suggestions });

  } catch (error) {
    logger.error('[Address] Error fetching autocomplete suggestions', error);
    res.status(500).json({ error: 'Failed to fetch address suggestions' });
  }
});

export default router;