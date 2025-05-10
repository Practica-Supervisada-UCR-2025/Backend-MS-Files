import { FileObject } from '../../src/features/uploads/interfaces/file.interface';

describe('FileObject Interface', () => {
  it('should validate correctly formed FileObject', () => {
    const validFile: FileObject = {
      buffer: Buffer.from('test'),
      mimeType: 'image/jpeg',
      fileName: 'test.jpg',
      originalName: 'original.jpg',
      size: 1024
    };

    expect(validFile).toBeDefined();
    expect(validFile.buffer).toBeInstanceOf(Buffer);
    expect(validFile.mimeType).toBe('image/jpeg');
    expect(validFile.fileName).toBe('test.jpg');
    expect(validFile.originalName).toBe('original.jpg');
    expect(validFile.size).toBe(1024);
  });

  it('should validate FileObject with only required properties', () => {
    const minimalFile: FileObject = {
      buffer: Buffer.from('test'),
      mimeType: 'image/png',
      fileName: 'test.png'
    };

    expect(minimalFile).toBeDefined();
    expect(minimalFile.buffer).toBeInstanceOf(Buffer);
    expect(minimalFile.mimeType).toBe('image/png');
    expect(minimalFile.fileName).toBe('test.png');
    expect(minimalFile.originalName).toBeUndefined();
    expect(minimalFile.size).toBeUndefined();
  });

  it('should handle different mime types', () => {
    const pdfFile: FileObject = {
      buffer: Buffer.from('test'),
      mimeType: 'application/pdf',
      fileName: 'test.pdf'
    };

    expect(pdfFile.mimeType).toBe('application/pdf');
  });
});