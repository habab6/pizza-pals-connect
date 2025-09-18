import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface PrixExtraModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (prix: number) => void;
  articleNom: string;
}

const PrixExtraModal = ({ open, onClose, onConfirm, articleNom }: PrixExtraModalProps) => {
  const [prix, setPrix] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const prixNumber = parseFloat(prix);
    
    if (!prix.trim()) {
      setError('Le prix est requis');
      return;
    }
    
    if (isNaN(prixNumber) || prixNumber < 0) {
      setError('Le prix doit être un nombre positif ou nul');
      return;
    }

    onConfirm(prixNumber);
    setPrix('');
    setError('');
    onClose();
  };

  const handleClose = () => {
    setPrix('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Prix pour l'article extra</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Définissez le prix pour : <strong>{articleNom}</strong>
            </p>
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
              autoFocus
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