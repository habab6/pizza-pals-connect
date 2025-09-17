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

    const { action, endpoint, keys, poste_type } = await req.json();

    console.log('Gestion abonnement push:', { action, endpoint, poste_type });

    if (action === 'subscribe') {
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          endpoint,
          keys,
          poste_type,
          is_active: true
        }, {
          onConflict: 'endpoint'
        });

      if (error) {
        console.error('Erreur lors de l\'enregistrement:', error);
        throw error;
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Abonnement enregistré' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'unsubscribe') {
      const { error } = await supabase
        .from('push_subscriptions')
        .update({ is_active: false })
        .eq('endpoint', endpoint);

      if (error) {
        console.error('Erreur lors de la suppression:', error);
        throw error;
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Abonnement supprimé' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Action non reconnue' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erreur dans manage-push-subscription:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});