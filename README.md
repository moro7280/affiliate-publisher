# 🚀 AI Affiliate Publisher — Deploy su Vercel

## Cosa ti serve
- Account GitHub (gratuito) → github.com
- Account Vercel (gratuito) → vercel.com  
- API Key OpenAI → platform.openai.com
- Sito WordPress con Yoast SEO

---

## GUIDA STEP-BY-STEP

### STEP 1: Crea il Repository su GitHub

1. Vai su **github.com** → accedi
2. Clicca il **+** in alto a destra → **New repository**
3. Nome: `affiliate-publisher`
4. Lascia **Public** (oppure Private se preferisci)
5. **NON** spuntare "Add a README"
6. Clicca **Create repository**
7. Vedrai una pagina con istruzioni — tienila aperta

### STEP 2: Carica i file su GitHub

**Opzione A — Tramite browser (più facile):**
1. Nella pagina del repository appena creato, clicca **"uploading an existing file"**
2. Trascina TUTTI i file e cartelle di questo progetto
3. Clicca **Commit changes**

**Opzione B — Con terminale (se sai usarlo):**
```bash
cd affiliate-publisher
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TUO-USERNAME/affiliate-publisher.git
git push -u origin main
```

### STEP 3: Collega Vercel a GitHub

1. Vai su **vercel.com** → accedi con GitHub
2. Clicca **"Add New..."** → **Project**
3. Vedrai la lista dei tuoi repository GitHub
4. Clicca **Import** accanto a `affiliate-publisher`
5. Nella pagina di configurazione:
   - Framework: **Next.js** (dovrebbe essere auto-rilevato)
   - Root Directory: lascia vuoto
   - NON serve aggiungere variabili d'ambiente
6. Clicca **Deploy**
7. Aspetta 1-2 minuti...
8. 🎉 **FATTO!** Vedrai un URL tipo: `affiliate-publisher-xxx.vercel.app`

### STEP 4: Usa la tua app

1. Apri l'URL che Vercel ti ha dato
2. Nelle Impostazioni inserisci:
   - URL WordPress: `https://viverenaturale.blog`
   - Utente: la tua email WordPress
   - Password App WP: la tua password applicazione
   - API Key OpenAI: la tua chiave (sk-...)
3. Incolla i link del prodotto affiliato
4. Clicca **Genera**!

---

## COSTI

| Servizio | Costo |
|----------|-------|
| Vercel (Hobby) | **GRATUITO** |
| GitHub | **GRATUITO** |
| OpenAI GPT-4o Mini | ~$0.001/articolo |
| OpenAI DALL-E 3 | ~$0.04/immagine |
| **TOTALE per 1 articolo** | **~$0.12** |

---

## STRUTTURA FILE

```
affiliate-publisher/
├── app/
│   ├── api/
│   │   └── ai/
│   │       └── route.js          ← Proxy API per OpenAI (risolve CORS)
│   ├── AffiliatePublisher.jsx    ← App principale
│   ├── layout.js                 ← Layout HTML
│   └── page.js                   ← Entry point
├── public/                       ← File statici
├── .gitignore
├── next.config.js
├── package.json
└── README.md                     ← Questa guida
```

## DOMANDE FREQUENTI

**Posso usare un dominio personalizzato?**
Sì! In Vercel → Settings → Domains → aggiungi il tuo dominio.

**Come aggiorno l'app?**
Modifica i file su GitHub → Vercel fa il deploy automatico.

**È sicuro inserire le credenziali?**
Le credenziali restano nel tuo browser (localStorage). Il proxy API non le salva da nessuna parte. Per maggiore sicurezza, puoi aggiungere le chiavi come Environment Variables su Vercel.
