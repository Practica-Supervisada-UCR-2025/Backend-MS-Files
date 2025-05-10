import { UploadService } from '../../src/features/uploads/services/upload.service';
import { UTApi } from 'uploadthing/server';
import { FileObject } from '../../src/features/uploads/interfaces/file.interface';

// Mock the UTApi class
jest.mock('uploadthing/server', () => {
  return {
    UTApi: jest.fn().mockImplementation(() => ({
      uploadFiles: jest.fn().mockResolvedValue([
        { data: { url: 'https://uploadthing.com/f/test-file.jpg' } }
      ]),
      generateSignedURL: jest.fn().mockResolvedValue('https://uploadthing.com/presigned-url'),
      getFileUrls: jest.fn().mockResolvedValue({
        data: [{ url: 'https://uploadthing.com/f/test-file.jpg' }]
      }),
      deleteFiles: jest.fn().mockResolvedValue(undefined),
      listFiles: jest.fn().mockResolvedValue({
        files: [{
          name: 'test.jpg',
          key: 'test-key',
          size: 1024,
          uploadedAt: 1577836800000,
          customId: 'test-id'
        }]
      })
    }))
  };
});

// Mock global fetch
global.fetch = jest.fn().mockImplementation(() => 
  Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK'
  })
);

describe('UploadService', () => {
  let uploadService: UploadService;
  let mockFileObject: FileObject;
  
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create fresh instance for each test
    uploadService = new UploadService();
    
    // Set up test file object
    mockFileObject = {
      buffer: Buffer.from('test file content'),
      mimeType: 'image/jpeg',
      fileName: 'test-image.jpg'
    };
  });
  
  describe('uploadFileDirectly', () => {
    it('should upload a file directly and return the file URL', async () => {
      const metadata = { userId: 'test-user', userRole: 'admin' };
      
      const result = await uploadService.uploadFileDirectly(mockFileObject, metadata);
      
      expect(result).toBe('https://uploadthing.com/f/test-file.jpg');
      
      // Verify UTApi was called correctly
      const utapiInstance = (UTApi as jest.Mock).mock.results[0].value;
      expect(utapiInstance.uploadFiles).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'test-image.jpg',
            type: 'image/jpeg'
          })
        ]),
        metadata
      );
    });
    
    
    
    it('should throw an error if upload fails', async () => {
      const metadata = { userId: 'test-user', userRole: 'admin' };
      
      // Mock a failed upload
      const utapiInstance = (UTApi as jest.Mock).mock.results[0].value;
      utapiInstance.uploadFiles.mockResolvedValueOnce([]);
      
      await expect(uploadService.uploadFileDirectly(mockFileObject, metadata))
        .rejects.toThrow('Error uploading file');
    });
    
    
  });
  
  describe('uploadFileWithPresignedUrl', () => {
    it('should upload a file with presigned URL and return the file URL', async () => {
      const result = await uploadService.uploadFileWithPresignedUrl(mockFileObject);
      
      expect(result).toBe('https://uploadthing.com/f/test-file.jpg');
      
      // Verify generateSignedURL was called
      const utapiInstance = (UTApi as jest.Mock).mock.results[0].value;
      expect(utapiInstance.generateSignedURL).toHaveBeenCalledTimes(1);
      
      // Verify fetch was called with correct parameters
      expect(fetch).toHaveBeenCalledWith(
        'https://uploadthing.com/presigned-url',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'image/jpeg' },
          body: mockFileObject.buffer
        })
      );
      
      // Verify getFileUrls was called
      expect(utapiInstance.getFileUrls).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringMatching(/^\d+-test-image\.jpg$/)])
      );
    });
    
    it('should use custom filename when provided', async () => {
      const customFileName = 'custom-name.jpg';
      
      await uploadService.uploadFileWithPresignedUrl(mockFileObject, customFileName);
      
      const utapiInstance = (UTApi as jest.Mock).mock.results[0].value;
      expect(utapiInstance.generateSignedURL).toHaveBeenCalledWith(
        expect.stringMatching(/^\d+-custom-name\.jpg$/)
      );
    });
    
    it('should throw an error if generating presigned URL fails', async () => {
      // Mock failure to generate presigned URL
      const utapiInstance = (UTApi as jest.Mock).mock.results[0].value;
      utapiInstance.generateSignedURL.mockResolvedValueOnce(null);
      
      await expect(uploadService.uploadFileWithPresignedUrl(mockFileObject))
        .rejects.toThrow('Error generating presigned URL');
    });
    
    it('should throw an error if upload to presigned URL fails', async () => {
      // Mock failed fetch request
      (global.fetch as jest.Mock).mockImplementationOnce(() => 
        Promise.resolve({
          ok: false,
          status: 403,
          statusText: 'Forbidden'
        })
      );
      
      await expect(uploadService.uploadFileWithPresignedUrl(mockFileObject))
        .rejects.toThrow('Error uploading to presigned URL: Forbidden');
    });
    
    it('should throw an error if getting file URLs fails', async () => {
      // Mock failure to get file URLs
      const utapiInstance = (UTApi as jest.Mock).mock.results[0].value;
      utapiInstance.getFileUrls.mockResolvedValueOnce({ data: [] });
      
      await expect(uploadService.uploadFileWithPresignedUrl(mockFileObject))
        .rejects.toThrow('Could not get file URL');
    });
  });
  
  describe('uploadProfileImage', () => {
    it('should upload profile image using direct method when it succeeds', async () => {
      // Spy on direct and presigned methods
      const directSpy = jest.spyOn(uploadService, 'uploadFileDirectly')
        .mockResolvedValue('https://uploadthing.com/f/direct-success.jpg');
      const presignedSpy = jest.spyOn(uploadService, 'uploadFileWithPresignedUrl');
      
      const userId = 'test-user-123';
      const result = await uploadService.uploadProfileImage(mockFileObject, 'admin', userId);
      
      expect(result).toEqual({
        fileUrl: 'https://uploadthing.com/f/direct-success.jpg',
        method: 'direct'
      });
      
      // Verify direct upload was called with correct parameters
      expect(directSpy).toHaveBeenCalledWith(
        mockFileObject,
        {
          userId,
          userRole: 'admin',
          fileType: 'profile-image'
        },
        expect.stringMatching(new RegExp(`^profiles/${userId}/\\d+-test-image\\.jpg$`))
      );
      
      // Verify presigned upload was not called
      expect(presignedSpy).not.toHaveBeenCalled();
    });
    
    it('should fall back to presigned URL method when direct upload fails', async () => {
      // Make direct upload fail and presigned succeed
      const directSpy = jest.spyOn(uploadService, 'uploadFileDirectly')
        .mockRejectedValue(new Error('Direct upload failed'));
      const presignedSpy = jest.spyOn(uploadService, 'uploadFileWithPresignedUrl')
        .mockResolvedValue('https://uploadthing.com/f/presigned-success.jpg');
      
      const userId = 'test-user-123';
      const result = await uploadService.uploadProfileImage(mockFileObject, 'admin', userId);
      
      expect(result).toEqual({
        fileUrl: 'https://uploadthing.com/f/presigned-success.jpg',
        method: 'presignedUrl'
      });
      
      // Verify both methods were attempted
      expect(directSpy).toHaveBeenCalled();
      expect(presignedSpy).toHaveBeenCalled();
      
      // Verify same path is used for both attempts
      const directPath = directSpy.mock.calls[0][2];
      const presignedPath = presignedSpy.mock.calls[0][1];
      expect(directPath).toBe(presignedPath);
    });
    
    it('should generate a userId if not provided', async () => {
      const directSpy = jest.spyOn(uploadService, 'uploadFileDirectly')
        .mockResolvedValue('https://uploadthing.com/f/success.jpg');
      
      await uploadService.uploadProfileImage(mockFileObject, 'user');
      
      // Verify a generated userId was used
      const metadata = directSpy.mock.calls[0][1];
      expect(metadata.userId).toMatch(/^user-\d+$/);
    });
    
    it('should delete old profile image if URL is provided', async () => {
      // Spy on the private method
      const deleteSpy = jest.spyOn(uploadService as any, 'deleteOldProfileImage');
      
      const oldImageUrl = 'https://uploadthing.com/f/old-image.jpg';
      await uploadService.uploadProfileImage(mockFileObject, 'admin', 'test-user', oldImageUrl);
      
      expect(deleteSpy).toHaveBeenCalledWith(oldImageUrl);
    });
    
    it('should throw an error if both upload methods fail', async () => {
      // Make both upload methods fail
      jest.spyOn(uploadService, 'uploadFileDirectly')
        .mockRejectedValue(new Error('Direct upload failed'));
      jest.spyOn(uploadService, 'uploadFileWithPresignedUrl')
        .mockRejectedValue(new Error('Presigned URL upload failed'));
      
      await expect(uploadService.uploadProfileImage(mockFileObject, 'admin'))
        .rejects.toThrow('Presigned URL upload failed');
    });
  });
  
  describe('deleteOldProfileImage', () => {
    it('should extract fileKey from URL and call deleteFiles', async () => {
      // Access the private method
      const deleteOldProfileImage = (uploadService as any).deleteOldProfileImage.bind(uploadService);
      
      await deleteOldProfileImage('https://uploadthing.com/f/test-key.jpg');
      
      // Verify deleteFiles was called with correct key
      const utapiInstance = (UTApi as jest.Mock).mock.results[0].value;
      expect(utapiInstance.deleteFiles).toHaveBeenCalledWith(['test-key.jpg']);
    });
    
    
    
    it('should catch and log errors from deleteFiles', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const testError = new Error('Delete failed');
      
      // Make deleteFiles fail
      const utapiInstance = (UTApi as jest.Mock).mock.results[0].value;
      utapiInstance.deleteFiles.mockRejectedValueOnce(testError);
      
      // Access the private method
      const deleteOldProfileImage = (uploadService as any).deleteOldProfileImage.bind(uploadService);
      
      // Should complete without throwing
      await deleteOldProfileImage('https://uploadthing.com/f/test-key.jpg');
      
      // Verify error was logged
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error deleting old profile image:',
        testError
      );
    });
  });
  
  describe('listFilesService', () => {
    it('should return formatted list of files', async () => {
      const result = await uploadService.listFilesService();
      
      expect(result).toEqual([
        {
          name: 'test.jpg',
          key: 'test-key',
          size: 1024,
          uploadedAt: '2020-01-01T00:00:00.000Z',
          customId: 'test-id'
        }
      ]);
    });
    
    it('should handle and propagate errors', async () => {
      // Make listFiles fail
      const testError = new Error('List failed');
      const utapiInstance = (UTApi as jest.Mock).mock.results[0].value;
      utapiInstance.listFiles.mockRejectedValueOnce(testError);
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await expect(uploadService.listFilesService()).rejects.toThrow('List failed');
      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});