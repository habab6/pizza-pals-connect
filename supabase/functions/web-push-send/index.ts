import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as webpush from "jsr:@negrel/webpush";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

let appServer: any = null;
let vapidPublicKey: string = "";

async function initializeAppServer() {
  if (!appServer) {
    try {
      // Générer de nouvelles clés VAPID avec la bibliothèque
      const vapidKeys = await webpush.generateVapidKeys({ extractable: true });
      
      // Exporter la clé publique pour le client
      vapidPublicKey = await webpush.exportApplicationServerKey(vapidKeys);
      
      appServer = await webpush.ApplicationServer.new({
        contactInformation: "mailto:admin@dolce-italia.fr",
        vapidKeys,
      });
      
      console.log('ApplicationServer initialisé avec clé publique:', vapidPublicKey);
    } catch (error) {
      console.error('Erreur initialisation ApplicationServer:', error);
      throw error;
    }
  }
  return appServer;
}

async function sendPushNotification(subscription: any, payload: any): Promise<boolean> {
  try {
    console.log('Envoi Web Push vers:', subscription.endpoint);
    
    const server = await initializeAppServer();
    const subscriber = server.subscribe(subscription);
    
    await subscriber.pushTextMessage(JSON.stringify(payload), {});
    
    console.log('Push envoyé avec succès');
    return true;
  } catch (error) {
    console.error('Erreur envoi push:', error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  
  // Endpoint pour obtenir la clé publique VAPID
  if (url.pathname.endsWith('/vapid-key') && req.method === 'GET') {
    try {
      await initializeAppServer();
      return new Response(
        JSON.stringify({ publicKey: vapidPublicKey }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error('Erreur obtention clé publique:', error);
      return new Response(
        JSON.stringify({ error: 'Impossible d\'obtenir la clé publique' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  try {
    const { subscription, payload } = await req.json();
    
    console.log('Envoi Web Push vers:', subscription.endpoint);
    
    const success = await sendPushNotification(subscription, payload);
    
    return new Response(
      JSON.stringify({ success, message: success ? 'Notification envoyée' : 'Échec envoi' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erreur dans web-push-send:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});