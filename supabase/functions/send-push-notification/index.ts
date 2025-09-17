import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VAPID_PRIVATE_KEY = 'BMqS3ormk_lRH-5ejU5zGJZhvOLh3GtA8DJzW4jJ5rYwrXywJzyRfgWzabNndbh1FIIY6RqCL2tCbGD5-wuvhBY';

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

    // Envoyer les notifications à tous les abonnements
    const promises = subscriptions.map(async (subscription) => {
      try {
        const response = await fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `key=${VAPID_PRIVATE_KEY}`,
          },
          body: JSON.stringify({
            to: subscription.endpoint,
            notification: {
              title,
              body: message,
              icon: '/placeholder.svg'
            },
            data: data || {}
          })
        });

        if (!response.ok) {
          console.error('Erreur lors de l\'envoi de la notification:', await response.text());
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