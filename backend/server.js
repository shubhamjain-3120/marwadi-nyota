import express from "express";
import cors from "cors";
import multer from "multer";
import { generateWeddingCharacters } from "./gemini.js";

const app = express();
const PORT = process.env.PORT || 3001;

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max per file
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Main generation endpoint
app.post(
  "/api/generate",
  upload.fields([
    { name: "photo1", maxCount: 1 },
    { name: "photo2", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { mode } = req.body;
      const files = req.files;

      // Validate inputs
      if (!files?.photo1?.[0]) {
        return res.status(400).json({
          success: false,
          error: "At least one photo is required",
        });
      }

      if (!mode || !["couple", "individual"].includes(mode)) {
        return res.status(400).json({
          success: false,
          error: "Mode must be 'couple' or 'individual'",
        });
      }

      // For individual mode, require two photos
      if (mode === "individual" && !files?.photo2?.[0]) {
        return res.status(400).json({
          success: false,
          error: "Two photos required for individual mode",
        });
      }

      // Collect photos
      const photos = [files.photo1[0]];
      if (files.photo2?.[0]) {
        photos.push(files.photo2[0]);
      }

      console.log(`[Server] Generating ${mode} mode with ${photos.length} photo(s)`);

      // Generate characters using Gemini
      const result = await generateWeddingCharacters(photos, mode);

      res.json({
        success: true,
        characterImage: `data:${result.mimeType};base64,${result.imageData}`,
      });
    } catch (error) {
      console.error("[Server] Generation error:", error);

      // After max retries, return error to client
      res.status(500).json({
        success: false,
        error: "Generation failed. Please try again.",
      });
    }
  }
);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("[Server] Error:", err);
  res.status(500).json({
    success: false,
    error: err.message || "Internal server error",
  });
});

app.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT}`);
  console.log(`[Server] Gemini API Key: ${process.env.GEMINI_API_KEY ? "Set" : "NOT SET"}`);
});
