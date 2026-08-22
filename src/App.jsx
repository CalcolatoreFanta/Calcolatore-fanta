import React, { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Trash2, Shield, Star, Send, Users, Wallet, Sparkles, ChevronRight, Loader2, Share2, ArrowRight, Check, AlertTriangle, RotateCcw, ArrowUpDown, HelpCircle, X } from "lucide-react";
import { storage } from "./storage.js";
import QRCode from "qrcode";

// Indirizzo del sito: aggiornalo qui quando si passa al dominio vero (es. calcolatorefanta.it)
const SITE_URL = "https://calcolatorefanta.netlify.app";

// ---------------------------------------------------------------------------
// Design tokens (coerenti con la copertina: blu elettrico / esports)
// ---------------------------------------------------------------------------
const COLORS = {
  bgDeep: "#070B1F",
  bgSurface: "#0E1638",
  bgSurface2: "#121C46",
  border: "#22306B",
  primary: "#2E5CFF",
  cyan: "#00E5FF",
  white: "#F4F7FF",
  muted: "#8CA3E0",
  amber: "#FFC24B",
};

const CATEGORIES = [
  { key: "Portieri", label: "Portieri", slots: 3 },
  { key: "Difensori", label: "Difensori", slots: 8 },
  { key: "Centrocampisti", label: "Centrocampisti", slots: 8 },
  { key: "Attaccanti", label: "Attaccanti", slots: 6 },
];

const FONT_IMPORT_ID = "asta-fc-fonts";

function useFonts() {
  useEffect(() => {
    if (document.getElementById(FONT_IMPORT_ID)) return;
    const link = document.createElement("link");
    link.id = FONT_IMPORT_ID;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Anton&family=Rajdhani:wght@500;600;700&family=Montserrat:wght@800&display=swap";
    document.head.appendChild(link);
  }, []);
}

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function currency(n) {
  const v = Number(n) || 0;
  return v.toLocaleString("it-IT");
}

function flattenPlayers(players) {
  return CATEGORIES.flatMap((c) =>
    players[c.key]
      .filter((p) => p.name.trim())
      .map((p) => ({ role: c.key, name: p.name, price: Number(p.price) || 0 }))
  );
}

// ---------------------------------------------------------------------------
// Generazione immagine condivisibile (canvas, nessuna libreria esterna)
// ---------------------------------------------------------------------------
function wrapTextLines(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function drawShareCanvas({ title, stats, players, footer }) {
  try {
    await document.fonts.load("48px Anton");
    await document.fonts.load("700 26px Rajdhani");
    await document.fonts.load("600 24px Rajdhani");
    await document.fonts.load("800 36px Montserrat");
  } catch {}

  const W = 900;
  const MIN_H = 1200;

  // griglia di spaziatura verticale: valori coerenti tra loro
  const MARGIN_X = 56;
  const TOP_MARGIN = 70;
  const GAP_EYEBROW_TITLE = 95;
  const TITLE_LINE_H = 60;
  const GAP_TITLE_STATS = 34;
  const STATS_BOX_H = 90;
  const GAP_STATS_ROSA = 40;
  const GAP_ROSA_LIST = 24;
  const ROW_H = 34;
  const GAP_LIST_SIGNATURE = 66;
  const BOTTOM_MARGIN = 64;

  // canvas "di misura", solo per calcolare quanto spazio serve (titolo su piu' righe, N giocatori)
  const measureCanvas = document.createElement("canvas");
  measureCanvas.width = W;
  measureCanvas.height = 10;
  const mctx = measureCanvas.getContext("2d");
  mctx.font = "56px Anton";
  const titleLines = wrapTextLines(mctx, (title || "LA MIA SQUADRA").toUpperCase(), W - MARGIN_X * 2);

  let neededY = TOP_MARGIN + GAP_EYEBROW_TITLE + titleLines.length * TITLE_LINE_H;
  neededY += GAP_TITLE_STATS + STATS_BOX_H;
  neededY += GAP_STATS_ROSA;
  neededY += GAP_ROSA_LIST;
  neededY += players.length * ROW_H;
  neededY += GAP_LIST_SIGNATURE + 44; // spazio per il testo della firma
  neededY += BOTTOM_MARGIN;

  const H = Math.max(MIN_H, Math.ceil(neededY));

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#070B1F");
  bg.addColorStop(1, "#0E1638");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // genera il QR code che porta al sito, da disegnare in alto a destra
  let qrImg = null;
  try {
    const qrDataUrl = await QRCode.toDataURL(SITE_URL, {
      width: 240,
      margin: 0,
      color: { dark: "#0E1638", light: "#FFFFFF" },
    });
    qrImg = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = qrDataUrl;
    });
  } catch {
    qrImg = null; // se la generazione fallisce, l'immagine si crea comunque senza QR
  }

  ctx.fillStyle = "#00E5FF";
  ctx.font = "700 24px Rajdhani";
  ctx.fillText("CALCOLATORE FANTA", MARGIN_X, TOP_MARGIN);

  if (qrImg) {
    const qrSize = 84;
    const qrX = W - MARGIN_X - qrSize;
    const qrY = TOP_MARGIN - 38;
    const pad = 8;
    ctx.fillStyle = "#FFFFFF";
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(qrX - pad, qrY - pad, qrSize + pad * 2, qrSize + pad * 2, 10);
      ctx.fill();
    } else {
      ctx.fillRect(qrX - pad, qrY - pad, qrSize + pad * 2, qrSize + pad * 2);
    }
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
  }

  ctx.fillStyle = "#F4F7FF";
  ctx.font = "56px Anton";
  let cursorY = TOP_MARGIN + GAP_EYEBROW_TITLE;
  for (const ln of titleLines) {
    ctx.fillText(ln, MARGIN_X, cursorY);
    cursorY += TITLE_LINE_H;
  }

  cursorY += GAP_TITLE_STATS;
  const statBoxW = (W - MARGIN_X * 2 - (stats.length - 1) * 12) / stats.length;
  const compact = stats.length > 3;
  stats.forEach((s, i) => {
    const bx = MARGIN_X + i * (statBoxW + 12);
    ctx.strokeStyle = "#22306B";
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, cursorY, statBoxW, STATS_BOX_H);
    ctx.fillStyle = "#8CA3E0";
    ctx.font = compact ? "600 13px Rajdhani" : "600 15px Rajdhani";
    ctx.fillText(s.label.toUpperCase(), bx + (compact ? 12 : 14), cursorY + 28);
    ctx.fillStyle = s.color || "#F4F7FF";
    ctx.font = compact ? "26px Anton" : "32px Anton";
    ctx.fillText(String(s.value), bx + (compact ? 12 : 14), cursorY + (compact ? 64 : 68));
  });
  cursorY += STATS_BOX_H + GAP_STATS_ROSA;

  ctx.fillStyle = "#00E5FF";
  ctx.font = "700 18px Rajdhani";
  const rosaW = ctx.measureText("ROSA").width;
  ctx.fillText("ROSA", (W - rosaW) / 2, cursorY);
  cursorY += GAP_ROSA_LIST;

  // lista ordinata e numerata, contenuta in una colonna centrale (non tocca i bordi)
  // il canvas e' gia' stato dimensionato per contenerli tutti, quindi nessun taglio
  const listW = 560;
  const listX = (W - listW) / 2;
  players.forEach((p, i) => {
    cursorY += ROW_H;
    const num = String(i + 1).padStart(2, "0");
    ctx.fillStyle = "#8CA3E0";
    ctx.font = "600 18px Rajdhani";
    ctx.fillText(num, listX, cursorY);
    ctx.fillStyle = "#F4F7FF";
    ctx.font = "600 22px Rajdhani";
    ctx.fillText(p.name, listX + 42, cursorY);
    ctx.fillStyle = "#00E5FF";
    const priceText = currency(p.price);
    const w = ctx.measureText(priceText).width;
    ctx.fillText(priceText, listX + listW - w, cursorY);
    ctx.strokeStyle = "#22306B";
    ctx.beginPath();
    ctx.moveTo(listX, cursorY + ROW_H);
    ctx.lineTo(listX + listW, cursorY + ROW_H);
    ctx.stroke();
  });
  cursorY += ROW_H; // fine reale della lista (sotto l'ultima riga)
  cursorY += GAP_LIST_SIGNATURE;

  // firma in basso: "calcolatore" in ciano + "fanta" in bianco + il resto dell'indirizzo attuale,
  // ridimensionata automaticamente se il testo e' troppo lungo per stare in una riga
  const sigSegments = [
    { text: "calcolatore", color: "#00E5FF" },
    { text: "fanta", color: "#F4F7FF" },
    { text: ".netlify.app", color: "#8CA3E0" },
  ];
  let sigFontSize = 36;
  const maxSigW = W - 112;
  while (sigFontSize > 16) {
    ctx.font = `800 ${sigFontSize}px Montserrat`;
    const totalChars = sigSegments.reduce((n, s) => n + s.text.length, 0);
    let w = 0;
    sigSegments.forEach((s) => {
      for (const ch of s.text) w += ctx.measureText(ch).width;
    });
    w += 3 * (totalChars - 1);
    if (w <= maxSigW) break;
    sigFontSize -= 2;
  }
  ctx.font = `800 ${sigFontSize}px Montserrat`;
  const sigChars = [];
  sigSegments.forEach((seg) => {
    for (const ch of seg.text) sigChars.push({ ch, color: seg.color });
  });
  let sigTotalW = 0;
  sigChars.forEach((c) => (sigTotalW += ctx.measureText(c.ch).width));
  sigTotalW += 3 * (sigChars.length - 1);
  let sigX = (W - sigTotalW) / 2;
  sigChars.forEach((c, i) => {
    ctx.fillStyle = c.color;
    ctx.fillText(c.ch, sigX, cursorY);
    sigX += ctx.measureText(c.ch).width + 3;
  });

  return canvas.toDataURL("image/png");
}

async function shareSquadImage(payload) {
  const dataUrl = await drawShareCanvas(payload);
  const blob = await (await fetch(dataUrl)).blob();
  const file = new File([blob], "squadra-fantacalcio.png", { type: "image/png" });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({
      files: [file],
      title: "La mia squadra",
      text: "Guarda la mia squadra del fantacalcio!",
    });
  } else {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "squadra-fantacalcio.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
}

function ShareButton({ getPayload, label = "Condividi" }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handle = async () => {
    setBusy(true);
    setError("");
    try {
      await shareSquadImage(getPayload());
    } catch (e) {
      if (e && e.name === "AbortError") {
        // l'utente ha chiuso il menu di condivisione: nessun errore da mostrare
      } else {
        setError("Condivisione non riuscita in questa anteprima. Prova ad aprire l'app in una scheda del browser.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <button onClick={handle} disabled={busy} style={secondaryBtnStyle}>
        {busy ? (
          <>
            <Loader2 size={15} className="spin" /> Genero immagine...
          </>
        ) : (
          <>
            <Share2 size={15} /> {label}
          </>
        )}
      </button>
      {error && (
        <div style={{ color: "#FF6B6B", fontFamily: "Rajdhani", fontSize: 12, marginTop: 6 }}>
          {error}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componenti di base
// ---------------------------------------------------------------------------
function Eyebrow({ children }) {
  return (
    <div
      style={{
        fontFamily: "Rajdhani",
        fontWeight: 700,
        letterSpacing: "3px",
        fontSize: "13px",
        color: COLORS.cyan,
        textTransform: "uppercase",
      }}
    >
      {children}
    </div>
  );
}

function GlowBar({ pct }) {
  const clamped = Math.min(100, Math.max(0, pct * 100));
  const danger = pct > 0.95;
  return (
    <div
      style={{
        width: "100%",
        height: 10,
        borderRadius: 6,
        background: "#0A1230",
        border: `1px solid ${COLORS.border}`,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${clamped}%`,
          height: "100%",
          background: danger
            ? "linear-gradient(90deg,#FF6B6B,#FFC24B)"
            : `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.cyan})`,
          boxShadow: `0 0 12px ${danger ? "#FF6B6B" : COLORS.cyan}`,
          transition: "width 0.35s ease",
        }}
      />
    </div>
  );
}

function AngularCard({ children, style = {} }) {
  return (
    <div
      style={{
        background: `linear-gradient(160deg, ${COLORS.bgSurface}, ${COLORS.bgSurface2})`,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 14,
        padding: 18,
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 46,
          height: 46,
          background: `linear-gradient(135deg, ${COLORS.primary}55, transparent)`,
          clipPath: "polygon(0 0, 100% 0, 0 100%)",
        }}
      />
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TAB 1: Calcolatore asta
// ---------------------------------------------------------------------------
function Calculator({ squadState, setSquadState }) {
  const { budget, teamName, players } = squadState;
  const [confirmReset, setConfirmReset] = useState(false);

  const setBudget = (v) =>
    setSquadState((s) => ({ ...s, budget: v === "" ? "" : Number(v) }));

  const setTeamName = (v) => setSquadState((s) => ({ ...s, teamName: v }));

  const resetSquad = () => {
    setSquadState({
      teamName: "",
      budget: 1000,
      players: { Portieri: [], Difensori: [], Centrocampisti: [], Attaccanti: [] },
    });
    setConfirmReset(false);
  };

  const addPlayer = (cat) => {
    setSquadState((s) => ({
      ...s,
      players: {
        ...s.players,
        [cat]: [...s.players[cat], { id: uid(), name: "", price: "" }],
      },
    }));
  };

  const updatePlayer = (cat, id, field, value) => {
    setSquadState((s) => ({
      ...s,
      players: {
        ...s.players,
        [cat]: s.players[cat].map((p) =>
          p.id === id ? { ...p, [field]: value } : p
        ),
      },
    }));
  };

  const removePlayer = (cat, id) => {
    setSquadState((s) => ({
      ...s,
      players: {
        ...s.players,
        [cat]: s.players[cat].filter((p) => p.id !== id),
      },
    }));
  };

  const totalSpeso = CATEGORIES.reduce(
    (sum, c) =>
      sum + players[c.key].reduce((s2, p) => s2 + (Number(p.price) || 0), 0),
    0
  );
  const budgetNum = Number(budget) || 0;
  const rimanenti = budgetNum - totalSpeso;
  const pctUsed = budgetNum > 0 ? totalSpeso / budgetNum : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Riepilogo */}
      <AngularCard>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
          {confirmReset ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: "Rajdhani", color: COLORS.muted, fontSize: 13 }}>
                Sicuro? Cancelli tutto.
              </span>
              <button onClick={resetSquad} style={{ ...secondaryBtnStyle, borderColor: "#FF6B6B", color: "#FF6B6B", padding: "6px 12px" }}>
                Sì, cancella
              </button>
              <button onClick={() => setConfirmReset(false)} style={{ ...iconBtnStyle }}>
                <X size={14} />
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmReset(true)} style={{ ...secondaryBtnStyle, padding: "6px 12px", fontSize: 13 }}>
              <RotateCcw size={14} /> Nuova squadra
            </button>
          )}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 18,
            alignItems: "end",
          }}
        >
          <div>
            <Eyebrow>Nome squadra</Eyebrow>
            <input
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="La tua squadra"
              style={inputStyle}
            />
          </div>
          <div>
            <Eyebrow>Budget totale</Eyebrow>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              style={{ ...inputStyle, color: COLORS.amber, fontWeight: 700 }}
            />
          </div>
          <div>
            <Eyebrow>Speso</Eyebrow>
            <div style={statStyle}>{currency(totalSpeso)}</div>
          </div>
          <div>
            <Eyebrow>Rimanenti</Eyebrow>
            <div
              style={{
                ...statStyle,
                color: rimanenti < 0 ? "#FF6B6B" : COLORS.cyan,
              }}
            >
              {currency(rimanenti)}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <GlowBar pct={pctUsed} />
          <div
            style={{
              fontFamily: "Rajdhani",
              color: COLORS.muted,
              fontSize: 13,
              marginTop: 6,
            }}
          >
            {(pctUsed * 100).toFixed(1)}% del budget utilizzato
          </div>
          {rimanenti < 0 && (
            <div
              style={{
                marginTop: 10,
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                borderRadius: 8,
                background: "#FF6B6B22",
                border: "1px solid #FF6B6B66",
                color: "#FF6B6B",
                fontFamily: "Rajdhani",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              <AlertTriangle size={16} /> Hai speso {currency(Math.abs(rimanenti))} in più del budget
            </div>
          )}
        </div>
      </AngularCard>

      {/* Reparti */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 16,
        }}
      >
        {CATEGORIES.map((cat) => {
          const list = players[cat.key];
          const subtotal = list.reduce(
            (s, p) => s + (Number(p.price) || 0),
            0
          );
          return (
            <AngularCard key={cat.key}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    fontFamily: "Anton",
                    fontSize: 20,
                    color: COLORS.white,
                    letterSpacing: "1px",
                  }}
                >
                  {cat.label}
                </div>
                <div
                  style={{
                    fontFamily: "Rajdhani",
                    fontWeight: 700,
                    color: COLORS.cyan,
                  }}
                >
                  {currency(subtotal)}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {list.map((p) => (
                  <div key={p.id} style={{ display: "flex", gap: 6 }}>
                    <input
                      value={p.name}
                      onChange={(e) =>
                        updatePlayer(cat.key, p.id, "name", e.target.value)
                      }
                      placeholder="Nome giocatore"
                      style={{ ...inputStyle, flex: 1, padding: "8px 10px" }}
                    />
                    <input
                      type="number"
                      value={p.price}
                      onChange={(e) =>
                        updatePlayer(cat.key, p.id, "price", e.target.value)
                      }
                      placeholder="€"
                      style={{
                        ...inputStyle,
                        width: 70,
                        padding: "8px 10px",
                      }}
                    />
                    <button
                      onClick={() => removePlayer(cat.key, p.id)}
                      style={iconBtnStyle}
                      aria-label="Rimuovi giocatore"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={() => addPlayer(cat.key)}
                style={{
                  marginTop: 10,
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  padding: "8px 0",
                  borderRadius: 8,
                  border: `1px dashed ${COLORS.border}`,
                  background: "transparent",
                  color: COLORS.muted,
                  fontFamily: "Rajdhani",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <Plus size={15} /> Aggiungi giocatore
              </button>
            </AngularCard>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TAB 2: Bacheca community
// ---------------------------------------------------------------------------
function PublishForm({ squadState, onPublished }) {
  const [participants, setParticipants] = useState("");
  const [comment, setComment] = useState("");
  const [wantAiScore, setWantAiScore] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");

  const flatPlayers = CATEGORIES.flatMap((c) =>
    squadState.players[c.key]
      .filter((p) => p.name.trim())
      .map((p) => ({ role: c.key, name: p.name, price: Number(p.price) || 0 }))
  );

  const totalSpeso = flatPlayers.reduce((s, p) => s + p.price, 0);

  const getAiRating = async (payload) => {
    // tutta la logica del prompt e la chiave API vivono nella funzione serverless
    // (netlify/functions/ai-rating.js), mai nel codice che gira nel browser
    const res = await fetch("/.netlify/functions/ai-rating", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload }),
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      throw new Error(`Voto IA non disponibile (${res.status}): ${errBody}`);
    }
    const result = await res.json();
    return {
      score: Math.max(1, Math.min(10, Math.round(Number(result.score) || 0))),
      comment: String(result.comment || "").slice(0, 400),
    };
  };

  const publish = async () => {
    setError("");
    if (!squadState.teamName.trim()) {
      setError("Dai un nome alla tua squadra prima di pubblicare.");
      return;
    }
    if (flatPlayers.length === 0) {
      setError("Aggiungi almeno un giocatore nel calcolatore prima di pubblicare.");
      return;
    }
    setPublishing(true);
    try {
      const squad = {
        id: uid(),
        name: squadState.teamName,
        budget: Number(squadState.budget) || 0,
        participants: participants ? Number(participants) : null,
        players: flatPlayers,
        totalSpeso,
        comment: comment.trim(),
        createdAt: Date.now(),
        votes: { sum: 0, count: 0 },
        ai: null,
      };

      if (wantAiScore) {
        try {
          squad.ai = await getAiRating({
            budget: squad.budget,
            participants: squad.participants,
            players: squad.players,
          });
        } catch (e) {
          squad.ai = null; // se l'IA fallisce, pubblichiamo comunque la squadra
        }
      }

      await storage.set(`squad:${squad.id}`, JSON.stringify(squad), true);
      setComment("");
      setParticipants("");
      onPublished();
    } catch (e) {
      setError("Pubblicazione non riuscita, riprova.");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <AngularCard style={{ marginBottom: 18 }}>
      <Eyebrow>Pubblica la tua squadra</Eyebrow>
      <div
        style={{
          fontFamily: "Rajdhani",
          color: COLORS.muted,
          fontSize: 14,
          margin: "6px 0 14px",
        }}
      >
        Usa i giocatori inseriti nel Calcolatore. Aggiungi qualche dettaglio e pubblica per farla votare dalla community.
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div>
          <Eyebrow>Partecipanti alla lega</Eyebrow>
          <input
            type="number"
            value={participants}
            onChange={(e) => setParticipants(e.target.value)}
            placeholder="es. 8"
            style={inputStyle}
          />
        </div>
        <div>
          <Eyebrow>Giocatori inseriti</Eyebrow>
          <div style={statStyle}>{flatPlayers.length}</div>
        </div>
        <div>
          <Eyebrow>Totale speso</Eyebrow>
          <div style={statStyle}>{currency(totalSpeso)}</div>
        </div>
      </div>

      <Eyebrow>Commento (facoltativo)</Eyebrow>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Racconta la tua strategia d'asta..."
        rows={2}
        style={{ ...inputStyle, resize: "vertical", marginTop: 6 }}
      />

      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 12,
          fontFamily: "Rajdhani",
          color: COLORS.muted,
          fontSize: 14,
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={wantAiScore}
          onChange={(e) => setWantAiScore(e.target.checked)}
        />
        Chiedi anche un voto all'IA
      </label>
      {wantAiScore && (
        <div
          style={{
            fontFamily: "Rajdhani",
            color: COLORS.muted,
            fontSize: 12,
            marginTop: 4,
            marginLeft: 24,
          }}
        >
          È un giudizio automatico basato solo sui dati che inserisci (prezzi, equilibrio budget) — un tocco divertente, non un parere da esperto.
        </div>
      )}

      {error && (
        <div style={{ color: "#FF6B6B", fontFamily: "Rajdhani", marginTop: 10 }}>
          {error}
        </div>
      )}

      <button onClick={publish} disabled={publishing} style={primaryBtnStyle}>
        {publishing ? (
          <>
            <Loader2 size={16} className="spin" /> Pubblicazione in corso...
          </>
        ) : (
          <>
            <Send size={16} /> Pubblica squadra
          </>
        )}
      </button>
    </AngularCard>
  );
}

function SquadCard({ squad, onVoted }) {
  const [voted, setVoted] = useState(null);
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await storage.get(`voted:${squad.id}`, false);
        setVoted(r ? Number(r.value) : 0);
      } catch {
        setVoted(0);
      }
    })();
  }, [squad.id]);

  const castVote = async (value) => {
    if (voting || voted) return;
    setVoting(true);
    try {
      const fresh = await storage.get(`squad:${squad.id}`, true);
      const current = fresh ? JSON.parse(fresh.value) : squad;
      const updated = {
        ...current,
        votes: {
          sum: (current.votes?.sum || 0) + value,
          count: (current.votes?.count || 0) + 1,
        },
      };
      await storage.set(`squad:${squad.id}`, JSON.stringify(updated), true);
      await storage.set(`voted:${squad.id}`, String(value), false);
      setVoted(value);
      onVoted(updated);
    } catch {
      // silenzioso: se fallisce, l'utente puo' riprovare
    } finally {
      setVoting(false);
    }
  };

  const avg =
    squad.votes && squad.votes.count > 0
      ? (squad.votes.sum / squad.votes.count).toFixed(1)
      : null;

  return (
    <AngularCard>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontFamily: "Anton", fontSize: 22, color: COLORS.white }}>
            {squad.name}
          </div>
          <div style={{ fontFamily: "Rajdhani", color: COLORS.muted, fontSize: 13, display: "flex", gap: 14, marginTop: 2 }}>
            <span><Wallet size={13} style={{ verticalAlign: "-2px" }} /> Budget {currency(squad.budget)}</span>
            {squad.participants ? (
              <span><Users size={13} style={{ verticalAlign: "-2px" }} /> {squad.participants} partecipanti</span>
            ) : null}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {avg && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "Anton", fontSize: 24, color: COLORS.cyan }}>{avg}</div>
              <div style={{ fontFamily: "Rajdhani", fontSize: 11, color: COLORS.muted }}>
                media voti
              </div>
            </div>
          )}
          {squad.ai && (
            <div
              title="Voto generato dall'IA in base ai dati inseriti: un tocco divertente, non un parere da esperto"
              style={{
                textAlign: "center",
                border: `1px solid ${COLORS.primary}`,
                borderRadius: 10,
                padding: "4px 10px",
              }}
            >
              <div style={{ fontFamily: "Anton", fontSize: 20, color: COLORS.amber, display: "flex", alignItems: "center", gap: 4 }}>
                <Sparkles size={14} /> {squad.ai.score}
              </div>
              <div style={{ fontFamily: "Rajdhani", fontSize: 10, color: COLORS.muted }}>voto IA</div>
            </div>
          )}
        </div>
      </div>

      {squad.ai?.comment && (
        <div>
          <div
            style={{
              fontFamily: "Rajdhani",
              fontStyle: "italic",
              color: COLORS.amber,
              fontSize: 13,
              marginTop: 10,
              borderLeft: `2px solid ${COLORS.amber}`,
              paddingLeft: 10,
            }}
          >
            "{squad.ai.comment}"
          </div>
          <div
            style={{
              fontFamily: "Rajdhani",
              color: COLORS.muted,
              fontSize: 11,
              marginTop: 3,
              paddingLeft: 10,
            }}
          >
            Voto IA per gioco, non un'analisi statistica reale
          </div>
        </div>
      )}

      {squad.comment && (
        <div style={{ fontFamily: "Rajdhani", color: COLORS.white, fontSize: 14, marginTop: 10 }}>
          {squad.comment}
        </div>
      )}

      <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
        {squad.players.map((p, i) => (
          <div
            key={i}
            style={{
              fontFamily: "Rajdhani",
              fontSize: 12,
              fontWeight: 600,
              color: COLORS.white,
              background: "#0A1230",
              border: `1px solid ${COLORS.border}`,
              borderRadius: 6,
              padding: "4px 8px",
            }}
          >
            {p.name} <span style={{ color: COLORS.cyan }}>{currency(p.price)}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 14, borderTop: `1px solid ${COLORS.border}`, paddingTop: 12 }}>
        <div style={{ marginBottom: 12 }}>
          <ShareButton
            label="Condividi"
            getPayload={() => ({
              title: squad.name,
              stats: [
                { label: "Budget", value: currency(squad.budget) },
                { label: "Speso", value: currency(squad.totalSpeso) },
                {
                  label: "% speso",
                  value: `${squad.budget > 0 ? Math.round((squad.totalSpeso / squad.budget) * 100) : 0}%`,
                  color: "#00E5FF",
                },
                ...(avg ? [{ label: "Voto community", value: `${avg}/10`, color: "#00E5FF" }] : []),
              ],
              players: squad.players,
            })}
          />
        </div>
        {voted ? (
          <div style={{ fontFamily: "Rajdhani", color: COLORS.cyan, fontSize: 13 }}>
            Hai votato {voted}/10 <Star size={13} style={{ verticalAlign: "-2px" }} />
          </div>
        ) : (
          <div>
            <Eyebrow>Vota questa squadra</Eyebrow>
            <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((v) => (
                <button
                  key={v}
                  disabled={voting}
                  onClick={() => castVote(v)}
                  style={voteBtnStyle}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </AngularCard>
  );
}

function Board({ squadState }) {
  const [squads, setSquads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("recent"); // "recent" | "voted"

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const listRes = await storage.list("squad:", true);
      const keys = listRes?.keys || [];
      const items = [];
      for (const k of keys) {
        try {
          const r = await storage.get(k, true);
          if (r) items.push(JSON.parse(r.value));
        } catch {}
      }
      items.sort((a, b) => b.createdAt - a.createdAt);
      setSquads(items);
    } catch {
      setSquads([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleVoted = (updated) => {
    setSquads((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  const avgOf = (s) => (s.votes && s.votes.count > 0 ? s.votes.sum / s.votes.count : -1);
  const sortedSquads = [...squads].sort((a, b) =>
    sortBy === "voted" ? avgOf(b) - avgOf(a) : b.createdAt - a.createdAt
  );

  return (
    <div>
      <PublishForm squadState={squadState} onPublished={load} />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <div
          style={{
            fontFamily: "Rajdhani",
            color: COLORS.muted,
            fontSize: 12,
          }}
        >
          Dati visibili a chiunque usi questa pagina — nomi ed elenco giocatori sono pubblici. Un voto per persona.
        </div>
        {squads.length > 1 && (
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => setSortBy("recent")}
              style={sortBy === "recent" ? sortBtnActiveStyle : sortBtnStyle}
            >
              Più recenti
            </button>
            <button
              onClick={() => setSortBy("voted")}
              style={sortBy === "voted" ? sortBtnActiveStyle : sortBtnStyle}
            >
              Più votate
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ color: COLORS.muted, fontFamily: "Rajdhani" }}>
          <Loader2 size={16} className="spin" /> Caricamento squadre...
        </div>
      ) : squads.length === 0 ? (
        <AngularCard>
          <div style={{ fontFamily: "Rajdhani", color: COLORS.muted, textAlign: "center", padding: 20 }}>
            Nessuna squadra pubblicata ancora. Sii il primo!
          </div>
        </AngularCard>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {sortedSquads.map((s) => (
            <SquadCard key={s.id} squad={s} onVoted={handleVoted} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stili condivisi
// ---------------------------------------------------------------------------
const inputStyle = {
  width: "100%",
  background: "#0A1230",
  border: `1px solid ${COLORS.border}`,
  borderRadius: 8,
  padding: "10px 12px",
  color: COLORS.white,
  fontFamily: "Rajdhani",
  fontWeight: 600,
  fontSize: 15,
  outline: "none",
  boxSizing: "border-box",
};

const statStyle = {
  fontFamily: "Anton",
  fontSize: 24,
  color: COLORS.white,
};

const iconBtnStyle = {
  background: "transparent",
  border: `1px solid ${COLORS.border}`,
  borderRadius: 8,
  color: COLORS.muted,
  padding: "0 10px",
  cursor: "pointer",
};

const primaryBtnStyle = {
  marginTop: 16,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  width: "100%",
  padding: "12px 0",
  borderRadius: 10,
  border: "none",
  background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.cyan})`,
  color: "#031024",
  fontFamily: "Rajdhani",
  fontWeight: 700,
  fontSize: 15,
  cursor: "pointer",
  boxShadow: `0 0 18px ${COLORS.primary}66`,
};

const secondaryBtnStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "9px 16px",
  borderRadius: 9,
  border: `1px solid ${COLORS.cyan}`,
  background: "transparent",
  color: COLORS.cyan,
  fontFamily: "Rajdhani",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
};

const sortBtnStyle = {
  padding: "6px 12px",
  borderRadius: 8,
  border: `1px solid ${COLORS.border}`,
  background: "transparent",
  color: COLORS.muted,
  fontFamily: "Rajdhani",
  fontWeight: 600,
  fontSize: 12,
  cursor: "pointer",
};

const sortBtnActiveStyle = {
  ...sortBtnStyle,
  border: `1px solid ${COLORS.cyan}`,
  color: COLORS.cyan,
  background: `${COLORS.primary}22`,
};

const voteBtnStyle = {
  width: 32,
  height: 32,
  borderRadius: 6,
  border: `1px solid ${COLORS.border}`,
  background: "#0A1230",
  color: COLORS.white,
  fontFamily: "Rajdhani",
  fontWeight: 700,
  cursor: "pointer",
};

function BottomActionBar({ squadState }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const { teamName, budget, players } = squadState;
  const flat = flattenPlayers(players);
  const totalSpeso = flat.reduce((s, p) => s + p.price, 0);
  const budgetNum = Number(budget) || 0;
  const rimanenti = budgetNum - totalSpeso;

  const handle = async () => {
    if (busy || flat.length === 0) return;
    setBusy(true);
    setDone(false);
    setError("");
    try {
      await shareSquadImage({
        title: teamName || "La mia squadra",
        stats: [
          { label: "Budget", value: currency(budgetNum) },
          { label: "Speso", value: currency(totalSpeso) },
          {
            label: "Rimanenti",
            value: currency(rimanenti),
            color: rimanenti < 0 ? "#FF6B6B" : "#00E5FF",
          },
          {
            label: "% speso",
            value: `${budgetNum > 0 ? Math.round((totalSpeso / budgetNum) * 100) : 0}%`,
            color: "#00E5FF",
          },
        ],
        players: flat,
      });

      setDone(true);
      setTimeout(() => setDone(false), 2500);
    } catch (e) {
      if (e && e.name === "AbortError") {
        // l'utente ha chiuso il menu di condivisione: nessun errore da mostrare
      } else {
        setError("Condivisione non riuscita in questa anteprima. Prova ad aprire l'app in una scheda del browser.");
      }
    } finally {
      setBusy(false);
    }
  };

  const empty = flat.length === 0;

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        padding: "16px 16px calc(16px + env(safe-area-inset-bottom))",
        background: "linear-gradient(180deg, transparent, #070B1Fcc 35%, #070B1F 70%)",
        pointerEvents: "none",
      }}
    >
      {error && (
        <div
          style={{
            pointerEvents: "auto",
            color: "#FF6B6B",
            fontFamily: "Rajdhani",
            fontSize: 12,
            textAlign: "center",
            maxWidth: 320,
          }}
        >
          {error}
        </div>
      )}
      <button
        onClick={handle}
        disabled={busy || empty}
        title={empty ? "Aggiungi almeno un giocatore nel Calcolatore" : undefined}
        style={{
          pointerEvents: "auto",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "14px 26px",
          borderRadius: 999,
          border: "none",
          background: empty
            ? "#1A2352"
            : `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.cyan})`,
          color: empty ? COLORS.muted : "#031024",
          fontFamily: "Rajdhani",
          fontWeight: 700,
          fontSize: 16,
          cursor: empty ? "not-allowed" : "pointer",
          boxShadow: empty ? "none" : `0 4px 24px ${COLORS.primary}88`,
        }}
      >
        {busy ? (
          <Loader2 size={19} className="spin" />
        ) : done ? (
          <Star size={19} />
        ) : (
          <ArrowRight size={19} className={empty ? "" : "bounce-x"} />
        )}
        {busy ? "Preparo l'immagine..." : done ? "Fatto!" : "Condividi su WhatsApp"}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Guida rapida
// ---------------------------------------------------------------------------
function GuideModal({ onClose }) {
  const steps = [
    {
      title: "1. Imposta il budget",
      text: "Nel Calcolatore scrivi il nome della tua squadra e il budget totale a disposizione per l'asta.",
    },
    {
      title: "2. Aggiungi i giocatori",
      text: "In ogni reparto (Portieri, Difensori, Centrocampisti, Attaccanti) inserisci i giocatori con il prezzo pagato. Totali e budget rimanente si aggiornano da soli.",
    },
    {
      title: "3. Condividi la squadra",
      text: "In fondo alla pagina trovi il bottone per condividere un'immagine riassuntiva della tua rosa su WhatsApp.",
    },
    {
      title: "4. Pubblica in Bacheca",
      text: "Nella sezione Bacheca puoi pubblicare la squadra per farla votare dagli altri, e vedere quelle pubblicate da tutti.",
    },
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "#000000aa",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460, width: "100%" }}>
        <AngularCard>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <Eyebrow>Come funziona</Eyebrow>
              <div style={{ fontFamily: "Anton", fontSize: 24, color: COLORS.white, marginTop: 4 }}>
                Calcolatore Fanta
              </div>
            </div>
            <button onClick={onClose} style={iconBtnStyle}>
              <X size={16} />
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 16 }}>
            {steps.map((s) => (
              <div key={s.title}>
                <div style={{ fontFamily: "Rajdhani", fontWeight: 700, color: COLORS.cyan, fontSize: 15 }}>
                  {s.title}
                </div>
                <div style={{ fontFamily: "Rajdhani", color: COLORS.white, fontSize: 14, marginTop: 2 }}>
                  {s.text}
                </div>
              </div>
            ))}
          </div>

          <button onClick={onClose} style={primaryBtnStyle}>
            Ho capito, iniziamo
          </button>
        </AngularCard>
      </div>
    </div>
  );
}

export default function App() {
  useFonts();
  const [tab, setTab] = useState("calc");
  const [squadState, setSquadState] = useState({
    teamName: "",
    budget: 1000,
    players: { Portieri: [], Difensori: [], Centrocampisti: [], Attaccanti: [] },
  });
  const [showGuide, setShowGuide] = useState(false);

  // Ogni visita parte con la pagina vuota, pronta per l'uso: nessuna bozza viene
  // ricordata da una sessione all'altra. Mostriamo solo la guida, se e' la prima volta.
  useEffect(() => {
    (async () => {
      try {
        const seen = await storage.get("seen-guide", false);
        if (!seen) {
          setShowGuide(true);
          await storage.set("seen-guide", "1", false);
        }
      } catch {
        // se non riusciamo a verificare, non mostriamo la guida in automatico
      }
    })();
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `radial-gradient(circle at 20% 0%, #0F1E5A22, transparent 40%), radial-gradient(circle at 90% 80%, #00E5FF22, transparent 40%), ${COLORS.bgDeep}`,
        padding: "28px 16px 100px",
      }}
    >
      <style>{`
        * { box-sizing: border-box; }
        input::placeholder, textarea::placeholder { color: #5A6DA8; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }
        .bounce-x { animation: bounceX 1.1s ease-in-out infinite; }
        @keyframes bounceX { 0%,100% { transform: translateX(0);} 50% { transform: translateX(5px);} }
        button { transition: transform 0.15s ease, box-shadow 0.15s ease; }
        button:hover:not(:disabled) { transform: translateY(-1px); }
      `}</style>

      <button
        onClick={() => setShowGuide(true)}
        style={{
          position: "fixed",
          top: 16,
          right: 16,
          zIndex: 40,
          width: 34,
          height: 34,
          borderRadius: "50%",
          border: `1px solid ${COLORS.border}`,
          background: COLORS.bgSurface,
          color: COLORS.cyan,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
        title="Come funziona"
      >
        <HelpCircle size={18} />
      </button>

      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <Eyebrow>Fantacalcio</Eyebrow>
          <div
            style={{
              fontFamily: "Anton",
              fontSize: "clamp(32px, 6vw, 52px)",
              color: COLORS.white,
              letterSpacing: "1px",
              marginTop: 4,
            }}
          >
            CALCOLATORE <span style={{ color: COLORS.cyan }}>FANTA</span>
          </div>
          <div style={{ fontFamily: "Rajdhani", color: COLORS.muted, fontSize: 15, marginTop: 4 }}>
            Gestisci il budget in tempo reale e confronta la tua squadra con la community
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 22, justifyContent: "center" }}>
          <TabButton active={tab === "calc"} onClick={() => setTab("calc")} icon={<Wallet size={16} />}>
            Calcolatore
          </TabButton>
          <TabButton active={tab === "board"} onClick={() => setTab("board")} icon={<Shield size={16} />}>
            Bacheca squadre
          </TabButton>
        </div>

        {tab === "calc" && <Calculator squadState={squadState} setSquadState={setSquadState} />}
        {tab === "board" && <Board squadState={squadState} />}
      </div>
      {tab === "calc" && <BottomActionBar squadState={squadState} />}
      {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}
    </div>
  );
}

function TabButton({ active, onClick, icon, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 18px",
        borderRadius: 10,
        border: `1px solid ${active ? COLORS.cyan : COLORS.border}`,
        background: active ? `${COLORS.primary}22` : "transparent",
        color: active ? COLORS.cyan : COLORS.muted,
        fontFamily: "Rajdhani",
        fontWeight: 700,
        fontSize: 14,
        cursor: "pointer",
      }}
    >
      {icon} {children} {active && <ChevronRight size={14} />}
    </button>
  );
}
