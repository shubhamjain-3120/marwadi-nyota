import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import rateLimit from "express-rate-limit";
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
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json());

// Rate limiting configuration
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes per IP
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many requests, please try again later.",
  },
});

// Stricter rate limit for the resource-intensive generate endpoint
const generateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: parseInt(process.env.GENERATE_RATE_LIMIT) || 20, // 20 generations per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Generation limit reached. Please try again later.",
  },
  keyGenerator: (req) => {
    // Use X-Forwarded-For header if behind a proxy, otherwise use IP
    return req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip;
  },
});

// Apply general rate limit to all routes
app.use(generalLimiter);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Main generation endpoint with stricter rate limiting
app.post(
  "/api/generate",
  generateLimiter,
  upload.single("photo"),
  async (req, res) => {
    const requestId = Date.now().toString(36);

    try {
      const photo = req.file;

      // Validate input - require couple photo
      if (!photo) {
        return res.status(400).json({
          success: false,
          error: "Couple photo is required",
        });
      }

      // Generate characters using Gemini (extracts features then generates)
      const result = await generateWeddingCharacters(photo, requestId);

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
      console.error("Generation error:", error);

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
  console.error("Server error:", err);
  res.status(500).json({
    success: false,
    error: err.message || "Internal server error",
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
