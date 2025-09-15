import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

// Bouton d'installation PWA (affiché quand beforeinstallprompt est disponible)
const InstallPWAButton = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const onInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome !== 'accepted') {
      // L'utilisateur a refusé, on peut garder le bouton visible
    }
    setDeferredPrompt(null);
  };

  if (!canInstall) return null;

  return (
    <Button variant="outline" size="sm" onClick={onInstallClick}>
      Installer l'app
    </Button>
  );
};

export default InstallPWAButton;
