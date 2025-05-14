// Load environment variables BEFORE any other imports
import dotenv from "dotenv";
const result = dotenv.config();

// Only after loading dotenv, import other modules
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import uploadRoutes from "./features/uploads/routes/upload.routes";
import { errorHandler } from "./utils/errors/error-handler.middleware";

// Check if dotenv was loaded correctly
if (result.error) {
  console.error("Error loading .env file:", result.error);
} else {
  console.log("dotenv config loaded successfully");
}

// Check if UPLOADTHING_TOKEN is defined
if (!process.env.UPLOADTHING_TOKEN) {
  console.error("UPLOADTHING_TOKEN is not defined in environment variables");
  
  // Check if .env file exists and show its content for debugging
  const envPath = path.resolve(process.cwd(), '.env');
  console.log(".env path:", envPath);
  console.log(".env exists:", fs.existsSync(envPath));
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    console.log(".env content:", envContent);
  }
} else {
  console.log("UPLOADTHING_TOKEN is defined correctly");
}


const app = express();
const PORT = process.env.PORT || 3006;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Server is running on port 3006');
});


app.use("/api/files", uploadRoutes);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`File service running on http://localhost:${PORT}`);
});

export default app;