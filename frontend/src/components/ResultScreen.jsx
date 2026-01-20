import { useCallback } from "react";

export default function ResultScreen({ inviteImage, brideName, groomName }) {
  const handleDownload = useCallback(() => {
    const link = document.createElement("a");
    link.href = inviteImage;
    link.download = `wedding-invite-${groomName}-${brideName}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [inviteImage, brideName, groomName]);

  const handleShare = useCallback(async () => {
    try {
      // Convert data URL to blob for sharing
      const response = await fetch(inviteImage);
      const blob = await response.blob();
      const file = new File([blob], `wedding-invite-${groomName}-${brideName}.png`, {
        type: "image/png",
      });

      // Check if Web Share API is available and can share files
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `${groomName} & ${brideName} Wedding Invite`,
          text: `You're invited to the wedding of ${groomName} & ${brideName}!`,
          files: [file],
        });
      } else {
        // Fallback: Open WhatsApp with text (image needs manual attachment)
        const text = encodeURIComponent(
          `You're invited to the wedding of ${groomName} & ${brideName}!`
        );
        window.open(`https://wa.me/?text=${text}`, "_blank");
        alert("Download the image and attach it to your WhatsApp message");
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Share error:", err);
        // Fallback to WhatsApp
        const text = encodeURIComponent(
          `You're invited to the wedding of ${groomName} & ${brideName}!`
        );
        window.open(`https://wa.me/?text=${text}`, "_blank");
      }
    }
  }, [inviteImage, brideName, groomName]);

  return (
    <div className="result-screen">
      <header className="result-header">
        <h1>Your Wedding Invite</h1>
      </header>

      <div className="invite-preview">
        <img src={inviteImage} alt="Wedding Invite" className="invite-image" />
      </div>

      <div className="action-buttons">
        <button className="download-btn" onClick={handleDownload}>
          Download
        </button>
        <button className="share-btn" onClick={handleShare}>
          Share via WhatsApp
        </button>
      </div>
    </div>
  );
}
