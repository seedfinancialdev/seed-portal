/**
 * Box Integration for Client Folder Management and Document Automation
 */

import BoxSDK from 'box-node-sdk';
import { logger } from './logger';

// Initialize Box SDK with App Auth (JWT)
const sdk = BoxSDK.getBasicTokenBox(process.env.BOX_ACCESS_TOKEN);

export class BoxService {
  private client: any;

  constructor() {
    this.client = sdk;
  }

  /**
   * Create client folder structure in Box based on template
   * @param clientName - Business name for folder creation
   * @param templateFolderId - Template folder to copy from
   * @returns Created folder information
   */
  async createClientFolder(clientName: string, templateFolderId?: string): Promise<any> {
    try {
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

      const clientFolder = await this.client.folders.create(parentFolderId, sanitizedClientName);
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
    } catch (error) {
      logger.error('[Box] Error creating client folder', error);
      throw new Error(`Failed to create client folder: ${error.message}`);
    }
  }

  /**
   * Copy folder structure from template to client folder
   */
  private async copyFolderStructure(sourceId: string, destinationId: string): Promise<void> {
    try {
      const sourceItems = await this.client.folders.getItems(sourceId);
      
      for (const item of sourceItems.entries) {
        if (item.type === 'folder') {
          // Copy subfolder
          const newFolder = await this.client.folders.create(destinationId, item.name);
          // Recursively copy contents
          await this.copyFolderStructure(item.id, newFolder.id);
        } else if (item.type === 'file') {
          // Copy file
          await this.client.files.copy(item.id, destinationId);
        }
      }

      logger.info('[Box] Template folder structure copied', { sourceId, destinationId });
    } catch (error) {
      logger.error('[Box] Error copying folder structure', error);
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
      logger.info('[Box] Uploading MSA document', { folderId, fileName });

      const uploadedFile = await this.client.files.uploadFile(
        folderId,
        fileName,
        msaBuffer
      );

      logger.info('[Box] MSA document uploaded successfully', { 
        fileId: uploadedFile.entries[0].id,
        fileName: uploadedFile.entries[0].name 
      });

      return {
        success: true,
        fileId: uploadedFile.entries[0].id,
        fileName: uploadedFile.entries[0].name,
        webUrl: `https://app.box.com/file/${uploadedFile.entries[0].id}`
      };
    } catch (error) {
      logger.error('[Box] Error uploading MSA document', error);
      throw new Error(`Failed to upload MSA: ${error.message}`);
    }
  }

  /**
   * Upload SOW documents for selected services
   */
  async uploadSOWDocuments(folderId: string, services: string[]): Promise<any[]> {
    try {
      const results = [];

      for (const service of services) {
        const sowTemplate = await this.getSOWTemplate(service);
        if (sowTemplate) {
          const result = await this.client.files.uploadFile(
            folderId,
            `${service}_SOW.docx`,
            sowTemplate
          );
          results.push({
            service,
            fileId: result.entries[0].id,
            fileName: result.entries[0].name
          });
        }
      }

      logger.info('[Box] SOW documents uploaded', { count: results.length, folderId });
      return results;
    } catch (error) {
      logger.error('[Box] Error uploading SOW documents', error);
      throw error;
    }
  }

  /**
   * Get SOW template for specific service type
   */
  private async getSOWTemplate(service: string): Promise<Buffer | null> {
    // Template mapping for different service types
    const templates = {
      'bookkeeping': process.env.BOX_BOOKKEEPING_SOW_TEMPLATE_ID,
      'taas': process.env.BOX_TAAS_SOW_TEMPLATE_ID,
      'payroll': process.env.BOX_PAYROLL_SOW_TEMPLATE_ID,
      'ap_ar_lite': process.env.BOX_APAR_SOW_TEMPLATE_ID,
      'fpa_lite': process.env.BOX_FPA_SOW_TEMPLATE_ID
    };

    const templateId = templates[service as keyof typeof templates];
    if (!templateId) {
      logger.warn('[Box] No SOW template found for service', { service });
      return null;
    }

    try {
      const fileStream = await this.client.files.getReadStream(templateId);
      return this.streamToBuffer(fileStream);
    } catch (error) {
      logger.error('[Box] Error reading SOW template', { service, templateId, error });
      return null;
    }
  }

  /**
   * Convert stream to buffer
   */
  private streamToBuffer(stream: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  /**
   * Sanitize folder name for Box compatibility
   */
  private sanitizeFolderName(name: string): string {
    // Remove invalid characters and limit length
    return name
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 255);
  }
}

export const boxService = new BoxService();