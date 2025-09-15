import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      }
    })

    const accounts = [
      { email: 'caisse@app', nom: 'caisse', role: 'caissier' },
      { email: 'cuisine@app', nom: 'cuisine', role: 'pizzaiolo' },
      { email: 'livraison@app', nom: 'livraison', role: 'livreur' }
    ]

    const results = []

    for (const account of accounts) {
      console.log(`Création du compte ${account.email}...`)
      
      // Créer l'utilisateur
      const { data: userData, error: userError } = await supabase.auth.admin.createUser({
        email: account.email,
        password: 'Dolce961',
        email_confirm: true,
        user_metadata: {
          nom: account.nom,
          role: account.role
        }
      })

      if (userError) {
        const msg = (userError.message || '').toLowerCase();
        const alreadyExists = msg.includes('already') || msg.includes('exists') || msg.includes('registered');
        if (alreadyExists) {
          console.log(`Utilisateur ${account.email} existe déjà, on continue`)
          results.push({ email: account.email, success: true })
        } else {
          console.error(`Erreur création utilisateur ${account.email}:`, userError)
          results.push({ email: account.email, success: false, error: userError.message })
          continue
        }
      }

      // Créer le profil si on a l'id utilisateur (nouveau compte)
      if (userData?.user?.id) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: userData.user.id,
            nom: account.nom,
            role: account.role
          })

        if (profileError) {
          console.error(`Erreur création profil ${account.email}:`, profileError)
          results.push({ email: account.email, success: false, error: profileError.message })
        } else {
          console.log(`Compte ${account.email} créé avec succès`)
          results.push({ email: account.email, success: true })
        }
      } else {
        console.log(`Profil non créé pour ${account.email} (utilisateur existant)`) 
        results.push({ email: account.email, success: true })
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Processus de création terminé',
        results: results
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Erreur:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})