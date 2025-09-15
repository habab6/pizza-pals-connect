import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

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

    // Vérifier si l'app est déjà installée
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isInWebAppiOS = (window.navigator as any).standalone === true;
    
    if (isStandalone || isInWebAppiOS) {
      setCanInstall(false);
      return;
    }

    window.addEventListener('beforeinstallprompt', handler);
    
    // Fallback pour certains navigateurs ou pour tester
    setTimeout(() => {
      if (!canInstall && !isStandalone && !isInWebAppiOS) {
        setCanInstall(true);
      }
    }, 2000);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const onInstallClick = async () => {
    if (!deferredPrompt) {
      // Fallback: instructions manuelles
      alert("Pour installer l'app:\n• Chrome: Menu > Installer l'application\n• Safari: Partager > Sur l'écran d'accueil");
      return;
    }
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setCanInstall(false);
    }
    setDeferredPrompt(null);
  };

  if (!canInstall) return null;

  return (
    <Button variant="outline" size="sm" onClick={onInstallClick}>
      <Download className="h-4 w-4 mr-1" />
      Installer l'app
    </Button>
  );
};

export default InstallPWAButton;
