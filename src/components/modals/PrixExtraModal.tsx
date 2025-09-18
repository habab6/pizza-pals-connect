import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface PrixExtraModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (nom: string, prix: number) => void;
  articleNom: string;
}

const PrixExtraModal = ({ open, onClose, onConfirm, articleNom }: PrixExtraModalProps) => {
  const [prix, setPrix] = useState('');
  const [nomPersonnalise, setNomPersonnalise] = useState('');
  const [error, setError] = useState('');

  console.log('PrixExtraModal - open:', open, 'articleNom:', articleNom);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const prixNumber = parseFloat(prix);
    
    if (!nomPersonnalise.trim()) {
      setError('Le nom de l\'article est requis');
      return;
    }
    
    if (!prix.trim()) {
      setError('Le prix est requis');
      return;
    }
    
    if (isNaN(prixNumber) || prixNumber < 0) {
      setError('Le prix doit être un nombre positif ou nul');
      return;
    }

    onConfirm(nomPersonnalise.trim(), prixNumber);
    setPrix('');
    setNomPersonnalise('');
    setError('');
    onClose();
  };

  const handleClose = () => {
    setPrix('');
    setNomPersonnalise('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Article extra personnalisé</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Personnalisez votre article extra
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nom">Nom de l'article</Label>
            <Input
              id="nom"
              type="text"
              value={nomPersonnalise}
              onChange={(e) => {
                setNomPersonnalise(e.target.value);
                if (error) setError('');
              }}
              placeholder="Ex: Supplément fromage"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prix">Prix (€)</Label>
            <Input
              id="prix"
              type="number"
              step="0.01"
              min="0"
              value={prix}
              onChange={(e) => {
                setPrix(e.target.value);
                if (error) setError('');
              }}
              placeholder="Ex: 5.50"
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Annuler
            </Button>
            <Button type="submit">
              Confirmer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PrixExtraModal;