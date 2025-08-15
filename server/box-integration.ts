/**
 * Box Integration for Client Folder Management and Document Automation
 */

import { logger } from './logger';
import { storageService } from './services';

export class BoxService {
  constructor() {}

  /**
   * Create client folder structure in Box based on template
   * @param clientName - Business name for folder creation
   * @param templateFolderId - Template folder to copy from
   * @returns Created folder information
   */
  async createClientFolder(clientName: string, templateFolderId?: string): Promise<any> {
    try {
      const health = await storageService.healthCheck();
      if (health.status === 'unhealthy') {
        throw new Error(health.message || 'Storage service not configured');
      }
      // Default template folder ID (to be configured)
      const defaultTemplateId = process.env.BOX_TEMPLATE_FOLDER_ID || '0';
      const sourceId = templateFolderId || defaultTemplateId;

      logger.info('[Box] Creating client folder structure', { 
        clientName, 
        templateId: sourceId 
      });

      // Create main client folder
      const parentFolderId = process.env.BOX_CLIENT_FOLDERS_PARENT_ID || '0';
      const sanitizedClientName = this.sanitizeFolderName(clientName);

      const clientFolder = await storageService.createFolder(sanitizedClientName, parentFolderId);
      logger.info('[Box] Client folder created', { folderId: clientFolder.id, name: clientFolder.name });

      // Copy template folder structure if specified
      if (sourceId !== '0') {
        await this.copyFolderStructure(sourceId, clientFolder.id);
      }

      return {
        success: true,
        folderId: clientFolder.id,
        folderName: clientFolder.name,
        webUrl: `https://app.box.com/folder/${clientFolder.id}`
      };
    } catch (error: any) {
      logger.error('[Box] Error creating client folder', { error: error?.message });
      throw new Error(`Failed to create client folder: ${error.message}`);
    }
  }

  /**
   * Copy folder structure from template to client folder
   */
  private async copyFolderStructure(sourceId: string, destinationId: string): Promise<void> {
    try {
      const { folders, files } = await storageService.getFolderContents(sourceId);

      // First copy files into destination
      for (const file of files) {
        await storageService.copyFile(file.id, destinationId);
      }

      // Then recursively copy subfolders
      for (const folder of folders) {
        const newFolder = await storageService.createFolder(folder.name, destinationId);
        await this.copyFolderStructure(folder.id, newFolder.id);
      }

      logger.info('[Box] Template folder structure copied', { sourceId, destinationId });
    } catch (error: any) {
      logger.error('[Box] Error copying folder structure', { error: error?.message });
      throw error;
    }
  }

  /**
   * Upload MSA document with populated data
   * @param folderId - Client folder ID
   * @param msaBuffer - Generated MSA document buffer
   * @param fileName - File name for the MSA
   */
  async uploadMSA(folderId: string, msaBuffer: Buffer, fileName: string): Promise<any> {
    try {
      const health = await storageService.healthCheck();
      if (health.status === 'unhealthy') {
        throw new Error(health.message || 'Storage service not configured');
      }
      logger.info('[Box] Uploading MSA document', { folderId, fileName });

      const uploadedFile = await storageService.uploadFile(fileName, msaBuffer, folderId);

      logger.info('[Box] MSA document uploaded successfully', { 
        fileId: uploadedFile.id,
        fileName: uploadedFile.name 
      });

      return {
        success: true,
        fileId: uploadedFile.id,
        fileName: uploadedFile.name,
        webUrl: `https://app.box.com/file/${uploadedFile.id}`
      };
    } catch (error: any) {
      logger.error('[Box] Error uploading MSA document', { error: error?.message });
      throw new Error(`Failed to upload MSA: ${error.message}`);
    }
  }

  /**
   * Upload SOW documents for selected services
   */
  async uploadSOWDocuments(folderId: string, services: string[]): Promise<any[]> {
    try {
      const health = await storageService.healthCheck();
      if (health.status === 'unhealthy') {
        throw new Error(health.message || 'Storage service not configured');
      }
      const results = [];

      const templates: Record<string, string | undefined> = {
        'bookkeeping': process.env.BOX_BOOKKEEPING_SOW_TEMPLATE_ID,
        'taas': process.env.BOX_TAAS_SOW_TEMPLATE_ID,
        'payroll': process.env.BOX_PAYROLL_SOW_TEMPLATE_ID,
        'ap_ar_lite': process.env.BOX_APAR_SOW_TEMPLATE_ID,
        'fpa_lite': process.env.BOX_FPA_SOW_TEMPLATE_ID
      };

      for (const service of services) {
        const templateId = templates[service];
        if (!templateId) {
          logger.warn('[Box] No SOW template found for service', { service });
          continue;
        }

        const copied = await storageService.copyFile(templateId, folderId, `${service}_SOW.docx`);
        results.push({
          service,
          fileId: copied.id,
          fileName: copied.name
        });
      }

      logger.info('[Box] SOW documents uploaded', { count: results.length, folderId });
      return results;
    } catch (error: any) {
      logger.error('[Box] Error uploading SOW documents', { error: error?.message });
      throw error;
    }
  }

  /**
   * Sanitize folder name for Box compatibility
   */
  private sanitizeFolderName(name: string): string {
    // Remove invalid characters and limit length
    return name
      .replace(/[<>:\"/\\|?*]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 255);
  }
}

export const boxService = new BoxService();