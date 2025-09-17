import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { title, message, data, poste_type } = await req.json();

    console.log('Envoi notification push:', { title, message, poste_type });

    // Récupérer les abonnements actifs pour ce type de poste
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('poste_type', poste_type)
      .eq('is_active', true);

    if (error) {
      console.error('Erreur lors de la récupération des abonnements:', error);
      throw error;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('Aucun abonnement trouvé pour', poste_type);
      return new Response(
        JSON.stringify({ success: true, message: 'Aucun abonnement trouvé' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Trouvé ${subscriptions.length} abonnement(s) pour ${poste_type}`);

    // Préparer le payload de notification
    const payload = JSON.stringify({
      title,
      body: message,
      icon: '/placeholder.svg',
      badge: '/placeholder.svg',
      vibrate: [200, 100, 200],
      data: data || {},
      requireInteraction: true
    });

    // Envoyer les notifications à tous les abonnements via Web Push API
    const promises = subscriptions.map(async (subscription) => {
      try {
        console.log('Envoi vers:', subscription.endpoint);
        
        // Utiliser l'API Web Push standard avec le service worker
        const response = await fetch('https://rllqnpopmacbyyhnhljc.supabase.co/functions/v1/web-push-send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
          },
          body: JSON.stringify({
            subscription: {
              endpoint: subscription.endpoint,
              keys: subscription.keys
            },
            payload
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Erreur lors de l\'envoi de la notification:', errorText);
        } else {
          console.log('Notification envoyée avec succès vers:', subscription.endpoint);
        }
      } catch (error) {
        console.error('Erreur lors de l\'envoi à', subscription.endpoint, ':', error);
      }
    });

    await Promise.all(promises);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Notifications envoyées à ${subscriptions.length} abonnement(s)` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erreur dans send-push-notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});