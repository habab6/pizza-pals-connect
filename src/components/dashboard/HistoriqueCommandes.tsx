import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, History, Calendar, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import CommandeDetailsModal from "@/components/modals/CommandeDetailsModal";

interface Commande {
  id: string;
  numero_commande: string;
  type_commande: 'sur_place' | 'a_emporter' | 'livraison';
  statut: 'nouveau' | 'en_preparation' | 'pret' | 'en_livraison' | 'livre' | 'termine';
  total: number;
  created_at: string;
  clients?: {
    nom: string;
    telephone: string;
    adresse?: string;
  };
}

const HistoriqueCommandes = () => {
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [filteredCommandes, setFilteredCommandes] = useState<Commande[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCommandeId, setSelectedCommandeId] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const { toast } = useToast();

  const fetchHistorique = async () => {
    try {
      const { data, error } = await supabase
        .from('commandes')
        .select(`
          *,
          clients (
            nom,
            telephone,
            adresse
          )
        `)
        .eq('statut', 'termine')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCommandes(data || []);
      setFilteredCommandes(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger l'historique"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh toutes les 10 secondes pour l'historique
  useAutoRefresh({ 
    refreshFunction: fetchHistorique,
    intervalMs: 10000,
    enabled: true
  });

  useEffect(() => {
    fetchHistorique();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredCommandes(commandes);
    } else {
      const filtered = commandes.filter(commande => 
        commande.numero_commande.toLowerCase().includes(searchTerm.toLowerCase()) ||
        commande.clients?.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        commande.type_commande.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCommandes(filtered);
    }
  }, [searchTerm, commandes]);

  const getTypeCommande = (type: string) => {
    const types = {
      sur_place: "Sur place",
      a_emporter: "À emporter",
      livraison: "Livraison"
    };
    return types[type as keyof typeof types] || type;
  };

  const voirDetails = (commandeId: string) => {
    setSelectedCommandeId(commandeId);
    setShowDetailsModal(true);
  };

  const getTotalDuJour = () => {
    const today = new Date().toDateString();
    return filteredCommandes
      .filter(c => new Date(c.created_at).toDateString() === today)
      .reduce((sum, c) => sum + c.total, 0);
  };

  const getCommandesDuJour = () => {
    const today = new Date().toDateString();
    return filteredCommandes.filter(c => new Date(c.created_at).toDateString() === today);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center space-x-2">
          <History className="h-4 w-4 md:mr-2" />
          <span className="hidden md:inline">Historique</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3">
            <History className="h-6 w-6 text-red-600" />
            <span>Historique des commandes terminées</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Stats rapides */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total aujourd'hui</p>
                    <p className="text-2xl font-bold text-green-600">
                      {getTotalDuJour().toFixed(2)}€
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Commandes aujourd'hui</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {getCommandesDuJour().length}
                    </p>
                  </div>
                  <History className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total commandes</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {filteredCommandes.length}
                    </p>
                  </div>
                  <History className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Barre de recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher par numéro de commande, client ou type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Liste des commandes */}
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {filteredCommandes.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  {searchTerm ? "Aucune commande trouvée" : "Aucune commande terminée"}
                </p>
              ) : (
                filteredCommandes.map((commande) => (
                  <div key={commande.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-2">
                        <h3 className="font-semibold text-lg">{commande.numero_commande}</h3>
                        <Badge variant="success">Terminé</Badge>
                        <Badge variant="outline">{getTypeCommande(commande.type_commande)}</Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>Total: {commande.total.toFixed(2)}€</span>
                        {commande.clients && (
                          <span>Client: {commande.clients.nom}</span>
                        )}
                        <span>{new Date(commande.created_at).toLocaleString('fr-FR')}</span>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => voirDetails(commande.id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Modale des détails de commande */}
        <CommandeDetailsModal
          commandeId={selectedCommandeId}
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedCommandeId(null);
          }}
        />
      </DialogContent>
    </Dialog>
  );
};

export default HistoriqueCommandes;