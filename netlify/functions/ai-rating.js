// Funzione "serverless": gira sui server di Netlify, non nel browser del visitatore.
// Cosi' la chiave API di Anthropic (ANTHROPIC_API_KEY, da impostare nelle variabili
// d'ambiente di Netlify) non e' mai visibile a chi apre il sito.

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let payload;
  try {
    payload = JSON.parse(event.body).payload;
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Corpo della richiesta non valido" }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "ANTHROPIC_API_KEY non configurata su Netlify" }),
    };
  }

  const byRole = {};
  (payload.players || []).forEach((p) => {
    byRole[p.role] = (byRole[p.role] || 0) + p.price;
  });
  const totalSpent = (payload.players || []).reduce((s, p) => s + p.price, 0);
  const roleBreakdown = Object.entries(byRole)
    .map(([role, spent]) => {
      const pct = totalSpent > 0 ? Math.round((spent / totalSpent) * 100) : 0;
      return `${role}: ${spent} crediti (${pct}% del totale speso)`;
    })
    .join(", ");
  const topBuy = (payload.players || []).reduce(
    (max, p) => (p.price > (max?.price || 0) ? p : max),
    null
  );
  const playerNames = (payload.players || [])
    .map((p) => p.name)
    .filter(Boolean)
    .join(", ");

  const prompt = `Sei un commentatore di fantacalcio simpatico e diretto. Valuta una squadra acquistata durante un'asta con un voto intero da 1 a 10 e un commento breve (massimo 2 frasi, in italiano).

Basa il voto su questi criteri:
1. Ripartizione del budget tra i reparti, confrontata con una ripartizione tipica sensata (indicativamente: portieri ~5%, difensori ~20%, centrocampisti ~30%, attaccanti ~45% del totale speso) - non e' una regola fissa, ma un riferimento per capire se la squadra e' sbilanciata.
2. Quanto sono forti/rilevanti nel calcio reale i giocatori acquistati (titolari fissi, in buona forma, squadra di alto livello) rispetto al prezzo pagato per loro. Se non sei sicuro delle informazioni piu' recenti su un giocatore, puoi cercarle sul web prima di rispondere.
3. Se c'e' un acquisto molto piu' costoso degli altri, se questo rischio sembra giustificato dal valore reale del giocatore.

Importante: non citare, riportare o inventare quotazioni ufficiali di fantacalcio di alcun sito o listone. Basati solo sulla tua conoscenza generale del calcio reale (rendimento, titolarita', livello della squadra) e sul buon senso, non su un valore in crediti di terzi.

Dati squadra:
- Budget totale: ${payload.budget}
- Speso: ${totalSpent}
- Numero partecipanti alla lega: ${payload.participants ?? "non indicato"}
- Ripartizione per reparto: ${roleBreakdown || "nessun giocatore"}
- Acquisto piu' costoso: ${topBuy ? `${topBuy.name} (${topBuy.price} crediti)` : "nessuno"}
- Giocatori acquistati: ${playerNames || "nessuno"}

Rispondi SOLO con un oggetto JSON valido, senza markdown e senza testo fuori dal JSON, con chiavi "score" (intero 1-10) e "comment" (stringa, massimo 2 frasi).`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 500,
        temperature: 0.3,
        messages: [{ role: "user", content: prompt }],
        tools: [{ type: "web_search_20250305", name: "web_search" }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { statusCode: res.status, body: JSON.stringify({ error: errText }) };
    }

    const data = await res.json();
    const textBlocks = (data.content || []).filter((b) => b.type === "text");
    const textBlock = textBlocks[textBlocks.length - 1];
    if (!textBlock) {
      return { statusCode: 502, body: JSON.stringify({ error: "Nessuna risposta testuale dall'IA" }) };
    }

    const clean = textBlock.text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    const result = {
      score: Math.max(1, Math.min(10, Math.round(Number(parsed.score) || 0))),
      comment: String(parsed.comment || "").slice(0, 400),
    };

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) };
  }
}
