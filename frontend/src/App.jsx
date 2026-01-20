import { useState, useCallback, useEffect } from "react";
import InputScreen from "./components/InputScreen";
import LoadingScreen from "./components/LoadingScreen";
import ResultScreen from "./components/ResultScreen";
import { composeInvite } from "./utils/canvasComposer";
import {
  removeImageBackground,
  preloadBackgroundRemovalModel,
} from "./utils/backgroundRemoval";

const SCREENS = {
  INPUT: "input",
  LOADING: "loading",
  RESULT: "result",
};

export default function App() {
  const [screen, setScreen] = useState(SCREENS.INPUT);
  const [formData, setFormData] = useState(null);
  const [finalInvite, setFinalInvite] = useState(null);
  const [error, setError] = useState(null);

  // Preload background removal model on app start
  useEffect(() => {
    preloadBackgroundRemovalModel();
  }, []);

  const handleGenerate = useCallback(async (data) => {
    setFormData(data);
    setScreen(SCREENS.LOADING);
    setError(null);

    try {
      // Prepare form data for API
      const apiFormData = new FormData();
      apiFormData.append("photo1", data.photo1);
      if (data.photo2) {
        apiFormData.append("photo2", data.photo2);
      }
      apiFormData.append("mode", data.photo2 ? "individual" : "couple");

      console.log("[App] Calling backend API...");

      // Call backend API
      const response = await fetch("/api/generate", {
        method: "POST",
        body: apiFormData,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Generation failed");
      }

      console.log("[App] Received image from backend, removing background...");

      // Phase 4: Remove background from AI-generated image
      let characterImage = result.characterImage;
      try {
        characterImage = await removeImageBackground(result.characterImage);
        console.log("[App] Background removal complete");
      } catch (bgError) {
        // If background removal fails, use the original image
        // (Gemini may have produced a reasonable transparent background)
        console.warn("[App] Background removal failed, using original:", bgError.message);
      }

      console.log("[App] Composing final invite...");

      // Compose final invite using canvas
      const inviteDataUrl = await composeInvite({
        characterImage,
        brideName: data.brideName,
        groomName: data.groomName,
        date: data.date,
        venue: data.venue,
      });

      setFinalInvite(inviteDataUrl);
      setScreen(SCREENS.RESULT);

      console.log("[App] Generation complete!");

    } catch (err) {
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
      {screen === SCREENS.LOADING && <LoadingScreen />}
      {screen === SCREENS.RESULT && (
        <ResultScreen
          inviteImage={finalInvite}
          brideName={formData?.brideName}
          groomName={formData?.groomName}
        />
      )}
    </div>
  );
}
