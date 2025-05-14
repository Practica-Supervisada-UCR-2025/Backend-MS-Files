export interface FileObject {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  originalName?: string;
  size?: number;
}