import { FileRouter } from "uploadthing/server";

export const mockUploadRouter = {
  profileImage: {
    middleware: jest.fn().mockImplementation(({ req }) => ({
      role: req.user?.role || 'user'
    })),
    onUploadComplete: jest.fn().mockImplementation(({ file, metadata }) => ({
      fileUrl: 'https://mock-uploadthing.com/test-image.jpg'
    }))
  }
} as unknown as FileRouter;

export const mockCreateUploadthing = jest.fn().mockReturnValue(() => ({
  image: () => ({
    maxFileSize: "4MB",
    maxFileCount: 1,
    middleware: mockUploadRouter.profileImage.middleware,
    onUploadComplete: mockUploadRouter.profileImage.onUploadComplete
  })
}));

jest.mock('uploadthing/server', () => ({
  createUploadthing: mockCreateUploadthing
}));