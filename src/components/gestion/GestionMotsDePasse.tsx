import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Key, Lock, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import bcrypt from 'bcryptjs';

interface PostePassword {
  poste_id: string;
  poste_name: string;
  password_hash: string;
}

interface GestionMotsDePasseProps {
  onClose: () => void;
}

const GestionMotsDePasse = ({ onClose }: GestionMotsDePasseProps) => {
  const [postes, setPostes] = useState<PostePassword[]>([]);
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPostes();
  }, []);

  const fetchPostes = async () => {
    try {
      const { data, error } = await supabase
        .from('poste_passwords')
        .select('poste_id, poste_name, password_hash')
        .order('poste_name');

      if (error) throw error;
      
      setPostes(data || []);
      
      // Initialiser les mots de passe vides
      const initialPasswords: Record<string, string> = {};
      data?.forEach(poste => {
        initialPasswords[poste.poste_id] = '';
      });
      setPasswords(initialPasswords);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de charger les postes'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = (posteId: string, password: string) => {
    setPasswords(prev => ({
      ...prev,
      [posteId]: password
    }));
  };

  const toggleShowPassword = (posteId: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [posteId]: !prev[posteId]
    }));
  };

  const savePassword = async (posteId: string) => {
    const password = passwords[posteId];
    if (!password.trim()) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Veuillez saisir un mot de passe'
      });
      return;
    }

    if (password.length < 4) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Le mot de passe doit contenir au moins 4 caractères'
      });
      return;
    }

    setIsSaving(true);
    try {
      // Hasher le nouveau mot de passe
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const { error } = await supabase
        .from('poste_passwords')
        .update({ password_hash: hashedPassword })
        .eq('poste_id', posteId);

      if (error) throw error;

      toast({
        title: 'Mot de passe mis à jour',
        description: `Le mot de passe du poste "${postes.find(p => p.poste_id === posteId)?.poste_name}" a été modifié`
      });

      // Vider le champ de mot de passe
      setPasswords(prev => ({
        ...prev,
        [posteId]: ''
      }));
      
      // Masquer le mot de passe
      setShowPasswords(prev => ({
        ...prev,
        [posteId]: false
      }));

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de mettre à jour le mot de passe'
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Key className="h-6 w-6 text-red-600" />
          <h2 className="text-xl font-bold text-gray-900">Gestion des mots de passe</h2>
        </div>
        <Button variant="outline" onClick={onClose}>
          Fermer
        </Button>
      </div>

      <Alert>
        <Lock className="h-4 w-4" />
        <AlertDescription>
          <strong>Master Password:</strong> "DI961LSF" fonctionne pour tous les postes.<br/>
          Vous pouvez définir des mots de passe spécifiques pour chaque poste ci-dessous.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4">
        {postes.map((poste) => (
          <Card key={poste.poste_id}>
            <CardHeader>
              <CardTitle className="text-lg">{poste.poste_name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-2">
                <div className="flex-1">
                  <Label htmlFor={`password-${poste.poste_id}`}>
                    Nouveau mot de passe
                  </Label>
                  <div className="relative">
                    <Input
                      id={`password-${poste.poste_id}`}
                      type={showPasswords[poste.poste_id] ? 'text' : 'password'}
                      value={passwords[poste.poste_id] || ''}
                      onChange={(e) => handlePasswordChange(poste.poste_id, e.target.value)}
                      placeholder="Saisir le nouveau mot de passe"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => toggleShowPassword(poste.poste_id)}
                    >
                      {showPasswords[poste.poste_id] ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={() => savePassword(poste.poste_id)}
                    disabled={isSaving || !passwords[poste.poste_id]?.trim()}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Sauvegarder
                  </Button>
                </div>
              </div>
              
              <p className="text-sm text-gray-500">
                Laissez vide pour conserver le mot de passe actuel
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Alert>
        <AlertDescription>
          <strong>Note de sécurité:</strong> Les mots de passe sont chiffrés et stockés de manière sécurisée. 
          Le master password "DI961LSF" reste toujours actif pour tous les postes.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default GestionMotsDePasse;