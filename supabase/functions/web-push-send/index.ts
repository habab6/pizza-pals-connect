import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { sendNotification } from "https://deno.land/x/webpush@v0.4.1/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Nouvelles clés VAPID générées
const VAPID_PUBLIC_KEY = "BFZQsKeuEglGrBceuDdXNQRxXH4rIrQvUU8anV4MFWnL8JKtN8xysKF-aGvLRh_9_ZD-8VHvaHOEfJ6WYmibFDs";
const VAPID_PRIVATE_KEY = "uVQP_xKBDX4ZmQgx7BiLt4CmGnCr-8-1vtUpPvqPMnY";

async function sendWebPush(subscription: any, payload: any): Promise<boolean> {
  try {
    console.log('Envoi Web Push vers:', subscription.endpoint);
    
    const response = await sendNotification(subscription, JSON.stringify(payload), {
      vapidDetails: {
        subject: 'mailto:admin@dolce-italia.fr',
        publicKey: VAPID_PUBLIC_KEY,
        privateKey: VAPID_PRIVATE_KEY,
      },
      TTL: 86400,
    });
    
    console.log('Push envoyé avec succès, status:', response.status);
    return response.status >= 200 && response.status < 300;
  } catch (error) {
    console.error('Erreur envoi push:', error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subscription, payload } = await req.json();
    
    console.log('Envoi Web Push vers:', subscription.endpoint);
    
    const success = await sendWebPush(subscription, JSON.stringify(payload));
    
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