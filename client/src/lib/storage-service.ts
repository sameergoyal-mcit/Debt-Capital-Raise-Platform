import { config } from "./config";

export interface FileUploadResult {
  url: string;
  path: string;
  filename: string;
  size: number;
  mimeType: string;
}

export interface StorageProvider {
  uploadFile(file: File, path?: string): Promise<FileUploadResult>;
  getFileUrl(path: string): Promise<string>;
  deleteFile(path: string): Promise<boolean>;
}

// Mock Storage (In-Memory / Local Object URL)
class MockStorageProvider implements StorageProvider {
  private files: Map<string, string> = new Map();

  async uploadFile(file: File, pathPrefix: string = "uploads"): Promise<FileUploadResult> {
    console.group("📂 [Mock Storage] Uploading File");
    console.log("File:", file.name);
    console.log("Size:", file.size);
    console.log("Type:", file.type);
    console.groupEnd();

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 600));

    // Create a local object URL to simulate a hosted file
    const objectUrl = URL.createObjectURL(file);
    const path = `${pathPrefix}/${Date.now()}_${file.name}`;
    
    this.files.set(path, objectUrl);

    return {
      url: objectUrl,
      path: path,
      filename: file.name,
      size: file.size,
      mimeType: file.type
    };
  }

  async getFileUrl(path: string): Promise<string> {
    const url = this.files.get(path);
    if (!url) {
      console.warn(`[Mock Storage] File not found at path: ${path}`);
      return "";
    }
    return url;
  }

  async deleteFile(path: string): Promise<boolean> {
    console.log(`[Mock Storage] Deleting file at ${path}`);
    return this.files.delete(path);
  }
}

// AWS S3 Stub
class S3StorageProvider implements StorageProvider {
  async uploadFile(file: File, path?: string): Promise<FileUploadResult> {
    console.warn("⚠️ S3 Storage not implemented in mock mode");
    throw new Error("S3 Provider not configured");
  }

  async getFileUrl(path: string): Promise<string> {
    return `https://s3.amazonaws.com/bucket/${path}`;
  }

  async deleteFile(path: string): Promise<boolean> {
    return true;
  }
}

// Box Stub
class BoxStorageProvider implements StorageProvider {
  async uploadFile(file: File, path?: string): Promise<FileUploadResult> {
    console.warn("⚠️ Box Storage not implemented in mock mode");
    throw new Error("Box Provider not configured");
  }

  async getFileUrl(path: string): Promise<string> {
    return `https://app.box.com/file/${path}`;
  }

  async deleteFile(path: string): Promise<boolean> {
    return true;
  }
}

// Factory
function createStorageProvider(): StorageProvider {
  switch (config.storageProvider) {
    case 's3':
      return new S3StorageProvider();
    case 'box':
      return new BoxStorageProvider();
    case 'mock':
    default:
      return new MockStorageProvider();
  }
}

export const storageService = createStorageProvider();
