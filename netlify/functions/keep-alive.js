
import { createClient } from "@supabase/supabase-js";

// Funzione leggera, senza costi, che serve solo a mantenere attivo il database
// Supabase gratuito: se restasse del tutto inutilizzato per una settimana andrebbe
// in pausa da solo. Un servizio esterno gratuito (es. cron-job.org) richiama questo
// indirizzo ogni pochi giorni, cosi' il database non si addormenta mai davvero.

export async function handler() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return { statusCode: 500, body: "Supabase non configurato" };
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { error } = await supabase.from("shared_store").select("key").limit(1);
    if (error) throw error;
    return { statusCode: 200, body: "ok, database sveglio" };
  } catch (err) {
    return { statusCode: 500, body: String(err) };
  }
}
