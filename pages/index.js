import { useState, useEffect } from "react";
import Head from "next/head";

// ============================================================
// AI AFFILIATE PUBLISHER v6.1 — VERCEL DEPLOY VERSION
// ============================================================

const WORD_OPTIONS = [
  { value: 500, label: "500", desc: "Breve" },
  { value: 1000, label: "1.000", desc: "Standard SEO" },
  { value: 1500, label: "1.500", desc: "Approfondito" },
  { value: 2000, label: "2.000", desc: "Pillar content" },
];

function extractJSON(text) {
  try { return JSON.parse(text); } catch {}
  let c = text.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
  try { return JSON.parse(c); } catch {}
  const s = c.indexOf("{"), e = c.lastIndexOf("}");
  if (s !== -1 && e > s) { try { return JSON.parse(c.substring(s, e + 1)); } catch {} }
  const s2 = c.indexOf("["), e2 = c.lastIndexOf("]");
  if (s2 !== -1 && e2 > s2) { try { return JSON.parse(c.substring(s2, e2 + 1)); } catch {} }
  return null;
}

// --- AI text via proxy (GPT-4o Mini) ---
async function callAI(apiKey, system, user, maxTokens = 4096) {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: "chat",
      apiKey,
      payload: { model: "gpt-4o-mini", max_tokens: maxTokens, temperature: 0.7, messages: [{ role: "system", content: system }, { role: "user", content: user }] },
    }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `API ${res.status}`); }
  const d = await res.json();
  return d.choices?.[0]?.message?.content || "";
}

// --- DALL-E 3 via proxy ---
async function callDallE(apiKey, prompt) {
  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: "image",
        apiKey,
        payload: { model: "dall-e-3", prompt, n: 1, size: "1792x1024", quality: "standard" },
      }),
    });
    if (!res.ok) return "";
    const d = await res.json();
    return d.data?.[0]?.url || "";
  } catch { return ""; }
}

// --- Unsplash fallback ---
function getRandomImage(category) {
  const cats = {
    hero: ["https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=900&h=500&fit=crop&q=80","https://images.unsplash.com/photo-1570172619644-dfd03ed5d582?w=900&h=500&fit=crop&q=80","https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=900&h=500&fit=crop&q=80","https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=900&h=500&fit=crop&q=80"],
    ingredients: ["https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&h=450&fit=crop&q=80","https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800&h=450&fit=crop&q=80","https://images.unsplash.com/photo-1563822249366-3efb23b8e0c9?w=800&h=450&fit=crop&q=80"],
    results: ["https://images.unsplash.com/photo-1594824476967-48c8b964e05a?w=800&h=450&fit=crop&q=80","https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800&h=450&fit=crop&q=80","https://images.unsplash.com/photo-1580489944761-15a19d654956?w=800&h=450&fit=crop&q=80"],
  };
  const pool = cats[category] || cats.hero;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ===================== SEO SCORE =====================
function SeoScore({ article, targetWords }) {
  if (!article) return null;
  const t = article.title || "", mt = article.metaTitle || "", md = article.metaDescription || "";
  const b = article.body || "", kw = (article.keyword || "").toLowerCase();
  const bt = b.replace(/<[^>]*>/g, ""), wcc = bt.split(/\s+/).filter(Boolean).length;
  const checks = [];
  checks.push({ l: "Titolo H1", p: t.length > 10, d: `${t.length} car.` });
  checks.push({ l: "KW nel titolo", p: kw && t.toLowerCase().includes(kw), d: kw && t.toLowerCase().includes(kw) ? "✓" : "✗" });
  checks.push({ l: "Long tail (4+ parole)", p: kw.split(/\s+/).length >= 4, d: `${kw.split(/\s+/).length} parole` });
  checks.push({ l: "Meta title (50-60)", p: mt.length >= 40 && mt.length <= 65, d: `${mt.length}` });
  checks.push({ l: "KW nel meta title", p: kw && mt.toLowerCase().includes(kw), d: kw && mt.toLowerCase().includes(kw) ? "✓" : "✗" });
  checks.push({ l: "Meta desc (120-160)", p: md.length >= 100 && md.length <= 165, d: `${md.length}` });
  checks.push({ l: "KW nella meta desc", p: kw && md.toLowerCase().includes(kw), d: kw && md.toLowerCase().includes(kw) ? "✓" : "✗" });
  const minW = Math.round(targetWords * 0.75);
  checks.push({ l: `Lunghezza ≥${minW}`, p: wcc >= minW, d: `${wcc}` });
  checks.push({ l: "H2 ≥ 3", p: (b.match(/<h2/gi) || []).length >= 3, d: `${(b.match(/<h2/gi) || []).length}` });
  checks.push({ l: "H3 presenti", p: (b.match(/<h3/gi) || []).length >= 1, d: `${(b.match(/<h3/gi) || []).length}` });
  if (kw) {
    const n = (bt.match(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi")) || []).length;
    const dens = ((n / Math.max(wcc, 1)) * 100).toFixed(1);
    checks.push({ l: "Densità KW (1-3%)", p: dens >= 0.8 && dens <= 3.5, d: `${dens}%` });
  }
  checks.push({ l: "Form ordine", p: /wf-form|affiliateproject|embed/i.test(b), d: /wf-form/i.test(b) ? "✓" : "✗" });
  checks.push({ l: "FAQ", p: /faq|domande frequenti/i.test(b), d: /faq/i.test(b) ? "✓" : "✗" });
  checks.push({ l: "Recensioni", p: /recensione|testimonianza|★/i.test(b), d: /★/i.test(b) ? "✓" : "✗" });
  checks.push({ l: "Immagini", p: (b.match(/<img/gi) || []).length >= 1, d: `${(b.match(/<img/gi) || []).length}` });
  checks.push({ l: "Img evidenza", p: !!article.featuredImage, d: article.featuredImage ? "✓" : "✗" });

  const pc = checks.filter(c => c.p).length, score = Math.round((pc / checks.length) * 100);
  const col = score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ background: "#1a1a2e", borderRadius: 14, padding: 16, border: "1px solid #2a2a4a" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div style={{ width: 60, height: 60, borderRadius: "50%", border: `4px solid ${col}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, color: col }}>{score}</div>
        <div><div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>SEO Score</div><div style={{ color: "#94a3b8", fontSize: 11 }}>{pc}/{checks.length}</div></div>
      </div>
      {checks.map((c, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 8px", borderRadius: 4, background: c.p ? "rgba(34,197,94,0.07)" : "rgba(239,68,68,0.07)", marginBottom: 2 }}>
          <span style={{ fontSize: 11, color: "#e2e8f0" }}>{c.p ? "✅" : "❌"} {c.l}</span>
          <span style={{ fontSize: 10, color: "#94a3b8" }}>{c.d}</span>
        </div>
      ))}
    </div>
  );
}

// ===================== EDITABLE =====================
function Editable({ label, content, sKey, onRegen, busy, html }) {
  const [edit, setEdit] = useState(false);
  const [val, setVal] = useState(content);
  const [instr, setInstr] = useState("");
  useEffect(() => setVal(content), [content]);
  return (
    <div style={{ background: "#1a1a2e", borderRadius: 10, padding: 14, border: "1px solid #2a2a4a", marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ color: "#818cf8", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>{label}</span>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => setEdit(!edit)} style={{ background: "#2a2a4a", border: "none", color: "#94a3b8", padding: "4px 8px", borderRadius: 5, cursor: "pointer", fontSize: 10 }}>{edit ? "✕" : "✏️"}</button>
          {edit && <button onClick={() => { onRegen(sKey, null, val); setEdit(false); }} style={{ background: "#22c55e", border: "none", color: "#fff", padding: "4px 8px", borderRadius: 5, cursor: "pointer", fontSize: 10 }}>💾</button>}
          <button onClick={() => onRegen(sKey, instr)} disabled={busy} style={{ background: busy ? "#4a4a6a" : "#6366f1", border: "none", color: "#fff", padding: "4px 8px", borderRadius: 5, cursor: busy ? "wait" : "pointer", fontSize: 10 }}>{busy ? "⏳" : "🔄"}</button>
        </div>
      </div>
      {edit ? (
        <div>
          <input value={instr} onChange={e => setInstr(e.target.value)} placeholder="Istruzioni AI (es: 'più persuasivo')" style={{ width: "100%", background: "#0f0f23", border: "1px solid #3a3a5a", borderRadius: 5, padding: "5px 8px", color: "#e2e8f0", fontSize: 11, marginBottom: 4, boxSizing: "border-box" }} />
          <textarea value={val} onChange={e => setVal(e.target.value)} rows={sKey === "body" ? 25 : 3} style={{ width: "100%", background: "#0f0f23", border: "1px solid #3a3a5a", borderRadius: 5, padding: 8, color: "#e2e8f0", fontSize: 12, fontFamily: "monospace", resize: "vertical", boxSizing: "border-box" }} />
        </div>
      ) : (
        <div style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.6 }}>
          {html ? <div dangerouslySetInnerHTML={{ __html: content.length > 600 ? content.substring(0, 600) + '<span style="color:#6366f1"> [...]</span>' : content }} /> : content}
        </div>
      )}
    </div>
  );
}

// ===================== IMAGE CARD =====================
function ImageCard({ url, label, onRegenerate, busy }) {
  return (
    <div style={{ background: "#1a1a2e", borderRadius: 10, padding: 14, border: "1px solid #2a2a4a", marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ color: "#818cf8", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>{label}</span>
        <button onClick={onRegenerate} disabled={busy} style={{ background: busy ? "#4a4a6a" : "#6366f1", border: "none", color: "#fff", padding: "4px 10px", borderRadius: 5, cursor: busy ? "wait" : "pointer", fontSize: 10 }}>
          {busy ? "⏳" : "🔄 Cambia"}
        </button>
      </div>
      {url ? <img src={url} alt={label} style={{ width: "100%", borderRadius: 8, maxHeight: 260, objectFit: "cover" }} onError={(e) => { e.target.src = getRandomImage("hero"); }} /> : <div style={{ background: "#0f0f23", borderRadius: 8, padding: 30, textAlign: "center", color: "#64748b", fontSize: 12 }}>Nessuna immagine</div>}
    </div>
  );
}

// ===================== MAIN =====================
export default function Home() {
  const [wpUrl, setWpUrl] = useState("https://viverenaturale.blog");
  const [wpUser, setWpUser] = useState("pascucci.moreno3@gmail.com");
  const [wpPass, setWpPass] = useState("");
  const [oaiKey, setOaiKey] = useState("");
  const [showCfg, setShowCfg] = useState(true);
  const [imgMode, setImgMode] = useState("unsplash"); // "unsplash" or "dalle"

  const [pLink, setPLink] = useState("");
  const [embedCode, setEmbedCode] = useState("");
  const [wc, setWc] = useState(1000);

  const [step, setStep] = useState("input");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [rKey, setRKey] = useState(null);
  const [rImg, setRImg] = useState(null);

  const [prod, setProd] = useState(null);
  const [art, setArt] = useState(null);

  const wpOk = wpUrl && wpUser && wpPass;
  const aiOk = oaiKey.length > 10;

  // ---- GENERATE ----
  const generate = async () => {
    if (!aiOk) { setError("Inserisci la API Key OpenAI nelle impostazioni"); return; }
    setStep("analyzing"); setError("");

    try {
      // STEP 1: Product analysis
      setStatus("🔍 Analizzo il prodotto...");
      const p1 = await callAI(oaiKey,
        "Esperto affiliate marketing italiano. SOLO JSON valido. Niente backtick.",
        `Link prodotto: ${pLink}\nNetwork: offerte2019.network (salute/bellezza Italia)\nSe contiene "eslow"→Eslow Age siero anti-age con esosomi vegetali, acido ialuronico, elastina, collagene. 2x€49.99.\nAnalizza URL e deduci.\n\nJSON:\n{"productName":"","category":"bellezza|salute","targetAudience":"","mainBenefits":["","","","",""],"ingredients":["","","",""],"price":"","niche":"","keyFeatures":["","",""]}`, 700);
      let product = extractJSON(p1);
      if (!product || !product.productName) {
        const u = (pLink + embedCode).toLowerCase();
        if (u.includes("eslow")) {
          product = { productName: "Eslow Age", category: "bellezza", targetAudience: "Donne 35-65 anni con rughe e perdita di elasticità", mainBenefits: ["Riduce rughe e segni d'espressione", "Stimola collagene ed elastina", "Idratazione profonda", "Rinnovamento cellulare con esosomi", "Effetto lifting naturale"], ingredients: ["Esosomi vegetali", "Acido Ialuronico", "Elastina", "Collagene"], price: "2x €49.99", niche: "Anti-age esosomi vegetali", keyFeatures: ["Esosomi vegetali ultima generazione", "100% naturale", "8847+ clienti soddisfatti"] };
        } else {
          product = { productName: "Prodotto Benessere", category: "salute", targetAudience: "Adulti", mainBenefits: ["Efficace", "Naturale", "Sicuro", "Risultati visibili"], ingredients: ["Estratti naturali"], price: "Offerta speciale", niche: "Benessere", keyFeatures: ["Made in Italy"] };
        }
      }
      setProd(product);

      // STEP 2: Long Tail Keywords basate su INTENTO DI RICERCA (non nome prodotto)
      setStatus("🔍 Ricerco long tail keyword per " + product.productName + "...");
      const p2 = await callAI(oaiKey, "SEO specialist italiano esperto in long tail keyword e search intent. SOLO JSON. Niente backtick.",
        `Genera una LONG TAIL KEYWORD basata sull'INTENTO DI RICERCA dell'utente per un prodotto come "${product.productName}".

CATEGORIA: ${product.category}
TARGET: ${product.targetAudience}
PROBLEMA CHE RISOLVE: ${product.mainBenefits.join(", ")}
NICCHIA: ${product.niche}

REGOLE IMPORTANTI:
- La keyword NON deve contenere il nome del prodotto "${product.productName}"
- Deve essere una long tail keyword (4-8 parole) basata su cosa cercherebbe l'utente su Google
- Deve riflettere un PROBLEMA o un INTENTO DI RICERCA reale
- Esempi di buone long tail: "come eliminare le rughe profonde in modo naturale", "siero anti rughe naturale che funziona davvero", "rimedi naturali per pelle cadente dopo i 40", "come ringiovanire la pelle del viso senza chirurgia"
- Il titolo deve essere tipo domanda/guida che attira click da Google
- Lo slug deve essere lungo e SEO friendly

JSON:
{"keyword":"long tail 4-8 parole su intento ricerca","title":"Titolo H1 che risponde all'intento di ricerca (max 70 car)","metaTitle":"Meta title 50-60 car con keyword","metaDescription":"Meta description 130-155 car che promette la soluzione","slug":"slug-lungo-seo","excerpt":"2 frasi che descrivono il problema e la promessa","tags":["tag1","tag2","tag3","tag4","tag5"],"searchIntent":"descrizione dell intento di ricerca","problem":"il problema specifico del target","agitation":"perché il problema peggiora se non risolto"}`, 700);
      let meta = extractJSON(p2);
      if (!meta || !meta.keyword) {
        // Fallback con long tail generiche per categoria
        const fallbacks = {
          bellezza: { keyword: "come eliminare le rughe del viso in modo naturale", problem: "Le rughe e i segni del tempo che avanzano", agitation: "Ogni giorno che passa le rughe diventano più profonde e visibili" },
          salute: { keyword: "rimedi naturali efficaci per il benessere quotidiano", problem: "Lo stress e le abitudini moderne che deteriorano la salute", agitation: "Ignorare i segnali del corpo porta a problemi sempre più seri" },
          rimedi: { keyword: "soluzioni naturali senza effetti collaterali", problem: "Problemi di salute che non trovano soluzione", agitation: "I farmaci tradizionali spesso portano effetti collaterali indesiderati" },
        };
        const fb = fallbacks[product.category] || fallbacks.bellezza;
        meta = { keyword: fb.keyword, title: `${fb.keyword.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}: Guida Definitiva`, metaTitle: `${fb.keyword} | Metodo Naturale Efficace`, metaDescription: `Scopri ${fb.keyword}. Metodo comprovato, ingredienti naturali, risultati visibili. Leggi la guida completa con testimonianze reali.`, slug: fb.keyword.replace(/\s+/g, "-"), excerpt: `Guida completa: ${fb.keyword}. Scopri il metodo naturale che sta cambiando la vita di migliaia di persone.`, tags: [product.category, "naturale", "rimedi", "guida", "2026"], searchIntent: `L'utente cerca una soluzione a: ${fb.problem}`, problem: fb.problem, agitation: fb.agitation };
      }

      // STEP 3: Reviews
      setStatus("⭐ Genero recensioni realistiche...");
      const revResult = await callAI(oaiKey, "Copywriter italiano. SOLO JSON array.",
        `4 recensioni REALISTICHE per "${product.productName}". Target: ${product.targetAudience}.\nNomi italiani cognome puntato (Lucia G., Francesca M.), età 38-62, città italiane, esperienza specifica con tempi, stelle 4-5, 40-60 parole.\nJSON array: [{"name":"","age":0,"city":"","stars":5,"text":""}]`, 800);
      let reviews = extractJSON(revResult);
      if (!reviews || !Array.isArray(reviews) || reviews.length < 4) {
        reviews = [
          { name: "Lucia G.", age: 52, city: "Milano", stars: 5, text: `Uso ${product.productName} da 6 settimane. Le rughe intorno agli occhi si sono visibilmente ridotte e la pelle è molto più luminosa. Le amiche mi chiedono cosa ho fatto!` },
          { name: "Francesca M.", age: 45, city: "Roma", stars: 5, text: `Ero scettica ma dopo un mese i risultati parlano da soli. Pelle più tonica ed elastica, soprattutto nel contorno occhi. Lo consiglio a tutte le donne over 40.` },
          { name: "Anna R.", age: 58, city: "Napoli", stars: 4, text: `Dopo 3 settimane noto un netto miglioramento. Le rughe sulla fronte sono meno marcate e la pelle sembra più idratata. Continuerò ad usarlo.` },
          { name: "Giovanna P.", age: 41, city: "Torino", stars: 5, text: `Ho provato tanti sieri ma ${product.productName} è diverso. Si assorbe subito, non unge, e dopo 2 settimane la pelle era già più compatta.` },
        ];
      }

      // STEP 4: Images
      setStatus("🖼️ Genero immagini...");
      let heroImg, img1, img2;
      if (imgMode === "dalle" && aiOk) {
        heroImg = await callDallE(oaiKey, `Professional editorial beauty blog hero: Italian anti-aging serum, elegant glass bottle, soft pastel lighting, luxury skincare, clean, no text`);
        img1 = await callDallE(oaiKey, `Natural skincare ingredients flat lay: hyaluronic acid, collagen, botanical extracts, plant exosomes. Minimal, editorial, soft light`);
        img2 = await callDallE(oaiKey, `Italian woman 45yo beautiful glowing skin, applying facial serum, natural beauty, warm editorial light, confident`);
      }
      if (!heroImg) heroImg = getRandomImage("hero");
      if (!img1) img1 = getRandomImage("ingredients");
      if (!img2) img2 = getRandomImage("results");

      // STEP 5: Body con struttura PAS (Problem → Agitate → Solve)
      setStatus(`✍️ Scrivo articolo PAS su "${meta.keyword}" (${wc} parole)...`);
      const reviewsHtml = reviews.map(r => `<div style="background:#f8f9fa;border-radius:12px;padding:20px;margin:12px 0;border-left:4px solid #6366f1"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><strong style="color:#1a1a2e">${r.name}</strong><span style="color:#f59e0b;font-size:16px">${"★".repeat(r.stars)}${"☆".repeat(5 - (r.stars||5))}</span></div><p style="color:#374151;margin:0 0 6px;font-size:15px;line-height:1.6">"${r.text}"</p><span style="color:#6b7280;font-size:13px">${r.age} anni, ${r.city}</span></div>`).join("\n");

      const formEmbedHtml = `<div style="background:linear-gradient(135deg,#667eea,#764ba2);border-radius:16px;padding:30px;text-align:center;margin:30px 0"><h3 style="color:#fff;margin:0 0 15px;font-size:22px">🎁 Prova Adesso — Offerta Speciale</h3><p style="color:rgba(255,255,255,.9);margin:0 0 20px">${product.price} — Spedizione Gratuita 24/48h</p><div style="background:#fff;border-radius:12px;padding:20px;max-width:500px;margin:0 auto">${embedCode}</div></div>`;

      const bodyResult = await callAI(oaiKey,
        `Sei un copywriter SEO italiano esperto in content marketing persuasivo per "Vivere Naturale". Scrivi articoli con framework PAS (Problem-Agitate-Solve). SOLO HTML puro. Niente JSON, niente backtick, niente testo extra. Inizia direttamente con <p>.`,
        `SCRIVI UN ARTICOLO HTML DI ${wc} PAROLE.

=== STRATEGIA SEO LONG TAIL ===
KEYWORD PRINCIPALE: "${meta.keyword}"
INTENTO DI RICERCA: ${meta.searchIntent || "L'utente cerca una soluzione naturale al problema"}
REGOLA: La keyword "${meta.keyword}" DEVE apparire almeno ${Math.max(Math.round(wc / 70), 12)} volte nel testo, distribuita naturalmente.
Il nome del prodotto "${product.productName}" NON deve apparire prima della sezione SOLUZIONE. Prima devi parlare solo del PROBLEMA.

=== DATI PRODOTTO (da usare SOLO nella sezione Soluzione) ===
NOME: ${product.productName}
BENEFICI: ${product.mainBenefits.join(", ")}
INGREDIENTI: ${product.ingredients.join(", ")}
TARGET: ${product.targetAudience}
PREZZO: ${product.price}

=== STRUTTURA PAS OBBLIGATORIA ===

--- PARTE 1: PROBLEMA (25% dell'articolo) ---
<p>[Hook emotivo. L'utente deve pensare "parla proprio di me". Usa la keyword nelle prime 2 frasi. Descrivi il PROBLEMA che il target vive quotidianamente. Usa "tu" diretto. Empatia totale.]</p>

<h2>[Titolo H2 che descrive il problema con keyword — es: "Perché le Rughe Profonde Sembrano Impossibili da Eliminare"]</h2>
<h3>[Sotto-problema 1]</h3>
<p>[Descrivi il problema con dettagli specifici e relatabili. Statistiche, fatti.]</p>
<h3>[Sotto-problema 2]</h3>
<p>[Un altro aspetto del problema che il target riconosce.]</p>
<h3>[Sotto-problema 3]</h3>
<p>[Impatto emotivo/sociale del problema.]</p>

<figure style="margin:24px 0;text-align:center"><img src="${img1}" alt="${meta.keyword}" style="width:100%;border-radius:12px;max-height:400px;object-fit:cover"/><figcaption style="color:#666;font-size:14px;margin-top:8px">Il problema che affligge milioni di persone</figcaption></figure>

--- PARTE 2: AGITAZIONE (20% dell'articolo) ---
<h2>[Titolo H2 che amplifica il problema — es: "Cosa Succede Se Non Intervieni Adesso"]</h2>
<p>[Aggrava il problema. Spiega perché peggiorerà. Cosa succede se non si agisce. Frustrazioni dei rimedi che non funzionano. Creme costose inutili, trattamenti invasivi, promesse non mantenute.]</p>
<h3>[Perché i rimedi tradizionali falliscono]</h3>
<p>[Spiega perché le soluzioni comuni non funzionano davvero. Sii specifico.]</p>
<h3>[Il costo dell'inazione]</h3>
<p>[Conseguenze emotive, estetiche, di autostima. Crea urgenza.]</p>

--- PARTE 3: SOLUZIONE (35% dell'articolo) ---
<h2>[Titolo H2 che introduce la soluzione — es: "La Scoperta Scientifica che Sta Cambiando Tutto"]</h2>
<p>[Qui introduci ${product.productName} come LA soluzione. Spiega PERCHÉ funziona diversamente dagli altri. Base scientifica. Ingredienti innovativi.]</p>

<h3>[Come funziona — meccanismo d'azione]</h3>
<p>[Spiega il meccanismo: ${product.ingredients.join(", ")}. Perché questi ingredienti sono diversi.]</p>

<h3>[I risultati concreti]</h3>
<p>[Benefici specifici con tempi: "già dalla prima settimana...", "dopo 30 giorni..."]</p>

<h3>[Come si usa]</h3>
<p>[Istruzioni pratiche di utilizzo.]</p>

${formEmbedHtml}

--- PARTE 4: PROVA SOCIALE — RECENSIONI (15% dell'articolo) ---
<h2>Testimonianze di Chi Ha Già Provato</h2>
<p>Migliaia di persone hanno già trovato la soluzione. Ecco le loro esperienze:</p>
${reviewsHtml}

<figure style="margin:24px 0;text-align:center"><img src="${img2}" alt="${meta.keyword} risultati" style="width:100%;border-radius:12px;max-height:400px;object-fit:cover"/><figcaption style="color:#666;font-size:14px;margin-top:8px">Risultati reali</figcaption></figure>

${formEmbedHtml}

--- PARTE 5: FAQ (5% dell'articolo) ---
<div class="faq-schema">
<h2>Domande Frequenti</h2>
[5 domande basate sull'INTENTO DI RICERCA, non sul prodotto. Es: "È possibile eliminare le rughe senza chirurgia?", "Quanto tempo serve per vedere risultati?", "Ci sono effetti collaterali?", "Funziona anche per pelli sensibili?", "Come ordinare e quanto costa?"]
Ogni domanda come <h3> con risposta <p>
</div>

${formEmbedHtml}

=== REGOLE DI SCRITTURA ===
- Tono: giornalistico ma empatico, come un'amica esperta che ti consiglia
- NON menzionare "${product.productName}" prima della sezione SOLUZIONE
- KEYWORD DENSITY CRITICA: "${meta.keyword}" deve apparire ALMENO ${Math.max(Math.round(wc / 50), 20)} volte nel testo totale
- Inserisci la keyword in: primo paragrafo (2x), ogni H2 (almeno 3), inizio di 8+ paragrafi, FAQ (3x), conclusione (2x)
- Paragrafi brevi (2-3 frasi max)
- Usa domande retoriche per mantenere attenzione
- Transizioni emotive tra le sezioni
- ESATTAMENTE ${wc} parole
- SOLO HTML. Inizia con <p>.`, Math.max(wc * 3, 6000));

      let body = bodyResult.trim();
      if (body.startsWith("```")) body = body.replace(/^```html?\s*/i, "").replace(/```\s*$/i, "").trim();

      setArt({ ...meta, body, featuredImage: heroImg, img1, img2, reviews });
      setStep("editing"); setStatus("");
    } catch (err) { setError(err.message); setStep("input"); }
  };

  // ---- REGEN ----
  const regen = async (key, instr, manual) => {
    if (manual !== undefined && manual !== null) { setArt(p => ({ ...p, [key]: manual })); return; }
    setRKey(key);
    try {
      if (key === "body") {
        // Calculate how many times the keyword should appear
        const targetOccurrences = Math.max(Math.round(wc / 50), 20);
        const r = await callAI(oaiKey, "Copywriter SEO italiano esperto in keyword density. SOLO HTML puro. Niente backtick.",
          `RISCRIVI questo articolo HTML applicando queste modifiche:

${instr || "Migliora la densità della keyword e la qualità SEO."}

=== REGOLA CRITICA KEYWORD DENSITY ===
La keyword esatta "${art.keyword}" DEVE apparire ALMENO ${targetOccurrences} VOLTE nel testo riscritto.
Attualmente la densità è troppo bassa. Devi inserire "${art.keyword}" in:
- Il primo paragrafo (2 volte)
- Ogni titolo H2 (almeno in 3 su 5)
- All'inizio di almeno 8 paragrafi diversi
- Nelle risposte FAQ (almeno 3 volte)
- Nella conclusione (2 volte)
- Distribuita naturalmente nel resto del testo

CONTA LE OCCORRENZE: devono essere ALMENO ${targetOccurrences}.

=== ALTRE REGOLE ===
- Mantieni TUTTE le immagini (<figure>, <img>) ESATTAMENTE come sono
- Mantieni TUTTI i form ordine (<div class="wf-form">, <script>) ESATTAMENTE come sono
- Mantieni TUTTE le recensioni (i div con ★) ESATTAMENTE come sono
- Lunghezza: ${wc} parole
- Struttura PAS: Problema → Agitazione → Soluzione → Recensioni → FAQ
- SOLO HTML. Inizia con <p>.

ARTICOLO DA RISCRIVERE:
${art.body}`,
          Math.max(wc * 4, 8000));
        let b = r.trim(); if (b.startsWith("```")) b = b.replace(/^```html?\s*/i, "").replace(/```\s*$/i, "").trim();
        setArt(p => ({ ...p, body: b }));
      } else if (key === "reviews") {
        const r = await callAI(oaiKey, "Copywriter. SOLO JSON array.",
          `4 nuove recensioni per "${prod?.productName}". Target: ${prod?.targetAudience}. Nomi italiani puntati, età, città, stelle 4-5, 40-60 parole. ${instr || ""}\nJSON: [{"name":"","age":0,"city":"","stars":0,"text":""}]`, 800);
        const rev = extractJSON(r);
        if (rev && Array.isArray(rev)) setArt(p => ({ ...p, reviews: rev }));
      } else {
        const r = await callAI(oaiKey, "SEO copywriter italiano. Rispondi SOLO con il nuovo testo. Niente virgolette intorno.",
          `Rigenera ${key} per un articolo su "${prod?.productName}".
KEYWORD LONG TAIL: "${art.keyword}"
${instr || "Ottimizza per SEO."}
Valore attuale: ${art[key]}
${key === "title" ? `DEVE contenere la keyword esatta "${art.keyword}". Max 70 caratteri.` : ""}
${key === "metaTitle" ? `DEVE essere 50-60 caratteri e contenere "${art.keyword}" per intero.` : ""}
${key === "metaDescription" ? `DEVE essere 130-155 caratteri. DEVE contenere "${art.keyword}". Aggiungi una call to action tipo "Scopri il metodo naturale" o "Leggi la guida completa".` : ""}
${key === "slug" ? `Slug SEO-friendly basato sulla keyword "${art.keyword}". Solo lettere minuscole e trattini.` : ""}
Rispondi SOLO con il nuovo testo, nient'altro.`, 300);
        setArt(p => ({ ...p, [key]: r.trim().replace(/^["']|["']$/g, "") }));
      }
    } catch (e) { setError(e.message); }
    setRKey(null);
  };

  // ---- REGEN IMAGE ----
  const regenImage = async (which) => {
    setRImg(which);
    if (imgMode === "dalle" && aiOk) {
      const prompts = {
        hero: `Editorial beauty hero: anti-aging serum, elegant, soft pastel light, luxury, no text`,
        img1: `Natural ingredients flat lay: ${prod?.ingredients?.join(",")||"botanicals"}, minimal, editorial`,
        img2: `Woman 45yo glowing skin, facial serum, natural beauty, editorial warm light`,
      };
      const url = await callDallE(oaiKey, prompts[which]);
      if (url) {
        if (which === "hero") setArt(p => ({ ...p, featuredImage: url }));
        else setArt(p => ({ ...p, [which]: url }));
        setRImg(null);
        return;
      }
    }
    // Fallback to Unsplash
    const cat = which === "hero" ? "hero" : which === "img1" ? "ingredients" : "results";
    const url = getRandomImage(cat);
    if (which === "hero") setArt(p => ({ ...p, featuredImage: url }));
    else setArt(p => ({ ...p, [which]: url }));
    setRImg(null);
  };

  // ---- PUBLISH ----
  const publish = async () => {
    setStep("publishing"); setError("");
    try {
      const auth = btoa(`${wpUser}:${wpPass}`);
      const headers = { Authorization: `Basic ${auth}` };
      let featId = 0;

      // Upload featured image
      if (art.featuredImage) {
        setStatus("📤 Carico immagine in evidenza su WordPress...");
        try {
          // Fetch image via our proxy to avoid CORS
          const imgRes = await fetch("/api/proxy-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: art.featuredImage }),
          });

          if (imgRes.ok) {
            const imgBlob = await imgRes.blob();
            const fileName = `${art.slug || "hero"}-${Date.now()}.jpg`;
            const fd = new FormData();
            fd.append("file", imgBlob, fileName);
            fd.append("alt_text", art.keyword || art.title);
            fd.append("caption", art.title);

            const uploadRes = await fetch(`${wpUrl}/wp-json/wp/v2/media`, {
              method: "POST",
              headers: { Authorization: `Basic ${auth}` },
              body: fd,
            });

            if (uploadRes.ok) {
              const mediaData = await uploadRes.json();
              featId = mediaData.id;
            }
          }
        } catch (imgErr) {
          console.warn("Errore upload immagine:", imgErr);
        }
      }

      setStatus("📤 Pubblico articolo su WordPress...");
      const post = {
        title: art.title,
        content: art.body,
        status: "draft",
        slug: art.slug,
        excerpt: art.excerpt,
        meta: {
          _yoast_wpseo_title: art.metaTitle,
          _yoast_wpseo_metadesc: art.metaDescription,
          _yoast_wpseo_focuskw: art.keyword,
        },
      };
      if (featId) post.featured_media = featId;

      const r = await fetch(`${wpUrl}/wp-json/wp/v2/posts`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(post),
      });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(`WP ${r.status}: ${e.message || "Errore"}`); }
      const res = await r.json();
      setArt(p => ({ ...p, wpId: res.id, wpLink: res.link, wpEdit: `${wpUrl}/wp-admin/post.php?post=${res.id}&action=edit` }));
      setStep("done"); setStatus("");
    } catch (e) { setError(e.message); setStep("editing"); }
  };

  // ===================== RENDER =====================
  const I = { width: "100%", background: "#0f0f23", border: "1px solid #3a3a5a", borderRadius: 8, padding: "10px 12px", color: "#e2e8f0", fontSize: 14, boxSizing: "border-box" };

  return (
    <>
      <Head><title>AI Affiliate Publisher</title></Head>
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0f0f23,#1a1a3e,#0f0f23)", color: "#e2e8f0", fontFamily: "'Inter',-apple-system,sans-serif" }}>
        <div style={{ background: "rgba(15,15,35,.92)", borderBottom: "1px solid #2a2a4a", padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 24 }}>🚀</span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>AI Affiliate Publisher <span style={{ fontSize: 10, color: "#818cf8" }}>v7</span></div>
              <div style={{ fontSize: 10, color: "#64748b" }}>Long Tail SEO + PAS Framework + Form Embed → WordPress + Yoast</div>
            </div>
          </div>
          <button onClick={() => setShowCfg(!showCfg)} style={{ background: showCfg ? "#6366f1" : "#2a2a4a", border: "none", color: "#fff", padding: "6px 12px", borderRadius: 7, cursor: "pointer", fontSize: 12 }}>⚙️</button>
        </div>

        <div style={{ maxWidth: 980, margin: "0 auto", padding: 18 }}>
          {showCfg && (
            <div style={{ background: "#1a1a2e", borderRadius: 12, padding: 16, border: "1px solid #2a2a4a", marginBottom: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><label style={{ color: "#94a3b8", fontSize: 11 }}>URL WordPress</label><input value={wpUrl} onChange={e => setWpUrl(e.target.value)} style={I} /></div>
                <div><label style={{ color: "#94a3b8", fontSize: 11 }}>Utente WP</label><input value={wpUser} onChange={e => setWpUser(e.target.value)} style={I} /></div>
                <div><label style={{ color: "#94a3b8", fontSize: 11 }}>🔑 Password App WP</label><input type="password" value={wpPass} onChange={e => setWpPass(e.target.value)} style={I} /></div>
                <div><label style={{ color: "#94a3b8", fontSize: 11 }}>🔑 API Key OpenAI</label><input type="password" value={oaiKey} onChange={e => setOaiKey(e.target.value)} placeholder="sk-..." style={I} /></div>
              </div>
              <div style={{ marginTop: 10, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                {wpOk && <span style={{ padding: "4px 10px", background: "rgba(34,197,94,.1)", borderRadius: 5, color: "#22c55e", fontSize: 11 }}>✅ WP</span>}
                {aiOk && <span style={{ padding: "4px 10px", background: "rgba(99,102,241,.1)", borderRadius: 5, color: "#818cf8", fontSize: 11 }}>✅ OpenAI</span>}
                <span style={{ color: "#64748b", fontSize: 11 }}>|</span>
                <span style={{ color: "#94a3b8", fontSize: 11 }}>Immagini:</span>
                <button onClick={() => setImgMode("unsplash")} style={{ background: imgMode === "unsplash" ? "#6366f1" : "#2a2a4a", border: "none", color: "#fff", padding: "4px 10px", borderRadius: 5, cursor: "pointer", fontSize: 10 }}>📷 Unsplash (gratis)</button>
                <button onClick={() => setImgMode("dalle")} style={{ background: imgMode === "dalle" ? "#6366f1" : "#2a2a4a", border: "none", color: "#fff", padding: "4px 10px", borderRadius: 5, cursor: "pointer", fontSize: 10 }}>🎨 DALL-E 3 (~$0.12)</button>
              </div>
            </div>
          )}

          {error && (
            <div style={{ padding: "8px 12px", background: "rgba(239,68,68,.1)", borderRadius: 7, color: "#ef4444", fontSize: 12, marginBottom: 14, display: "flex", justifyContent: "space-between" }}>
              <span>⚠️ {error}</span><button onClick={() => setError("")} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}>✕</button>
            </div>
          )}

          {step === "input" && (
            <div style={{ background: "#1a1a2e", borderRadius: 14, padding: 24, border: "1px solid #2a2a4a" }}>
              <h2 style={{ color: "#fff", margin: "0 0 4px", fontSize: 20 }}>📝 Nuovo Articolo</h2>
              <p style={{ color: "#94a3b8", margin: "0 0 16px", fontSize: 13 }}>Articolo SEO + recensioni + immagini + meta Yoast, tutto automatico.</p>
              <div style={{ marginBottom: 12 }}>
                <label style={{ color: "#e2e8f0", fontSize: 13, marginBottom: 4, display: "block" }}>🔗 Link Prodotto</label>
                <input value={pLink} onChange={e => setPLink(e.target.value)} placeholder="https://offerte2019.store/..." style={{ ...I, padding: "12px 14px", borderRadius: 10 }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ color: "#e2e8f0", fontSize: 13, marginBottom: 4, display: "block" }}>📋 Codice Embed Form Ordine</label>
                <textarea value={embedCode} onChange={e => setEmbedCode(e.target.value)} placeholder={'<div class="wf-form"></div><script>...</script>'} rows={4} style={{ ...I, padding: "12px 14px", borderRadius: 10, fontFamily: "monospace", fontSize: 11, resize: "vertical" }} />
                <span style={{ color: "#64748b", fontSize: 10, marginTop: 2, display: "block" }}>Incolla il codice embed del form ordine affiliato</span>
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={{ color: "#e2e8f0", fontSize: 13, marginBottom: 6, display: "block" }}>📏 Lunghezza</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
                  {WORD_OPTIONS.map(o => (
                    <button key={o.value} onClick={() => setWc(o.value)} style={{ background: wc === o.value ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "#0f0f23", border: wc === o.value ? "2px solid #818cf8" : "2px solid #3a3a5a", borderRadius: 10, padding: "12px 6px", cursor: "pointer" }}>
                      <div style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>{o.label}</div>
                      <div style={{ color: wc === o.value ? "#c7d2fe" : "#64748b", fontSize: 10, marginTop: 2 }}>{o.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={generate} disabled={!pLink || !embedCode || !wpOk || !aiOk} style={{ width: "100%", background: (!pLink || !embedCode || !wpOk || !aiOk) ? "#3a3a5a" : "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", color: "#fff", padding: 14, borderRadius: 11, fontSize: 15, fontWeight: 700, cursor: (!pLink || !embedCode || !wpOk || !aiOk) ? "not-allowed" : "pointer" }}>
                🚀 Genera Articolo + Recensioni + Immagini
              </button>
              {!aiOk && <p style={{ color: "#f59e0b", fontSize: 11, textAlign: "center", marginTop: 8 }}>⚠️ Inserisci la API Key OpenAI nelle impostazioni per iniziare</p>}
            </div>
          )}

          {step === "analyzing" && (
            <div style={{ background: "#1a1a2e", borderRadius: 14, padding: 40, border: "1px solid #2a2a4a", textAlign: "center" }}>
              <div style={{ width: 48, height: 48, border: "4px solid #6366f1", borderTopColor: "transparent", borderRadius: "50%", animation: "s 1s linear infinite", margin: "0 auto 16px" }} />
              <style>{`@keyframes s{to{transform:rotate(360deg)}}`}</style>
              <div style={{ fontSize: 16, color: "#fff", fontWeight: 600, marginBottom: 4 }}>{status}</div>
              <p style={{ color: "#94a3b8", fontSize: 12 }}>~45-90 secondi</p>
            </div>
          )}

          {step === "editing" && art && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 6 }}>
                <h2 style={{ color: "#fff", margin: 0, fontSize: 18 }}>✅ {prod?.productName} — Rivedi e Pubblica</h2>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => { setStep("input"); setArt(null); }} style={{ background: "#2a2a4a", border: "none", color: "#94a3b8", padding: "7px 12px", borderRadius: 7, cursor: "pointer", fontSize: 12 }}>← Nuovo</button>
                  <button onClick={publish} style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)", border: "none", color: "#fff", padding: "7px 16px", borderRadius: 7, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>📤 Pubblica</button>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 12, alignItems: "start" }}>
                <div>
                  <Editable label="🎯 Keyword" content={art.keyword} sKey="keyword" onRegen={regen} busy={rKey === "keyword"} />
                  <Editable label="📌 Titolo H1" content={art.title} sKey="title" onRegen={regen} busy={rKey === "title"} />
                  <Editable label="🔍 Meta Title" content={art.metaTitle} sKey="metaTitle" onRegen={regen} busy={rKey === "metaTitle"} />
                  <Editable label="📝 Meta Desc" content={art.metaDescription} sKey="metaDescription" onRegen={regen} busy={rKey === "metaDescription"} />
                  <Editable label="🔗 Slug" content={art.slug} sKey="slug" onRegen={regen} busy={rKey === "slug"} />

                  <ImageCard url={art.featuredImage} label="🖼️ Immagine in Evidenza" onRegenerate={() => regenImage("hero")} busy={rImg === "hero"} />
                  <ImageCard url={art.img1} label="🖼️ Immagine Ingredienti" onRegenerate={() => regenImage("img1")} busy={rImg === "img1"} />
                  <ImageCard url={art.img2} label="🖼️ Immagine Risultati" onRegenerate={() => regenImage("img2")} busy={rImg === "img2"} />

                  <div style={{ background: "#1a1a2e", borderRadius: 10, padding: 14, border: "1px solid #2a2a4a", marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <span style={{ color: "#818cf8", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>⭐ Recensioni ({art.reviews?.length || 0})</span>
                      <button onClick={() => regen("reviews")} disabled={rKey === "reviews"} style={{ background: rKey === "reviews" ? "#4a4a6a" : "#6366f1", border: "none", color: "#fff", padding: "4px 8px", borderRadius: 5, cursor: rKey === "reviews" ? "wait" : "pointer", fontSize: 10 }}>
                        {rKey === "reviews" ? "⏳" : "🔄 Rigenera"}
                      </button>
                    </div>
                    {art.reviews?.map((r, i) => (
                      <div key={i} style={{ background: "#0f0f23", borderRadius: 8, padding: 12, marginBottom: 6, borderLeft: "3px solid #6366f1" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <strong style={{ color: "#e2e8f0", fontSize: 13 }}>{r.name}</strong>
                          <span style={{ color: "#f59e0b", fontSize: 13 }}>{"★".repeat(r.stars||5)}{"☆".repeat(5 - (r.stars||5))}</span>
                        </div>
                        <p style={{ color: "#94a3b8", margin: "0 0 4px", fontSize: 12, lineHeight: 1.5 }}>"{r.text}"</p>
                        <span style={{ color: "#64748b", fontSize: 11 }}>{r.age} anni, {r.city}</span>
                      </div>
                    ))}
                  </div>

                  <Editable label="📄 Corpo Articolo" content={art.body} sKey="body" onRegen={regen} busy={rKey === "body"} html />
                </div>
                <div style={{ position: "sticky", top: 16 }}>
                  <SeoScore article={art} targetWords={wc} />
                  {prod && (
                    <div style={{ background: "#1a1a2e", borderRadius: 12, padding: 14, border: "1px solid #2a2a4a", marginTop: 10 }}>
                      <h4 style={{ color: "#818cf8", margin: "0 0 8px", fontSize: 12 }}>📦 {prod.productName}</h4>
                      <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.6 }}>{prod.category} • {prod.price}<br/>{prod.niche}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === "publishing" && (
            <div style={{ background: "#1a1a2e", borderRadius: 14, padding: 40, border: "1px solid #2a2a4a", textAlign: "center" }}>
              <div style={{ width: 48, height: 48, border: "4px solid #22c55e", borderTopColor: "transparent", borderRadius: "50%", animation: "s 1s linear infinite", margin: "0 auto 16px" }} />
              <div style={{ fontSize: 16, color: "#fff", fontWeight: 600 }}>{status}</div>
            </div>
          )}

          {step === "done" && art && (
            <div style={{ background: "#1a1a2e", borderRadius: 14, padding: 30, border: "1px solid #2a2a4a", textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
              <h2 style={{ color: "#22c55e", margin: "0 0 6px" }}>Pubblicato!</h2>
              <p style={{ color: "#94a3b8", marginBottom: 16, fontSize: 13 }}>"{art.title}" salvato come bozza.</p>
              <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
                {art.wpEdit && <a href={art.wpEdit} target="_blank" rel="noopener noreferrer" style={{ background: "#6366f1", color: "#fff", padding: "9px 18px", borderRadius: 8, textDecoration: "none", fontWeight: 600, fontSize: 13 }}>✏️ Modifica su WP</a>}
                <button onClick={() => { setStep("input"); setArt(null); setProd(null); setPLink(""); setEmbedCode(""); }} style={{ background: "#22c55e", border: "none", color: "#fff", padding: "9px 18px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>➕ Nuovo</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
