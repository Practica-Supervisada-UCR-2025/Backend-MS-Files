import { createUploadthing, type FileRouter } from "uploadthing/server";
import { AuthenticatedRequest } from '../features/uploads/middleware/authenticate.middleware';

// Check if the environment variable is defined
if (!process.env.UPLOADTHING_TOKEN) {
  console.error("UPLOADTHING_TOKEN is not defined in environment variables");
}

const f = createUploadthing();

// Simple file router for profile image uploads
export const uploadRouter = {
  profileImage: f({
    image: {
      maxFileSize: "4MB",
      maxFileCount: 1
    }
  })
    .middleware(({ req }) => {
      // Access authenticated user information
      const user = ((req as unknown) as AuthenticatedRequest).user;
      
      // Verify if the user is authenticated
      if (!user) {
        throw new Error("Unauthorized");
      }
      
      // Pass user information to onUploadComplete handler
      return { 
        role: user.role,
        // You can add more user data here if needed
      };
    })
    .onUploadComplete(({ file, metadata }) => {
      // Use user information to log who uploaded the file
      console.log(`File uploaded successfully by user with role ${metadata.role}: ${file.url}`);
      return { fileUrl: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof uploadRouter;