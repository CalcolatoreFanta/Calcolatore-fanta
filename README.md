# Calcolatore Fanta — guida per mettere online il sito vero

Questa cartella contiene tutto il codice pronto. Qui sotto trovi i passi da fare
tu, uno alla volta, senza bisogno di scrivere codice. Se ti blocchi su un passo,
torna nella chat con Claude e chiedi aiuto specifico su quel punto.

## Prima di iniziare

Ti servono, nell'ordine:
1. Un account GitHub (gratis) — dove "vive" il codice
2. Un account Supabase (gratis) — il database per la Bacheca e i voti
3. Un account Netlify (gratis) — dove il sito viene effettivamente pubblicato
4. Una chiave API di Anthropic (a consumo, serve solo per il voto IA) — opzionale,
   se non la configuri il resto del sito funziona lo stesso, semplicemente il
   voto IA non sara' disponibile
5. Il dominio calcolatorefanta.it (o quello che avrai scelto) — verificalo e
   registralo quando sei pronto

---

## PASSO 1 — Crea il progetto su Supabase (il database)

1. Vai su supabase.com, crea un account gratuito, poi crea un nuovo progetto
   (dagli un nome tipo "calcolatore-fanta").
2. Una volta creato, vai nella sezione **SQL Editor** (menu a sinistra) e
   incolla questo comando, poi premi "Run":

```sql
create table shared_store (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);

alter table shared_store enable row level security;

create policy "chiunque puo' leggere" on shared_store
  for select using (true);

create policy "chiunque puo' scrivere" on shared_store
  for insert with check (true);

create policy "chiunque puo' aggiornare" on shared_store
  for update using (true);

create policy "chiunque puo' cancellare" on shared_store
  for delete using (true);
```

**Nota onesta**: queste regole permettono a chiunque di leggere e scrivere nella
Bacheca senza bisogno di login — e' quello che serve per far funzionare la
pubblicazione delle squadre e i voti cosi' come li abbiamo progettati (nessun
account utente). Lo svantaggio e' che, in teoria, chiunque potrebbe anche
cancellare o modificare dati che non sono i suoi. Per un primo lancio con
amici e una community piccola e' un rischio accettabile; se in futuro cresce
molto, si puo' aggiungere un vero sistema di login per stringere queste regole.

3. Vai su **Project Settings -> API**: qui trovi due valori da copiare da
   qualche parte (ti serviranno al Passo 4):
   - "Project URL"
   - "anon public" key

---

## PASSO 2 — Carica il codice su GitHub

1. Crea un account su github.com se non ce l'hai.
2. Crea un nuovo repository (es. "calcolatore-fanta"), vuoto.
3. Carica dentro tutti i file di questa cartella (puoi trascinarli nella
   pagina web di GitHub, oppure chiedere a Claude come fare con Claude Code se
   preferisci farlo da terminale).

---

## PASSO 3 — Collega Netlify

1. Vai su netlify.com, crea un account gratuito, collegalo al tuo GitHub.
2. Scegli "Import from Git" e seleziona il repository che hai appena creato.
3. Netlify legge automaticamente il file `netlify.toml` incluso in questa
   cartella e sa gia' come costruire il sito — non devi configurare nulla a mano.

---

## PASSO 4 — Imposta le chiavi (variabili d'ambiente)

Sempre su Netlify, vai in **Site settings -> Environment variables** e aggiungi:

| Nome variabile | Valore |
|---|---|
| `VITE_SUPABASE_URL` | il "Project URL" copiato dal Passo 1 |
| `VITE_SUPABASE_ANON_KEY` | la "anon public" key copiata dal Passo 1 |
| `ANTHROPIC_API_KEY` | la tua chiave API di Anthropic (opzionale, solo per il voto IA — la trovi su console.anthropic.com dopo aver creato un account e attivato la fatturazione) |

Dopo aver aggiunto le variabili, rilancia il deploy (Netlify di solito lo
chiede da solo, altrimenti c'e' un bottone "Trigger deploy").

---

## PASSO 5 — Collega il dominio

1. Compra il dominio (es. su Aruba, Register.it, o dove preferisci) se non
   l'hai gia' fatto.
2. Su Netlify, vai in **Domain settings -> Add a domain**, scrivi
   calcolatorefanta.it (o il tuo).
3. Netlify ti mostra due o tre righe di configurazione DNS da inserire dal
   pannello del tuo fornitore del dominio (di solito si chiamano "record DNS"
   o "nameserver"). Ogni fornitore ha un'interfaccia leggermente diversa: se
   ti blocchi qui, portami uno screenshot del pannello e ti dico esattamente
   dove cliccare.
4. Il collegamento puo' richiedere da pochi minuti a qualche ora per
   attivarsi del tutto.

---

## Cosa succede se salti il Passo 1 (Supabase) o la chiave IA

- Senza Supabase configurato: il Calcolatore funziona normalmente, ma la
  Bacheca (pubblicare/vedere le squadre altrui, votare) non funzionera'.
- Senza la chiave Anthropic: tutto il resto funziona, semplicemente il voto
  IA non sara' disponibile quando pubblichi una squadra (nessun errore
  bloccante, semplicemente quella parte non risponde).

Puoi quindi pubblicare il sito anche senza aver completato tutti i passi,
e completarli con calma in un secondo momento.
