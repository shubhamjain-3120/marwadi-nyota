import { useState, useCallback } from "react";
import InputScreen from "./components/InputScreen";
import LoadingScreen from "./components/LoadingScreen";
import ResultScreen from "./components/ResultScreen";
import { composeVideoInvite } from "./utils/videoComposer";
import { removeImageBackground } from "./utils/backgroundRemoval";
import { createDevLogger } from "./utils/devLogger";

const logger = createDevLogger("App");

// API URL - uses environment variable in production, empty string (relative) in dev
const API_URL = import.meta.env.VITE_API_URL || "";

const SCREENS = {
  INPUT: "input",
  LOADING: "loading",
  RESULT: "result",
};

// Brief delay (ms) to show 100% before transitioning to result
const COMPLETION_DELAY_MS = 500;

export default function App() {
  const [screen, setScreen] = useState(SCREENS.INPUT);
  const [formData, setFormData] = useState(null);
  const [finalInvite, setFinalInvite] = useState(null);
  const [error, setError] = useState(null);
  const [loadingCompleted, setLoadingCompleted] = useState(false);

  // NOTE: Background removal model preload has been DISABLED to prevent UI blocking.
  // The model will be loaded on-demand when the user generates an invite.
  // This makes the page fully responsive at all times.
  // The trade-off is the first generation will take ~30-40 seconds longer.

  const handleGenerate = useCallback(async (data) => {
    setFormData(data);
    setScreen(SCREENS.LOADING);
    setLoadingCompleted(false);
    setError(null);

    logger.log("Generation started", {
      devMode: data.devMode,
      brideName: data.brideName,
      groomName: data.groomName,
      hasPhoto: !!data.photo,
      hasCharacterFile: !!data.characterFile,
    });

    try {
      let characterImage;

      // Dev mode: use provided character file directly (skip API)
      if (data.devMode && data.characterFile) {
        logger.log("Step 1: Using local character file (dev mode)", {
          fileName: data.characterFile.name,
          fileSize: `${(data.characterFile.size / 1024).toFixed(1)} KB`,
          fileType: data.characterFile.type,
        });
        console.log("[App] Dev mode enabled - using local character file");
        
        // Convert the file to a base64 data URL
        characterImage = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error("Failed to read character file"));
          reader.readAsDataURL(data.characterFile);
        });

        logger.log("Step 1 complete: Character file loaded as data URL", {
          dataUrlLength: characterImage.length,
        });
        console.log("[App] Character file loaded, skipping API and background removal");
      } else {
        // Normal mode: call backend API
        // Prepare form data for API - single couple photo
        const apiFormData = new FormData();
        apiFormData.append("photo", data.photo); // Couple photo

        logger.log("Step 1: Calling backend API", {
          photoName: data.photo.name,
          photoSize: `${(data.photo.size / 1024).toFixed(1)} KB`,
          photoType: data.photo.type,
        });
        console.log("[App] Calling backend API...");

        // Call backend API
        const startApiCall = performance.now();
        const response = await fetch(`${API_URL}/api/generate`, {
          method: "POST",
          body: apiFormData,
        });

        logger.log("Step 1 response received", {
          status: response.status,
          ok: response.ok,
          duration: `${(performance.now() - startApiCall).toFixed(0)}ms`,
        });

        const result = await response.json();

        if (!result.success) {
          logger.error("Step 1 failed", result.error || "Generation failed");
          throw new Error(result.error || "Generation failed");
        }

        logger.log("Step 1 complete: Backend returned success", {
          hasCharacterImage: !!result.characterImage,
          imageLength: result.characterImage?.length,
          evaluationScore: result.evaluation?.score,
          evaluationPassed: result.evaluation?.passed,
        });
        console.log("[App] Received image from backend, removing background...");

        // Phase 4: Remove background from AI-generated image
        characterImage = result.characterImage;
        
        logger.log("Step 2: Starting background removal");
        const startBgRemoval = performance.now();
        try {
          characterImage = await removeImageBackground(result.characterImage);
          logger.log("Step 2 complete: Background removal successful", {
            outputLength: characterImage?.length,
            duration: `${(performance.now() - startBgRemoval).toFixed(0)}ms`,
          });
          console.log("[App] Background removal complete");
        } catch (bgError) {
          // If background removal fails, use the original image
          // (Gemini may have produced a reasonable transparent background)
          logger.warn("Step 2", `Background removal failed, using original: ${bgError.message}`);
          console.warn("[App] Background removal failed, using original:", bgError.message);
        }
      }

      logger.log("Step 3: Starting video composition", {
        brideName: data.brideName,
        groomName: data.groomName,
        date: data.date,
        venue: data.venue,
        characterImageLength: characterImage?.length,
      });
      console.log("[App] Composing video invite...");

      // Compose final invite as video with character overlay
      const startVideoCompose = performance.now();
      const videoBlob = await composeVideoInvite({
        characterImage,
        brideName: data.brideName,
        groomName: data.groomName,
        date: data.date,
        venue: data.venue,
        onProgress: (progress) => {
          logger.log(`Video composition progress: ${progress}%`);
          console.log(`[App] Video composition progress: ${progress}%`);
        },
      });

      logger.log("Step 3 complete: Video composition finished", {
        videoSize: `${(videoBlob?.size / 1024 / 1024).toFixed(2)} MB`,
        duration: `${(performance.now() - startVideoCompose).toFixed(0)}ms`,
      });

      setFinalInvite(videoBlob);

      logger.log("Step 4: Showing completion state");
      console.log("[App] Generation complete! Showing 100% briefly...");

      // Jump progress to 100% and wait briefly before transitioning
      setLoadingCompleted(true);
      await new Promise((resolve) => setTimeout(resolve, COMPLETION_DELAY_MS));

      logger.log("Step 5: Transitioning to result screen");
      setScreen(SCREENS.RESULT);

      logger.log("Generation complete - all steps successful");

    } catch (err) {
      logger.error("Generation failed", err);
      console.error("[App] Generation error:", err);
      setError(err.message);
      setScreen(SCREENS.INPUT);
    }
  }, []);

  const handleReset = useCallback(() => {
    setScreen(SCREENS.INPUT);
    setFormData(null);
    setFinalInvite(null);
    setError(null);
  }, []);

  return (
    <div className="app">
      {screen === SCREENS.INPUT && (
        <InputScreen onGenerate={handleGenerate} error={error} />
      )}
      {screen === SCREENS.LOADING && <LoadingScreen completed={loadingCompleted} />}
      {screen === SCREENS.RESULT && (
        <ResultScreen
          inviteVideo={finalInvite}
          brideName={formData?.brideName}
          groomName={formData?.groomName}
          onReset={handleReset}
        />
      )}
    </div>
  );
}
