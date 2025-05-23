import { UTApi } from "uploadthing/server";
import { FileObject } from "../interfaces/file.interface";
import { File } from 'undici';
const PROTECTED_IMAGES = [
  'https://utfs.io/f/Ri7z8Bp5NkcuKusSJHzg7svjdQTeVIL2qyOpRG9W4XnzUto6'
];

export class UploadService {
  private utapi: UTApi;

  constructor() {
    this.utapi = new UTApi();
  }

  /**
   * Upload a file to UploadThing using direct upload
   * @param fileObject Object containing file information
   * @param metadata Additional metadata for the upload
   * @returns URL of the uploaded file
   */
  public async uploadFileDirectly(fileObject: FileObject, metadata: Record<string, any>, fileName?: string): Promise<string> {
    try {
      // Create a File object from the buffer
      const file = new File([fileObject.buffer], fileName || fileObject.fileName, {
        type: fileObject.mimeType,
        lastModified: Date.now()
      });

      const result = await this.utapi.uploadFiles([file], {
        ...metadata
      });

      if (!Array.isArray(result) || !result[0]?.data?.url) {
        throw new Error('Error uploading file');
      }

      return result[0].data.url;
    } catch (error) {
      console.error('Error in uploadFileDirectly:', error);
      throw error;
    }
  }

  /**
   * Upload a file to UploadThing using presigned URLs (more reliable in Node.js)
   * @param fileObject Object containing file information
   * @returns URL of the uploaded file
   */
  public async uploadFileWithPresignedUrl(fileObject: FileObject, fileName?: string): Promise<string> {
    try {
      // 1. Generate presigned URL
      const fileKey = `${Date.now()}-${fileName || fileObject.fileName}`;
      const presignedUrl = await this.utapi.generateSignedURL(fileKey);

      if (!presignedUrl) {
        throw new Error('Error generating presigned URL');
      }

      // 2. Upload to presigned URL
      const uploadResponse = await fetch(typeof presignedUrl === 'string' ? presignedUrl : presignedUrl.ufsUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': fileObject.mimeType
        },
        body: fileObject.buffer
      });

      if (!uploadResponse.ok) {
        throw new Error(`Error uploading to presigned URL: ${uploadResponse.statusText}`);
      }

      // 3. Get the final URL
      const { data } = await this.utapi.getFileUrls([fileKey]);

      if (!data || !data[0]?.url) {
        throw new Error('Could not get file URL');
      }

      return data[0].url;
    } catch (error) {
      console.error('Error in uploadFileWithPresignedUrl:', error);
      throw error;
    }
  }

  /**
   * Main method for uploading a file trying different strategies
   * @param fileObject Object containing file information
   * @param metadata Additional metadata for the upload
   * @returns URL of the uploaded file and method used
   */
  public async uploadMediaFile(fileObject: FileObject, userRole: string, userId?: string, oldImageUrl?: string, imageType: number = 0): Promise<{ fileUrl: string, method: string }> {
    try {

      let directory = 'profiles';
      let fileType = 'profile-image';
      if (imageType === 1) {
        directory = 'posts';
        fileType = 'post-image';
      } else if (imageType === 2) {
        directory = 'gifs';
        fileType = 'post-gif';
      }

      const fileName = `${directory}/${userId || `user-${Date.now()}`}/${Date.now()}-${fileObject.fileName}`;

      // Preparar metadata con información adicional
      const metadata = {
        userId: userId || `user-${Date.now()}`,
        userRole: userRole,
        fileType: fileType
      };

      let fileUrl: string;
      let method: string;

      try {
        // Primera estrategia: subida directa
        fileUrl = await this.uploadFileDirectly(fileObject, metadata, fileName);
        method = 'direct';
      } catch (directError) {
        // Segunda estrategia: URL prefirmada
        console.log('Direct upload failed. Trying with presigned URL...');
        fileUrl = await this.uploadFileWithPresignedUrl(fileObject, fileName);
        method = 'presignedUrl';
      }
      // Eliminar la imagen anterior si existe la URL
      if (oldImageUrl) {
        await this.deleteOldProfileImage(oldImageUrl);
      }

      console.log(`File uploaded by ${userRole} using ${method} method: ${fileUrl}`);
      return { fileUrl, method };
    } catch (error) {
      console.error('Error in uploadProfileImage:', error);
      throw error;
    }
  }

  private async deleteOldProfileImage(fileUrl: string): Promise<void> {
    try {

      if (PROTECTED_IMAGES.includes(fileUrl)) {
        console.log('Protected default image detected - skipping deletion');
        return;
      }
      // Extraer el fileKey de la URL
      // Las URLs de UploadThing suelen tener un formato como:
      // https://uploadthing.com/f/abc123-file.jpg
      const fileKey = fileUrl.split('/').pop();

      if (!fileKey) {
        console.warn('Could not extract fileKey from URL:', fileUrl);
        return;
      }

      // Llamar a la API de UploadThing para eliminar el archivo
      await this.utapi.deleteFiles([fileKey]);
      console.log(`Old profile image deleted: ${fileKey}`);
    } catch (error) {
      // No detenemos el flujo si falla la eliminación
      console.error('Error deleting old profile image:', error);
    }
  }

  /**
   * List files (if needed)
   * @returns List of files
   */
  // src/features/uploads/services/upload.service.ts
  async listFilesService(): Promise<any[]> {
    try {
      // Obtener lista básica de archivos
      const filesResponse = await this.utapi.listFiles();

      // Primero obtener todas las URLs de los archivos
      const fileKeys = filesResponse.files.map(file => file.key);
      const fileUrls = await this.utapi.getFileUrls(fileKeys);

      // Crear un mapa de clave -> URL para fácil acceso
      const urlMap = new Map();
      if (fileUrls.data) {
        fileUrls.data.forEach(item => {
          urlMap.set(item.key, item.url);
        });
      }

      // Extraer información más detallada
      return filesResponse.files.map(file => {
        return {
          name: file.name,        // Nombre original del archivo
          key: file.key,          // Clave interna (contiene info de estructura)
          size: file.size,        // Tamaño
          uploadedAt: new Date(file.uploadedAt).toISOString(),  // Fecha de subida
          customId: file.customId, // ID personalizado si existe
          url: urlMap.get(file.key) || `https://utfs.io/f/${file.key}` // URL completa del archivo
        };
      });
    } catch (error) {
      console.error('Error listing detailed files:', error);
      throw error;
    }
  }
}
export const uploadService = new UploadService();