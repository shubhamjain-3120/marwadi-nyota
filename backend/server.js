import "dotenv/config";
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
  upload.single("photo"),
  async (req, res) => {
    // #region agent log
    const fs = await import('fs');
    fs.appendFileSync('/Users/shubhamjain/wedding-invite-mvp/.cursor/debug.log', JSON.stringify({location:'server.js:/api/generate:entry',message:'Generate endpoint called',data:{hasFile:!!req.file},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})+'\n');
    // #endregion
    try {
      const photo = req.file;

      // Validate input - require couple photo
      if (!photo) {
        return res.status(400).json({
          success: false,
          error: "Couple photo is required",
        });
      }

      console.log(`[Server] Generating wedding portrait from couple photo`);

      // Generate characters using Gemini (extracts features then generates)
      const result = await generateWeddingCharacters(photo);

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
      // #region agent log
      const fs2 = await import('fs');
      fs2.appendFileSync('/Users/shubhamjain/wedding-invite-mvp/.cursor/debug.log', JSON.stringify({location:'server.js:/api/generate:error',message:'Generation error caught in server',data:{errorName:error.name,errorMessage:error.message,errorStack:error.stack?.slice(0,800)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})+'\n');
      // #endregion
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
  console.log(`[Server] OpenAI API Key: ${process.env.OPENAI_API_KEY ? "Set" : "NOT SET"}`);
  console.log(`[Server] Gemini API Key: ${process.env.GEMINI_API_KEY ? "Set" : "NOT SET"}`);
});
