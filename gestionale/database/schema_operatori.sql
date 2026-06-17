-- ============================================================
-- GESTIONALE CLINICA DENTISTICA
-- Modulo "Gestione Operatori" — schema aggiuntivo
-- Da eseguire SOPRA lo schema esistente (schema.sql v1.0)
-- NON modifica nessuna tabella già presente.
-- ============================================================

-- ── 1. OPERATORI_COMPENSI ────────────────────────────────────
CREATE TABLE operatori_compensi (
  utente_id          INTEGER PRIMARY KEY REFERENCES utenti(id) ON DELETE CASCADE,
  tipo_compenso      VARCHAR(20) NOT NULL CHECK (tipo_compenso IN ('fisso','percentuale')),
  importo_mezza_giornata NUMERIC(10,2),
  percentuale        NUMERIC(5,2),
  base_calcolo       VARCHAR(10) CHECK (base_calcolo IN ('lordo','netto')),
  created_at         TIMESTAMP DEFAULT NOW(),
  updated_at         TIMESTAMP DEFAULT NOW(),
  CONSTRAINT compenso_coerente CHECK (
    (tipo_compenso = 'fisso'      AND importo_mezza_giornata IS NOT NULL)
    OR
    (tipo_compenso = 'percentuale' AND percentuale IS NOT NULL AND base_calcolo IS NOT NULL)
  )
);

-- ── 2. PRESENZE ──────────────────────────────────────────────
CREATE TABLE presenze (
  id           SERIAL PRIMARY KEY,
  utente_id    INTEGER NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
  data         DATE NOT NULL DEFAULT CURRENT_DATE,
  fascia       VARCHAR(12) NOT NULL CHECK (fascia IN ('mattina','pomeriggio')),
  registrata_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT presenza_unica UNIQUE (utente_id, data, fascia)
);

-- ── 3. LISTINO_PRESTAZIONI ───────────────────────────────────
CREATE TABLE listino_prestazioni (
  id                     SERIAL PRIMARY KEY,
  codice                 VARCHAR(20) UNIQUE,
  descrizione            VARCHAR(255) NOT NULL,
  prezzo                 NUMERIC(10,2) NOT NULL DEFAULT 0,
  costo_materiali_default NUMERIC(10,2) NOT NULL DEFAULT 0,
  categoria              VARCHAR(50),
  attivo                 BOOLEAN DEFAULT true,
  created_at             TIMESTAMP DEFAULT NOW()
);

-- ── 4. PRESTAZIONI_ESEGUITE ──────────────────────────────────
CREATE TABLE prestazioni_eseguite (
  id              SERIAL PRIMARY KEY,
  medico_id       INTEGER NOT NULL REFERENCES utenti(id),
  prestazione_id  INTEGER REFERENCES listino_prestazioni(id),
  paziente_id     INTEGER REFERENCES pazienti(id) ON DELETE SET NULL,
  incasso         NUMERIC(10,2) NOT NULL DEFAULT 0,
  costo_materiali NUMERIC(10,2) NOT NULL DEFAULT 0,
  data            DATE NOT NULL DEFAULT CURRENT_DATE,
  registrata_da   INTEGER REFERENCES utenti(id),
  note            TEXT,
  created_at      TIMESTAMP DEFAULT NOW()
);

-- ── INDICI ───────────────────────────────────────────────────
CREATE INDEX idx_presenze_utente_data       ON presenze(utente_id, data);
CREATE INDEX idx_presenze_data              ON presenze(data);
CREATE INDEX idx_prestazioni_medico         ON prestazioni_eseguite(medico_id);
CREATE INDEX idx_prestazioni_data           ON prestazioni_eseguite(data);
CREATE INDEX idx_prestazioni_paziente       ON prestazioni_eseguite(paziente_id);
CREATE INDEX idx_listino_attivo             ON listino_prestazioni(attivo);
