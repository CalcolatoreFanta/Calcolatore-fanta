import { createClient } from "@supabase/supabase-js";

// Le due variabili qui sotto vanno impostate come variabili d'ambiente
// su Netlify (Site settings -> Environment variables), NON scritte a mano qui.
// Vedi il file README.md per i dettagli passo passo.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const TABLE = "shared_store";

/**
 * Sostituisce window.storage dell'anteprima Claude.
 * - shared = true  -> salvato su Supabase, visibile a tutti (bacheca, voti)
 * - shared = false -> salvato solo nel browser di chi lo usa (bozza personale, "ho gia' votato")
 *
 * Mantiene la stessa forma di risposta dell'originale: { key, value, shared } oppure null.
 */
export const storage = {
  async get(key, shared = false) {
    if (!shared) {
      const value = localStorage.getItem(key);
      return value === null ? null : { key, value, shared: false };
    }
    if (!supabase) throw new Error("Supabase non configurato");
    const { data, error } = await supabase
      .from(TABLE)
      .select("value")
      .eq("key", key)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return { key, value: data.value, shared: true };
  },

  async set(key, value, shared = false) {
    if (!shared) {
      localStorage.setItem(key, value);
      return { key, value, shared: false };
    }
    if (!supabase) throw new Error("Supabase non configurato");
    const { error } = await supabase
      .from(TABLE)
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) throw error;
    return { key, value, shared: true };
  },

  async delete(key, shared = false) {
    if (!shared) {
      localStorage.removeItem(key);
      return { key, deleted: true, shared: false };
    }
    if (!supabase) throw new Error("Supabase non configurato");
    const { error } = await supabase.from(TABLE).delete().eq("key", key);
    if (error) throw error;
    return { key, deleted: true, shared: true };
  },

  async list(prefix = "", shared = false) {
    if (!shared) {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) keys.push(k);
      }
      return { keys, prefix, shared: false };
    }
    if (!supabase) throw new Error("Supabase non configurato");
    const { data, error } = await supabase
      .from(TABLE)
      .select("key")
      .like("key", `${prefix}%`);
    if (error) throw error;
    return { keys: (data || []).map((r) => r.key), prefix, shared: true };
  },
};
