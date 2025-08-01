/**
 * Storage Service (Box Implementation)
 * 
 * This is the "doorway" file for our cloud storage integration.
 * If we ever switch from Box to another provider, we only need to rewrite this file.
 */

import BoxSDK from 'box-node-sdk';
import { logger } from '../logger';
import type { ServiceHealthResult } from './index';

export interface StorageFolder {
  id: string;
  name: string;
  path: string;
  parentId?: string;
}

export interface StorageFile {
  id: string;
  name: string;
  size: number;
  downloadUrl?: string;
  folderId: string;
}

export class StorageService {
  private client: any;
  private serviceAccountClient: any;

  constructor() {
    if (!process.env.BOX_CLIENT_ID || !process.env.BOX_CLIENT_SECRET) {
      logger.warn('Box configuration missing in environment variables - Storage service will be disabled');
      // Don't throw error - allow service to be created but mark as unavailable
      this.serviceAccountClient = null;
      this.client = null;
      return;
    }

    try {
      // Temporary configuration to handle current credential setup
      // The user needs to provide proper Box JWT credentials
      logger.warn('Box service temporarily disabled - requires proper JWT configuration');
      logger.info('Current Box credential setup detected but needs JWT format');
      
      // For now, disable the service gracefully
      this.serviceAccountClient = null;
      this.client = null;
      
      // Future implementation when proper credentials are provided:
      /*
      const sdk = new BoxSDK({
        clientID: process.env.BOX_CLIENT_ID!,
        clientSecret: process.env.BOX_CLIENT_SECRET!,
        appAuth: {
          keyID: process.env.BOX_KEY_ID!,
          privateKey: process.env.BOX_PRIVATE_KEY!.replace(/\\n/g, '\n'),
          passphrase: process.env.BOX_PASSPHRASE || undefined
        }
      });
      this.serviceAccountClient = sdk.getAppAuthClient('enterprise');
      */
    } catch (error: any) {
      logger.error('Failed to initialize storage service', { error: error.message });
      this.serviceAccountClient = null;
      this.client = null;
    }
  }

  async healthCheck(): Promise<ServiceHealthResult> {
    const startTime = Date.now();
    
    try {
      // Check if service is configured
      if (!this.serviceAccountClient || this.serviceAccountClient === null || this.serviceAccountClient === undefined) {
        return {
          status: 'unhealthy',
          message: 'Storage service not configured - missing Box credentials',
          responseTime: Date.now() - startTime
        };
      }
      
      // Simple health check - get current user info
      await this.serviceAccountClient.users.getCurrentUser();
      return {
        status: 'healthy',
        responseTime: Date.now() - startTime
      };
    } catch (error: any) {
      logger.error('Storage health check failed', { error: error.message });
      
      if (error.statusCode === 429) {
        return { status: 'degraded', message: 'Rate limited' };
      }
      
      return { 
        status: 'unhealthy', 
        message: error.message,
        responseTime: Date.now() - startTime
      };
    }
  }

  async createFolder(parentId: string, name: string): Promise<StorageFolder> {
    if (!this.serviceAccountClient) {
      throw new Error('Storage service not configured');
    }
    
    try {
      const folder = await this.serviceAccountClient.folders.create(parentId, name);
      return {
        id: folder.id,
        name: folder.name,
        path: `/${name}`,
        parentId: folder.parent?.id
      };
    } catch (error: any) {
      logger.error('Failed to create folder', { error: error.message, name, parentId });
      throw new Error(`Storage folder creation failed: ${error.message}`);
    }
  }

  async uploadFile(folderId: string, fileName: string, fileBuffer: Buffer): Promise<StorageFile> {
    if (!this.serviceAccountClient) {
      throw new Error('Storage service not configured');
    }
    
    try {
      const fileStream = require('stream').Readable.from(fileBuffer);
      const file = await this.serviceAccountClient.files.uploadFile(folderId, fileName, fileStream);
      
      return {
        id: file.entries[0].id,
        name: file.entries[0].name,
        size: file.entries[0].size,
        folderId: folderId
      };
    } catch (error: any) {
      logger.error('Failed to upload file', { error: error.message, fileName, folderId });
      throw new Error(`Storage file upload failed: ${error.message}`);
    }
  }

  async getDownloadUrl(fileId: string): Promise<string> {
    if (!this.serviceAccountClient) {
      throw new Error('Storage service not configured');
    }
    
    try {
      const downloadUrl = await this.serviceAccountClient.files.getDownloadURL(fileId);
      return downloadUrl;
    } catch (error: any) {
      logger.error('Failed to get download URL', { error: error.message, fileId });
      throw new Error(`Storage download URL failed: ${error.message}`);
    }
  }

  async createFolder(name: string, parentFolderId = '0'): Promise<StorageFolder> {
    try {
      logger.debug('Creating storage folder', { name, parentFolderId });
      
      const folder = await this.serviceAccountClient.folders.create(parentFolderId, name);
      
      return {
        id: folder.id,
        name: folder.name,
        path: folder.path_collection?.entries?.map((e: any) => e.name).join('/') || name,
        parentId: parentFolderId !== '0' ? parentFolderId : undefined
      };
    } catch (error: any) {
      logger.error('Storage folder creation failed', { name, parentFolderId, error: error.message });
      throw new Error(`Storage folder creation failed: ${error.message}`);
    }
  }

  async uploadFile(fileName: string, fileContent: Buffer, folderId = '0'): Promise<StorageFile> {
    try {
      logger.debug('Uploading file to storage', { fileName, folderId, size: fileContent.length });
      
      const stream = require('stream');
      const fileStream = new stream.PassThrough();
      fileStream.end(fileContent);

      const file = await this.serviceAccountClient.files.uploadFile(folderId, fileName, fileStream);
      
      return {
        id: file.entries[0].id,
        name: file.entries[0].name,
        size: file.entries[0].size,
        folderId
      };
    } catch (error: any) {
      logger.error('Storage file upload failed', { fileName, folderId, error: error.message });
      throw new Error(`Storage upload failed: ${error.message}`);
    }
  }

  async copyFile(sourceFileId: string, targetFolderId: string, newName?: string): Promise<StorageFile> {
    try {
      logger.debug('Copying file in storage', { sourceFileId, targetFolderId, newName });
      
      const copiedFile = await this.serviceAccountClient.files.copy(sourceFileId, targetFolderId, { name: newName });
      
      return {
        id: copiedFile.id,
        name: copiedFile.name,
        size: copiedFile.size,
        folderId: targetFolderId
      };
    } catch (error: any) {
      logger.error('Storage file copy failed', { sourceFileId, targetFolderId, error: error.message });
      throw new Error(`Storage copy failed: ${error.message}`);
    }
  }

  async renameFile(fileId: string, newName: string): Promise<StorageFile> {
    try {
      logger.debug('Renaming file in storage', { fileId, newName });
      
      const updatedFile = await this.serviceAccountClient.files.update(fileId, { name: newName });
      
      return {
        id: updatedFile.id,
        name: updatedFile.name,
        size: updatedFile.size,
        folderId: updatedFile.parent.id
      };
    } catch (error: any) {
      logger.error('Storage file rename failed', { fileId, newName, error: error.message });
      throw new Error(`Storage rename failed: ${error.message}`);
    }
  }

  async getFolderContents(folderId = '0'): Promise<{ folders: StorageFolder[]; files: StorageFile[] }> {
    try {
      logger.debug('Getting storage folder contents', { folderId });
      
      const items = await this.serviceAccountClient.folders.getItems(folderId);
      
      const folders: StorageFolder[] = items.entries
        .filter((item: any) => item.type === 'folder')
        .map((folder: any) => ({
          id: folder.id,
          name: folder.name,
          path: folder.path_collection?.entries?.map((e: any) => e.name).join('/') || folder.name,
          parentId: folderId !== '0' ? folderId : undefined
        }));

      const files: StorageFile[] = items.entries
        .filter((item: any) => item.type === 'file')
        .map((file: any) => ({
          id: file.id,
          name: file.name,
          size: file.size,
          folderId
        }));

      return { folders, files };
    } catch (error: any) {
      logger.error('Storage folder contents retrieval failed', { folderId, error: error.message });
      throw new Error(`Storage listing failed: ${error.message}`);
    }
  }

  async getDownloadUrl(fileId: string): Promise<string> {
    try {
      logger.debug('Getting download URL for file', { fileId });
      
      const downloadUrl = await this.serviceAccountClient.files.getDownloadURL(fileId);
      return downloadUrl;
    } catch (error: any) {
      logger.error('Storage download URL generation failed', { fileId, error: error.message });
      throw new Error(`Download URL generation failed: ${error.message}`);
    }
  }
}