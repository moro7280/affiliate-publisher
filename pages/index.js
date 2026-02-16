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
  checks.push({ l: "CTA", p: /href=.*offert|SCOPRI|ORDINA/i.test(b), d: /href/i.test(b) ? "✓" : "✗" });
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
  const [fLink, setFLink] = useState("");
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
        `Link prodotto: ${pLink}\nLink form: ${fLink}\nNetwork: offerte2019.network (salute/bellezza Italia)\nSe contiene "eslow"→Eslow Age siero anti-age con esosomi vegetali, acido ialuronico, elastina, collagene. 2x€49.99.\nAnalizza URL e deduci.\n\nJSON:\n{"productName":"","category":"bellezza|salute","targetAudience":"","mainBenefits":["","","","",""],"ingredients":["","","",""],"price":"","niche":"","keyFeatures":["","",""]}`, 700);
      let product = extractJSON(p1);
      if (!product || !product.productName) {
        const u = (pLink + fLink).toLowerCase();
        if (u.includes("eslow")) {
          product = { productName: "Eslow Age", category: "bellezza", targetAudience: "Donne 35-65 anni con rughe e perdita di elasticità", mainBenefits: ["Riduce rughe e segni d'espressione", "Stimola collagene ed elastina", "Idratazione profonda", "Rinnovamento cellulare con esosomi", "Effetto lifting naturale"], ingredients: ["Esosomi vegetali", "Acido Ialuronico", "Elastina", "Collagene"], price: "2x €49.99", niche: "Anti-age esosomi vegetali", keyFeatures: ["Esosomi vegetali ultima generazione", "100% naturale", "8847+ clienti soddisfatti"] };
        } else {
          product = { productName: "Prodotto Benessere", category: "salute", targetAudience: "Adulti", mainBenefits: ["Efficace", "Naturale", "Sicuro", "Risultati visibili"], ingredients: ["Estratti naturali"], price: "Offerta speciale", niche: "Benessere", keyFeatures: ["Made in Italy"] };
        }
      }
      setProd(product);

      // STEP 2: SEO Meta
      setStatus("🏷️ Creo metadati SEO per " + product.productName + "...");
      const p2 = await callAI(oaiKey, "SEO specialist italiano. SOLO JSON. Niente backtick.",
        `Metadati SEO per "${product.productName}" su viverenaturale.blog.\nNicchia: ${product.niche}. Target: ${product.targetAudience}.\nREGOLA: keyword DEVE contenere "${product.productName.toLowerCase()}". Il titolo DEVE contenere la keyword ESATTA.\nJSON: {"keyword":"","title":"max 70 car CON keyword","metaTitle":"50-60 car con keyword","metaDescription":"130-155 car","slug":"","excerpt":"2 frasi","tags":["","","","",""]}`, 500);
      let meta = extractJSON(p2);
      if (!meta || !meta.keyword) {
        meta = { keyword: product.productName.toLowerCase() + " siero anti-age", title: `${product.productName} Siero Anti-Age: Recensione e Opinioni (2026)`, metaTitle: `${product.productName} Siero Anti-Age: Funziona? Opinioni`, metaDescription: `Scopri ${product.productName}: benefici, ingredienti, opinioni verificate. Guida completa + offerta 2x1 esclusiva.`, slug: product.productName.toLowerCase().replace(/\s+/g, "-") + "-recensione", excerpt: `Recensione di ${product.productName}: funziona? Ingredienti e opinioni.`, tags: [product.productName.toLowerCase(), "anti-age", "siero", "recensione", "2026"] };
      }
      if (!meta.title.toLowerCase().includes(meta.keyword.toLowerCase())) {
        meta.title = `${meta.keyword.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}: Recensione e Opinioni (2026)`;
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

      // STEP 5: Body
      setStatus(`✍️ Scrivo articolo su ${product.productName} (${wc} parole)...`);
      const reviewsHtml = reviews.map(r => `<div style="background:#f8f9fa;border-radius:12px;padding:20px;margin:12px 0;border-left:4px solid #6366f1"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><strong style="color:#1a1a2e">${r.name}</strong><span style="color:#f59e0b;font-size:16px">${"★".repeat(r.stars)}${"☆".repeat(5 - (r.stars||5))}</span></div><p style="color:#374151;margin:0 0 6px;font-size:15px;line-height:1.6">"${r.text}"</p><span style="color:#6b7280;font-size:13px">${r.age} anni, ${r.city}</span></div>`).join("\n");

      const ctaHtml = `<div style="background:linear-gradient(135deg,#667eea,#764ba2);border-radius:16px;padding:30px;text-align:center;margin:30px 0"><h3 style="color:#fff;margin:0 0 10px;font-size:22px">🎁 Offerta ${product.productName}</h3><p style="color:rgba(255,255,255,.9);margin:0 0 15px">${product.price} — Spedizione Gratuita</p><a href="${pLink}" target="_blank" rel="noopener" style="display:inline-block;background:#fff;color:#6366f1;padding:14px 40px;border-radius:50px;font-weight:700;text-decoration:none;font-size:18px">SCOPRI L'OFFERTA →</a></div>`;

      const bodyResult = await callAI(oaiKey,
        `Copywriter SEO italiano per "Vivere Naturale". SOLO HTML. Niente JSON, niente backtick, inizia con <p>.`,
        `ARTICOLO HTML di ${wc} parole su "${product.productName}".

KEYWORD: "${meta.keyword}" — DEVE apparire almeno ${Math.max(Math.round(wc / 80), 10)} volte nel testo.

BENEFICI: ${product.mainBenefits.join(", ")}
INGREDIENTI: ${product.ingredients.join(", ")}
TARGET: ${product.targetAudience}
PREZZO: ${product.price}
LINK: ${pLink}

INSERISCI QUESTE IMMAGINI (HTML ESATTO):
Dopo ingredienti: <figure style="margin:24px 0;text-align:center"><img src="${img1}" alt="${meta.keyword} ingredienti" style="width:100%;border-radius:12px;max-height:400px;object-fit:cover"/><figcaption style="color:#666;font-size:14px;margin-top:8px">Ingredienti naturali di ${product.productName}</figcaption></figure>

Dopo recensioni: <figure style="margin:24px 0;text-align:center"><img src="${img2}" alt="${meta.keyword} risultati" style="width:100%;border-radius:12px;max-height:400px;object-fit:cover"/><figcaption style="color:#666;font-size:14px;margin-top:8px">Risultati con ${product.productName}</figcaption></figure>

CTA BOX (inserisci 3 volte): ${ctaHtml}

SEZIONE RECENSIONI (dopo "Opinioni"):
<h2>Recensioni Verificate su ${product.productName}</h2>
<p>${product.productName} ha migliaia di feedback positivi:</p>
${reviewsHtml}

STRUTTURA:
1. <p> Intro con keyword nelle prime 2 frasi
2. <h2> Cos'è ${product.productName}</h2> con <h3>
3. <h2> Benefici</h2> con <h3> per ogni beneficio
4. <h2> Ingredienti</h2> con <h3> [IMMAGINE 1] [CTA 1]
5. <h2> Come Usare</h2>
6. <h2> Recensioni</h2> [RECENSIONI] [IMMAGINE 2] [CTA 2]
7. <h2> Controindicazioni</h2>
8. <div class="faq-schema"><h2>FAQ</h2> con 5 domande</div>
9. <h2> Conclusione</h2> [CTA 3]

${wc} parole. SOLO HTML.`, Math.max(wc * 3, 5000));

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
        const r = await callAI(oaiKey, "Copywriter SEO italiano. SOLO HTML.",
          `RISCRIVI articolo su ${prod?.productName}. Keyword: "${art.keyword}" (densità 1.5-2.5%). ${instr || "Migliora SEO."} Mantieni immagini, CTA, recensioni. ${wc} parole. Link: ${pLink}\n\n${art.body}`,
          Math.max(wc * 3, 5000));
        let b = r.trim(); if (b.startsWith("```")) b = b.replace(/^```html?\s*/i, "").replace(/```\s*$/i, "").trim();
        setArt(p => ({ ...p, body: b }));
      } else if (key === "reviews") {
        const r = await callAI(oaiKey, "Copywriter. SOLO JSON array.",
          `4 nuove recensioni per "${prod?.productName}". Target: ${prod?.targetAudience}. Nomi italiani puntati, età, città, stelle 4-5, 40-60 parole. ${instr || ""}\nJSON: [{"name":"","age":0,"city":"","stars":0,"text":""}]`, 800);
        const rev = extractJSON(r);
        if (rev && Array.isArray(rev)) setArt(p => ({ ...p, reviews: rev }));
      } else {
        const r = await callAI(oaiKey, "SEO copywriter. SOLO il nuovo testo.",
          `Rigenera ${key} per "${prod?.productName}". KW: "${art.keyword}". ${instr || "Ottimizza."}
Attuale: ${art[key]}
${key === "title" ? "DEVE contenere la keyword esatta. Max 70 car." : ""}
${key === "metaTitle" ? "50-60 car con keyword esatta." : ""}
${key === "metaDescription" ? "130-155 car con keyword e CTA." : ""}`, 300);
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
      let featId = 0;
      if (art.featuredImage) {
        setStatus("📤 Carico immagine evidenza...");
        try {
          const blob = await (await fetch(art.featuredImage)).blob();
          const fd = new FormData(); fd.append("file", blob, `${art.slug}-hero.png`); fd.append("alt_text", art.keyword);
          const r = await fetch(`${wpUrl}/wp-json/wp/v2/media`, { method: "POST", headers: { Authorization: `Basic ${auth}` }, body: fd });
          if (r.ok) featId = (await r.json()).id;
        } catch {}
      }
      setStatus("📤 Pubblico articolo...");
      const post = { title: art.title, content: art.body, status: "draft", slug: art.slug, excerpt: art.excerpt,
        meta: { _yoast_wpseo_title: art.metaTitle, _yoast_wpseo_metadesc: art.metaDescription, _yoast_wpseo_focuskw: art.keyword } };
      if (featId) post.featured_media = featId;
      const r = await fetch(`${wpUrl}/wp-json/wp/v2/posts`, { method: "POST", headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" }, body: JSON.stringify(post) });
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
              <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>AI Affiliate Publisher <span style={{ fontSize: 10, color: "#818cf8" }}>v6.1</span></div>
              <div style={{ fontSize: 10, color: "#64748b" }}>GPT-4o Mini + DALL-E 3 + Recensioni → WordPress + Yoast</div>
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
                <label style={{ color: "#e2e8f0", fontSize: 13, marginBottom: 4, display: "block" }}>🛒 Link Form</label>
                <input value={fLink} onChange={e => setFLink(e.target.value)} placeholder="https://link.offerte2019.site/..." style={{ ...I, padding: "12px 14px", borderRadius: 10 }} />
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
              <button onClick={generate} disabled={!pLink || !fLink || !wpOk || !aiOk} style={{ width: "100%", background: (!pLink || !fLink || !wpOk || !aiOk) ? "#3a3a5a" : "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", color: "#fff", padding: 14, borderRadius: 11, fontSize: 15, fontWeight: 700, cursor: (!pLink || !fLink || !wpOk || !aiOk) ? "not-allowed" : "pointer" }}>
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
                <button onClick={() => { setStep("input"); setArt(null); setProd(null); setPLink(""); setFLink(""); }} style={{ background: "#22c55e", border: "none", color: "#fff", padding: "9px 18px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>➕ Nuovo</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
