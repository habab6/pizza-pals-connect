import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PosteLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticate: (password: string) => Promise<boolean>;
  posteName: string;
  posteId: string;
}

export const PosteLoginModal = ({ 
  isOpen, 
  onClose, 
  onAuthenticate, 
  posteName 
}: PosteLoginModalProps) => {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Veuillez saisir un mot de passe');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const success = await onAuthenticate(password);
      
      if (success) {
        toast({
          title: 'Connexion réussie',
          description: `Accès autorisé à ${posteName}`
        });
        setPassword('');
        onClose();
      } else {
        setError('Mot de passe incorrect');
      }
    } catch (error) {
      setError('Erreur lors de la connexion');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-center">
            <Lock className="h-5 w-5 text-red-600" />
            <span>Accès sécurisé</span>
          </DialogTitle>
          <DialogDescription>
            Saisissez le mot de passe pour accéder à cet espace de travail.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-900">{posteName}</p>
            <p className="text-sm text-gray-600">Veuillez saisir le mot de passe</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Saisissez votre mot de passe"
                  className="pr-10"
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {isLoading ? 'Connexion...' : 'Se connecter'}
              </Button>
            </div>
          </form>

          <div className="text-xs text-center text-gray-500 border-t pt-3">
            <p>Chaque poste dispose de son propre mot de passe</p>
            <p>Le master password fonctionne pour tous les postes</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};