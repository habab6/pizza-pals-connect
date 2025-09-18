import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface ExtraProduitModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (nom: string, prix: number) => void;
  produitNom: string;
}

const ExtraProduitModal = ({ open, onClose, onConfirm, produitNom }: ExtraProduitModalProps) => {
  const [prix, setPrix] = useState('');
  const [nomExtra, setNomExtra] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const prixNumber = parseFloat(prix);
    
    if (!nomExtra.trim()) {
      setError('Le nom de l\'extra est requis');
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

    onConfirm(nomExtra.trim(), prixNumber);
    setPrix('');
    setNomExtra('');
    setError('');
    onClose();
  };

  const handleClose = () => {
    setPrix('');
    setNomExtra('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter un extra</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Ajouter un extra pour: <strong>{produitNom}</strong>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nomExtra">Nom de l'extra</Label>
            <Input
              id="nomExtra"
              type="text"
              value={nomExtra}
              onChange={(e) => {
                setNomExtra(e.target.value);
                if (error) setError('');
              }}
              placeholder="Ex: Extra fromage, Sans oignons..."
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prixExtra">Prix de l'extra (€)</Label>
            <Input
              id="prixExtra"
              type="number"
              step="0.01"
              min="0"
              value={prix}
              onChange={(e) => {
                setPrix(e.target.value);
                if (error) setError('');
              }}
              placeholder="Ex: 1.50 (0 pour sans supplément)"
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
              Ajouter l'extra
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ExtraProduitModal;