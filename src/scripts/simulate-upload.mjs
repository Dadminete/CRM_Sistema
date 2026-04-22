import fs from 'node:fs';
import path from 'node:path';

async function simulateUpload() {
  const timestamp = Date.now();
  const originalName = "client_photo.jpg";
  const cleanFileName = originalName.replace(/[^a-zA-Z0-9.]/g, "_");
  const filename = `${timestamp}_${cleanFileName}`;
  
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  const filePath = path.join(uploadDir, filename);
  
  console.log("Current working directory:", process.cwd());
  console.log("Calculated upload directory:", uploadDir);
  console.log("Calculated filename:", filename);
  console.log("Full file path:", filePath);
  console.log("Public URL:", `/uploads/${filename}`);
  
  try {
    if (!fs.existsSync(uploadDir)) {
      console.log("Upload directory does not exist, creating...");
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    fs.writeFileSync(filePath, "test content");
    console.log("File written successfully.");
    
    if (fs.existsSync(filePath)) {
      console.log("Verified: File exists on disk.");
    } else {
      console.log("ERROR: File does not exist after writing!");
    }
  } catch (err) {
    console.error("Error during simulation:", err);
  }
}

simulateUpload();
