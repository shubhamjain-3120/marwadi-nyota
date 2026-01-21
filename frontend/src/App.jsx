import { useState, useCallback } from "react";
import InputScreen from "./components/InputScreen";
import LoadingScreen from "./components/LoadingScreen";
import ResultScreen from "./components/ResultScreen";
import { composeInvite } from "./utils/canvasComposer";
import { removeImageBackground } from "./utils/backgroundRemoval";

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
      // Prepare form data for API - single couple photo
      const apiFormData = new FormData();
      apiFormData.append("photo", data.photo); // Couple photo

      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/6053f2e8-8bd0-4925-9c37-b354d1444919',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.jsx:handleGenerate:1',message:'Starting generation - calling backend API',data:{hasPhoto:!!data.photo},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
      // #endregion

      console.log("[App] Calling backend API...");

      // Call backend API
      const response = await fetch("/api/generate", {
        method: "POST",
        body: apiFormData,
      });

      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/6053f2e8-8bd0-4925-9c37-b354d1444919',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.jsx:handleGenerate:2',message:'Backend API response received',data:{status:response.status,ok:response.ok},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
      // #endregion

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Generation failed");
      }

      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/6053f2e8-8bd0-4925-9c37-b354d1444919',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.jsx:handleGenerate:3',message:'Backend returned success, starting background removal',data:{hasCharacterImage:!!result.characterImage,imageLength:result.characterImage?.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
      // #endregion

      console.log("[App] Received image from backend, removing background...");

      // Phase 4: Remove background from AI-generated image
      let characterImage = result.characterImage;
      try {
        characterImage = await removeImageBackground(result.characterImage);
        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/6053f2e8-8bd0-4925-9c37-b354d1444919',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.jsx:handleGenerate:4',message:'Background removal complete',data:{outputLength:characterImage?.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        console.log("[App] Background removal complete");
      } catch (bgError) {
        // If background removal fails, use the original image
        // (Gemini may have produced a reasonable transparent background)
        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/6053f2e8-8bd0-4925-9c37-b354d1444919',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.jsx:handleGenerate:4b',message:'Background removal failed, using original',data:{error:bgError.message},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        console.warn("[App] Background removal failed, using original:", bgError.message);
      }

      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/6053f2e8-8bd0-4925-9c37-b354d1444919',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.jsx:handleGenerate:5',message:'Starting canvas composition',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
      // #endregion

      console.log("[App] Composing final invite...");

      // Compose final invite using canvas
      const inviteDataUrl = await composeInvite({
        characterImage,
        brideName: data.brideName,
        groomName: data.groomName,
        date: data.date,
        venue: data.venue,
      });

      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/6053f2e8-8bd0-4925-9c37-b354d1444919',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.jsx:handleGenerate:6',message:'Canvas composition complete, setting final invite',data:{inviteLength:inviteDataUrl?.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
      // #endregion

      setFinalInvite(inviteDataUrl);

      console.log("[App] Generation complete! Showing 100% briefly...");

      // Jump progress to 100% and wait briefly before transitioning
      setLoadingCompleted(true);
      await new Promise((resolve) => setTimeout(resolve, COMPLETION_DELAY_MS));

      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/6053f2e8-8bd0-4925-9c37-b354d1444919',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.jsx:handleGenerate:7',message:'Transitioning to result screen',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
      // #endregion

      setScreen(SCREENS.RESULT);

    } catch (err) {
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/6053f2e8-8bd0-4925-9c37-b354d1444919',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.jsx:handleGenerate:error',message:'Generation error caught',data:{error:err.message,stack:err.stack?.slice(0,500)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
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
          inviteImage={finalInvite}
          brideName={formData?.brideName}
          groomName={formData?.groomName}
          onReset={handleReset}
        />
      )}
    </div>
  );
}
