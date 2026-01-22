import { useState, useCallback } from "react";
import InputScreen from "./components/InputScreen";
import LoadingScreen from "./components/LoadingScreen";
import ResultScreen from "./components/ResultScreen";
import { composeVideoInvite } from "./utils/videoComposer";
import { removeImageBackground } from "./utils/backgroundRemoval";

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

    try {
      let characterImage;

      // Prepare form data for API - single couple photo
      const apiFormData = new FormData();
      apiFormData.append("photo", data.photo);

      // Call backend API
      const response = await fetch(`${API_URL}/api/generate`, {
        method: "POST",
        body: apiFormData,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Generation failed");
      }

      // Remove background from AI-generated image
      characterImage = result.characterImage;
      
      try {
        characterImage = await removeImageBackground(result.characterImage);
      } catch (bgError) {
        // If background removal fails, use the original image
        // (Gemini may have produced a reasonable transparent background)
        console.warn("Background removal failed, using original:", bgError.message);
      }

      // Compose final invite as video with character overlay
      const videoBlob = await composeVideoInvite({
        characterImage,
        brideName: data.brideName,
        groomName: data.groomName,
        date: data.date,
        venue: data.venue,
      });

      setFinalInvite(videoBlob);

      // Jump progress to 100% and wait briefly before transitioning
      setLoadingCompleted(true);
      await new Promise((resolve) => setTimeout(resolve, COMPLETION_DELAY_MS));

      setScreen(SCREENS.RESULT);

    } catch (err) {
      console.error("Generation error:", err);
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
