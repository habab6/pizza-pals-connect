import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { crypto } from "https://deno.land/std@0.208.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Clés VAPID générées pour le projet
const VAPID_PUBLIC_KEY = "BH8Z9fCx_kkOQRLDbz_yQXjdGpZKz8N_Prr1FhpvN8nQutjXa7LU_xpJ-0TKQoGvmN2iP5oXxRtUaOCwQJ7tVck";
const VAPID_PRIVATE_KEY = "WvYqTGTaJIFNVKJOMJn5K5WAZBRPFqJCAi9ChQhfGVo";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

async function createJWT(payload: any, privateKey: string): Promise<string> {
  const header = { typ: 'JWT', alg: 'ES256' };
  
  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  const data = `${encodedHeader}.${encodedPayload}`;
  const privateKeyBytes = urlBase64ToUint8Array(privateKey);
  
  const keyObj = await crypto.subtle.importKey(
    'raw',
    privateKeyBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    keyObj,
    new TextEncoder().encode(data)
  );
  
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  return `${data}.${encodedSignature}`;
}

async function sendWebPush(subscription: any, payload: string): Promise<boolean> {
  try {
    const vapidHeaders = {
      'sub': 'mailto:admin@dolce-italia.fr',
      'aud': new URL(subscription.endpoint).origin,
      'exp': Math.floor(Date.now() / 1000) + 3600 // 1 hour
    };
    
    const jwt = await createJWT(vapidHeaders, VAPID_PRIVATE_KEY);
    
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
        'Content-Type': 'application/octet-stream',
        'TTL': '86400'
      },
      body: payload
    });
    
    console.log('Push envoyé, status:', response.status);
    return response.ok;
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