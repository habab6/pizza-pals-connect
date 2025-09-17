import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, History, Calendar, Search, CreditCard, FileText, Printer } from "lucide-react";
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
  mode_paiement?: string;
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
  const [showRapportModal, setShowRapportModal] = useState(false);
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
        commande.type_commande.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getPaymentMethodLabel(commande.mode_paiement || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (commande.mode_paiement && commande.mode_paiement.toLowerCase().includes(searchTerm.toLowerCase()))
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

  const getPaymentMethodLabel = (method: string) => {
    const methods = {
      bancontact: "Bancontact",
      visa: "Visa", 
      mastercard: "Mastercard",
      cash: "Espèces"
    };
    return methods[method as keyof typeof methods] || method;
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

  const getStatistiquesJour = (date?: Date) => {
    const targetDate = date ? date.toDateString() : new Date().toDateString();
    const commandesDuJour = commandes.filter(c => new Date(c.created_at).toDateString() === targetDate);
    
    const totalVentes = commandesDuJour.reduce((sum, c) => sum + c.total, 0);
    const nombreCommandes = commandesDuJour.length;
    
    // Statistiques par type de commande
    const parType = {
      sur_place: commandesDuJour.filter(c => c.type_commande === 'sur_place'),
      a_emporter: commandesDuJour.filter(c => c.type_commande === 'a_emporter'),
      livraison: commandesDuJour.filter(c => c.type_commande === 'livraison')
    };
    
    // Statistiques par mode de paiement
    const parPaiement = {
      cash: commandesDuJour.filter(c => c.mode_paiement === 'cash'),
      bancontact: commandesDuJour.filter(c => c.mode_paiement === 'bancontact'),
      visa: commandesDuJour.filter(c => c.mode_paiement === 'visa'),
      mastercard: commandesDuJour.filter(c => c.mode_paiement === 'mastercard')
    };
    
    return {
      date: targetDate,
      totalVentes,
      nombreCommandes,
      moyenneParCommande: nombreCommandes > 0 ? totalVentes / nombreCommandes : 0,
      parType: {
        sur_place: { nombre: parType.sur_place.length, total: parType.sur_place.reduce((sum, c) => sum + c.total, 0) },
        a_emporter: { nombre: parType.a_emporter.length, total: parType.a_emporter.reduce((sum, c) => sum + c.total, 0) },
        livraison: { nombre: parType.livraison.length, total: parType.livraison.reduce((sum, c) => sum + c.total, 0) }
      },
      parPaiement: {
        cash: { nombre: parPaiement.cash.length, total: parPaiement.cash.reduce((sum, c) => sum + c.total, 0) },
        bancontact: { nombre: parPaiement.bancontact.length, total: parPaiement.bancontact.reduce((sum, c) => sum + c.total, 0) },
        visa: { nombre: parPaiement.visa.length, total: parPaiement.visa.reduce((sum, c) => sum + c.total, 0) },
        mastercard: { nombre: parPaiement.mastercard.length, total: parPaiement.mastercard.reduce((sum, c) => sum + c.total, 0) }
      }
    };
  };

  const imprimerRapport = () => {
    window.print();
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
      <DialogContent className="max-w-6xl h-[90vh] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center space-x-3">
              <History className="h-6 w-6 text-red-600" />
              <span>Historique des commandes terminées</span>
            </DialogTitle>
            <Button
              variant="outline"
              onClick={() => setShowRapportModal(true)}
              className="flex items-center space-x-2"
            >
              <FileText className="h-4 w-4" />
              <span>Rapport journalier</span>
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 flex flex-col space-y-4 min-h-0">
          {/* Stats rapides */}
          <div className="flex-shrink-0 grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <div className="flex-shrink-0 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher par numéro, client, type ou mode de paiement..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Liste des commandes */}
          <div className="flex-1 min-h-0">
            <ScrollArea className="h-full">
              <div className="space-y-3 pr-4">
                {filteredCommandes.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    {searchTerm ? "Aucune commande trouvée" : "Aucune commande terminée"}
                  </p>
                ) : (
                  filteredCommandes.map((commande) => (
                    <div key={commande.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                      <div className="flex-1 min-w-0">
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
                          {commande.mode_paiement && (
                            <span className="flex items-center space-x-1">
                              <CreditCard className="h-3 w-3" />
                              <span>{getPaymentMethodLabel(commande.mode_paiement)}</span>
                            </span>
                          )}
                          <span>{new Date(commande.created_at).toLocaleString('fr-FR')}</span>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => voirDetails(commande.id)}
                        className="ml-4 flex-shrink-0"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
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

        {/* Modale du rapport journalier */}
        <Dialog open={showRapportModal} onOpenChange={setShowRapportModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:shadow-none">
            <DialogHeader className="print:hidden">
              <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center space-x-3">
                  <FileText className="h-6 w-6 text-blue-600" />
                  <span>Rapport journalier des ventes</span>
                </DialogTitle>
                <Button
                  variant="outline"
                  onClick={imprimerRapport}
                  className="flex items-center space-x-2"
                >
                  <Printer className="h-4 w-4" />
                  <span>Imprimer</span>
                </Button>
              </div>
            </DialogHeader>

            <div className="space-y-6 print:text-black">
              {(() => {
                const stats = getStatistiquesJour();
                return (
                  <>
                    {/* En-tête du rapport pour impression */}
                    <div className="text-center hidden print:block mb-8">
                      <h1 className="text-2xl font-bold mb-2">Rapport journalier des ventes</h1>
                      <p className="text-lg text-gray-600">{new Date().toLocaleDateString('fr-FR', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}</p>
                    </div>

                    {/* Vue d'ensemble */}
                    <Card className="print:shadow-none print:border">
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <Calendar className="h-5 w-5" />
                          <span>Vue d'ensemble - {new Date().toLocaleDateString('fr-FR')}</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                          <div className="text-center">
                            <p className="text-sm font-medium text-gray-600">Chiffre d'affaires</p>
                            <p className="text-3xl font-bold text-green-600">{stats.totalVentes.toFixed(2)}€</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-medium text-gray-600">Nombre de commandes</p>
                            <p className="text-3xl font-bold text-blue-600">{stats.nombreCommandes}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-medium text-gray-600">Panier moyen</p>
                            <p className="text-3xl font-bold text-purple-600">{stats.moyenneParCommande.toFixed(2)}€</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Répartition par type de commande */}
                    <Card className="print:shadow-none print:border">
                      <CardHeader>
                        <CardTitle>Répartition par type de commande</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                            <span className="font-medium">Sur place</span>
                            <div className="text-right">
                              <div className="font-bold">{stats.parType.sur_place.total.toFixed(2)}€</div>
                              <div className="text-sm text-gray-600">{stats.parType.sur_place.nombre} commande(s)</div>
                            </div>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                            <span className="font-medium">À emporter</span>
                            <div className="text-right">
                              <div className="font-bold">{stats.parType.a_emporter.total.toFixed(2)}€</div>
                              <div className="text-sm text-gray-600">{stats.parType.a_emporter.nombre} commande(s)</div>
                            </div>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                            <span className="font-medium">Livraison</span>
                            <div className="text-right">
                              <div className="font-bold">{stats.parType.livraison.total.toFixed(2)}€</div>
                              <div className="text-sm text-gray-600">{stats.parType.livraison.nombre} commande(s)</div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Répartition par mode de paiement */}
                    <Card className="print:shadow-none print:border">
                      <CardHeader>
                        <CardTitle>Répartition par mode de paiement</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                            <span className="font-medium">Espèces</span>
                            <div className="text-right">
                              <div className="font-bold">{stats.parPaiement.cash.total.toFixed(2)}€</div>
                              <div className="text-sm text-gray-600">{stats.parPaiement.cash.nombre} paiement(s)</div>
                            </div>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                            <span className="font-medium">Bancontact</span>
                            <div className="text-right">
                              <div className="font-bold">{stats.parPaiement.bancontact.total.toFixed(2)}€</div>
                              <div className="text-sm text-gray-600">{stats.parPaiement.bancontact.nombre} paiement(s)</div>
                            </div>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                            <span className="font-medium">Visa</span>
                            <div className="text-right">
                              <div className="font-bold">{stats.parPaiement.visa.total.toFixed(2)}€</div>
                              <div className="text-sm text-gray-600">{stats.parPaiement.visa.nombre} paiement(s)</div>
                            </div>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                            <span className="font-medium">Mastercard</span>
                            <div className="text-right">
                              <div className="font-bold">{stats.parPaiement.mastercard.total.toFixed(2)}€</div>
                              <div className="text-sm text-gray-600">{stats.parPaiement.mastercard.nombre} paiement(s)</div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Pied de rapport pour impression */}
                    <div className="text-center hidden print:block mt-8 pt-4 border-t">
                      <p className="text-sm text-gray-600">
                        Rapport généré le {new Date().toLocaleString('fr-FR')}
                      </p>
                    </div>
                  </>
                );
              })()}
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};

export default HistoriqueCommandes;