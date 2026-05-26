# 🦷 Gestionale Clinica Dentistica — Guida Deploy

## Struttura progetto
```
gestionale/
├── backend/          → API Node.js + Express
├── frontend/         → React app (clinica_v2.jsx)
├── database/         → Schema SQL
├── setup-server.sh   → Script configurazione Hetzner
├── ecosystem.config.js → PM2 config
└── nginx.conf        → Config Nginx riferimento
```

---

## FASE 1 — GitHub (5 minuti)

1. Vai su **github.com** → crea account se non ce l'hai
2. Crea repository privato: `gestionale-clinica`
3. Carica questa cartella intera sul repository

```bash
git init
git add .
git commit -m "primo commit gestionale"
git branch -M main
git remote add origin https://github.com/tuousername/gestionale-clinica.git
git push -u origin main
```

---

## FASE 2 — Vercel per il prototipo (5 minuti, gratuito)

1. Vai su **vercel.com** → crea account con GitHub
2. "Import Project" → seleziona `gestionale-clinica`
3. Framework: **Vite** (o React)
4. Deploy → ottieni link pubblico
5. Condividi il link con tua sorella per feedback

> Il prototipo usa dati mock. Il backend reale parte dalla Fase 3.

---

## FASE 3 — Server Hetzner (20 minuti, ~4€/mese)

### 3.1 Crea il server
1. Vai su **hetzner.com/cloud** → crea account
2. Crea server: **CX22** / Ubuntu 24.04 / Falkenstein DE
3. Aggiungi la tua chiave SSH (opzionale ma consigliato)
4. Annota l'IP del server

### 3.2 Acquista il dominio
1. Vai su **registro.it** o **namecheap.com**
2. Acquista `tuaclinica.it` (~12€/anno)
3. Crea record DNS: `A @ → IP_DEL_SERVER`
4. Attendi 15-30 minuti per la propagazione DNS

### 3.3 Esegui lo script di setup
Connettiti al server via terminale:
```bash
ssh root@IP_DEL_SERVER
```
Poi esegui:
```bash
curl -o setup.sh https://raw.githubusercontent.com/tuousername/gestionale-clinica/main/setup-server.sh
bash setup.sh tuaclinica.it tua@email.it
```
Lo script installa tutto automaticamente (5-10 minuti).

---

## FASE 4 — Deploy dell'app (10 minuti)

### 4.1 Copia il codice sul server
```bash
ssh root@IP_DEL_SERVER
cd /home/clinica
git clone https://github.com/tuousername/gestionale-clinica.git gestionale
chown -R clinica:clinica gestionale
```

### 4.2 Installa dipendenze backend
```bash
cd /home/clinica/gestionale/backend
npm install
```

### 4.3 Inizializza il database
```bash
psql -U clinica_user -d gestionale -f /home/clinica/gestionale/database/schema.sql
```

### 4.4 Build frontend React
```bash
cd /home/clinica/gestionale/frontend
npm install
npm run build
```

### 4.5 Avvia con PM2
```bash
cd /home/clinica/gestionale
pm2 start ecosystem.config.js
pm2 save
```

### 4.6 Verifica
Vai su `https://tuaclinica.it` → dovresti vedere il gestionale!

---

## CONFIGURAZIONI POST-DEPLOY

### Imposta la password admin
```bash
cd /home/clinica/gestionale/backend
node -e "
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool();
const hash = bcrypt.hashSync('TuaPasswordSicura2026!', 12);
pool.query('UPDATE utenti SET password_hash=\$1 WHERE email=\$2', [hash, 'admin@clinica.it'])
  .then(() => { console.log('Password impostata'); pool.end(); });
"
```

### Crea utenti per il team
Accedi come admin → sezione Utenti → aggiungi medici e assistenti.

### Configura Genya API
Modifica `/home/clinica/gestionale/backend/.env`:
```
GENYA_API_KEY=la_tua_chiave_genya
GENYA_STUDIO_ID=il_tuo_id_studio
```
Poi riavvia: `pm2 restart gestionale-backend`

---

## AGGIORNAMENTI FUTURI

Quando Claude ti dà codice aggiornato:
```bash
# Sul server
cd /home/clinica/gestionale
git pull origin main
cd backend && npm install
cd ../frontend && npm run build
pm2 restart all
```

---

## COMANDI UTILI

```bash
pm2 status                    # stato app
pm2 logs gestionale-backend   # log in tempo reale
pm2 restart gestionale-backend # riavvia backend

# Backup manuale
PGPASSWORD=password pg_dump -U clinica_user gestionale | gzip > /backup/manual_$(date +%Y%m%d).sql.gz

# Controlla nginx
nginx -t && systemctl reload nginx
```

---

## SUPPORTO

Per qualsiasi problema: apri Claude e scrivi:
> "Ho questo errore nel gestionale: [copia l'errore]"

Claude legge il codice e risolve in pochi minuti.
