import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import { generateWeddingCharacters } from "./gemini.js";
import { createDevLogger, isDevMode } from "./devLogger.js";

const logger = createDevLogger("Server");

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
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
  logger.log("Health check requested");
  res.json({ status: "ok", devMode: isDevMode() });
});

// Main generation endpoint
app.post(
  "/api/generate",
  upload.single("photo"),
  async (req, res) => {
    const requestId = Date.now().toString(36);
    const startTime = performance.now();
    
    logger.log(`[${requestId}] Generate endpoint called`, {
      hasFile: !!req.file,
      fileSize: req.file ? `${(req.file.size / 1024).toFixed(1)} KB` : null,
      fileMimeType: req.file?.mimetype,
    });

    try {
      const photo = req.file;

      // Validate input - require couple photo
      if (!photo) {
        logger.warn(`[${requestId}] Validation failed`, "No photo provided");
        return res.status(400).json({
          success: false,
          error: "Couple photo is required",
        });
      }

      logger.log(`[${requestId}] Step 1: Starting generation pipeline`, {
        photoSize: `${(photo.size / 1024).toFixed(1)} KB`,
        photoMimeType: photo.mimetype,
      });
      console.log(`[Server] Generating wedding portrait from couple photo`);

      // Generate characters using Gemini (extracts features then generates)
      const result = await generateWeddingCharacters(photo, requestId);

      const totalDuration = performance.now() - startTime;
      logger.log(`[${requestId}] Generation complete`, {
        totalDuration: `${totalDuration.toFixed(0)}ms`,
        imageSizeKB: `${(result.imageData.length * 0.75 / 1024).toFixed(1)} KB`,
        evaluationScore: result.evaluation?.score,
        evaluationPassed: result.evaluation?.passed,
      });

      res.json({
        success: true,
        characterImage: `data:${result.mimeType};base64,${result.imageData}`,
        evaluation: result.evaluation ? {
          score: result.evaluation.score,
          passed: result.evaluation.passed,
          hardRulesPassed: result.evaluation.hardRulesPassed,
          issues: result.evaluation.details?.issues || []
        } : null
      });
    } catch (error) {
      const totalDuration = performance.now() - startTime;
      logger.error(`[${requestId}] Generation failed after ${totalDuration.toFixed(0)}ms`, error);
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
  logger.error("Unhandled error", err);
  console.error("[Server] Error:", err);
  res.status(500).json({
    success: false,
    error: err.message || "Internal server error",
  });
});

app.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT}`);
  console.log(`[Server] Dev Mode: ${isDevMode() ? "ENABLED" : "disabled"}`);
  console.log(`[Server] OpenAI API Key: ${process.env.OPENAI_API_KEY ? "Set" : "NOT SET"}`);
  console.log(`[Server] Gemini API Key: ${process.env.GEMINI_API_KEY ? "Set" : "NOT SET"}`);
  
  if (isDevMode()) {
    console.log(`[Server] Dev logging is enabled - detailed logs will be shown`);
  }
});
