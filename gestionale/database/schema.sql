-- ============================================================
-- GESTIONALE CLINICA DENTISTICA
-- Schema PostgreSQL completo — v1.0
-- ============================================================

-- Estensioni
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── UTENTI ───────────────────────────────────────────────────
CREATE TABLE utenti (
  id          SERIAL PRIMARY KEY,
  nome        VARCHAR(100) NOT NULL,
  cognome     VARCHAR(100) NOT NULL,
  email       VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  ruolo       VARCHAR(20)  NOT NULL CHECK (ruolo IN ('admin','medico','assistente','igienista')),
  attivo      BOOLEAN DEFAULT true,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);

-- ── PAZIENTI ─────────────────────────────────────────────────
CREATE TABLE pazienti (
  id              SERIAL PRIMARY KEY,
  nome            VARCHAR(100) NOT NULL,
  cognome         VARCHAR(100) NOT NULL,
  cf              VARCHAR(16) UNIQUE,
  data_nascita    DATE,
  telefono        VARCHAR(20),
  email           VARCHAR(255),
  note            TEXT,
  ultima_visita   DATE,
  rischio_carie   INTEGER DEFAULT 1 CHECK (rischio_carie BETWEEN 1 AND 3),
  rischio_parodontale INTEGER DEFAULT 1 CHECK (rischio_parodontale BETWEEN 1 AND 3),
  score           INTEGER DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- ── PIANI DI CURA ────────────────────────────────────────────
CREATE TABLE piani_cura (
  id          SERIAL PRIMARY KEY,
  paziente_id INTEGER NOT NULL REFERENCES pazienti(id) ON DELETE CASCADE,
  descrizione TEXT NOT NULL,
  prezzo      NUMERIC(10,2) NOT NULL DEFAULT 0,
  stato       VARCHAR(20) NOT NULL DEFAULT 'da_fare' CHECK (stato IN ('da_fare','eseguito')),
  data_esecuzione DATE,
  medico_id   INTEGER REFERENCES utenti(id),
  medico_nome VARCHAR(200),
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);

-- ── PACCHETTI ────────────────────────────────────────────────
CREATE TABLE pacchetti (
  id          SERIAL PRIMARY KEY,
  nome        VARCHAR(200) NOT NULL,
  descrizione TEXT,
  prezzo      NUMERIC(10,2) NOT NULL,
  rate        INTEGER,
  prezzo_mensile NUMERIC(10,2),
  colore      VARCHAR(7) DEFAULT '#2B5741',
  attivo      BOOLEAN DEFAULT true,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE pacchetti_prestazioni (
  id          SERIAL PRIMARY KEY,
  pacchetto_id INTEGER NOT NULL REFERENCES pacchetti(id) ON DELETE CASCADE,
  descrizione TEXT NOT NULL,
  ordine      INTEGER DEFAULT 0
);

-- ── PAZIENTI <-> PACCHETTI ───────────────────────────────────
CREATE TABLE pazienti_pacchetti (
  id          SERIAL PRIMARY KEY,
  paziente_id INTEGER NOT NULL REFERENCES pazienti(id) ON DELETE CASCADE,
  pacchetto_id INTEGER NOT NULL REFERENCES pacchetti(id),
  venditore_id INTEGER REFERENCES utenti(id),
  data_vendita DATE NOT NULL DEFAULT CURRENT_DATE,
  importo     NUMERIC(10,2) NOT NULL,
  data_scadenza DATE,
  stato       VARCHAR(20) DEFAULT 'attivo' CHECK (stato IN ('attivo','scaduto','sospeso')),
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ── PREVENTIVI ───────────────────────────────────────────────
CREATE TABLE preventivi (
  id              SERIAL PRIMARY KEY,
  paziente_id     INTEGER NOT NULL REFERENCES pazienti(id) ON DELETE CASCADE,
  data            DATE NOT NULL DEFAULT CURRENT_DATE,
  totale          NUMERIC(10,2) NOT NULL DEFAULT 0,
  stato           VARCHAR(20) NOT NULL DEFAULT 'in_attesa' CHECK (stato IN ('in_attesa','accettato','rifiutato')),
  note            TEXT,
  creato_da       INTEGER REFERENCES utenti(id),
  inviato_genya_at TIMESTAMP,
  genya_doc_id    VARCHAR(100),
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE preventivi_voci (
  id              SERIAL PRIMARY KEY,
  preventivo_id   INTEGER NOT NULL REFERENCES preventivi(id) ON DELETE CASCADE,
  descrizione     TEXT NOT NULL,
  importo         NUMERIC(10,2) NOT NULL DEFAULT 0,
  ordine          INTEGER DEFAULT 0
);

-- ── APPUNTAMENTI ─────────────────────────────────────────────
CREATE TABLE appuntamenti (
  id          SERIAL PRIMARY KEY,
  paziente_id INTEGER NOT NULL REFERENCES pazienti(id) ON DELETE CASCADE,
  medico_id   INTEGER REFERENCES utenti(id),
  riunito     VARCHAR(50) NOT NULL CHECK (riunito IN ('Riunito 1','Riunito 2','Estetica')),
  tipo        VARCHAR(30) NOT NULL CHECK (tipo IN ('igiene','produzione','estetica','acquisizione','urgenza')),
  data        DATE NOT NULL,
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  stato       VARCHAR(20) DEFAULT 'confermato' CHECK (stato IN ('confermato','in_attesa','completato','no_show','cancellato')),
  note        TEXT,
  reminder_inviato BOOLEAN DEFAULT false,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);

-- ── RECALL ───────────────────────────────────────────────────
CREATE TABLE recall (
  id              SERIAL PRIMARY KEY,
  paziente_id     INTEGER NOT NULL REFERENCES pazienti(id) ON DELETE CASCADE,
  tipo            VARCHAR(30) DEFAULT 'controllo',
  data_prevista   DATE,
  data_contatto   DATE,
  esito           VARCHAR(50) CHECK (esito IN ('risposto','non_risposto','appuntamento_fissato','non_interessato')),
  note            TEXT,
  utente_id       INTEGER REFERENCES utenti(id),
  created_at      TIMESTAMP DEFAULT NOW()
);

-- ── CONSENSI DIGITALI ────────────────────────────────────────
CREATE TABLE consensi (
  id              SERIAL PRIMARY KEY,
  paziente_id     INTEGER NOT NULL REFERENCES pazienti(id) ON DELETE CASCADE,
  tipo            VARCHAR(50) NOT NULL CHECK (tipo IN ('trattamento_dati','anestesia','estetica','chirurgia','generico')),
  firma_base64    TEXT,
  firmato_at      TIMESTAMP,
  testo_versione  VARCHAR(10) DEFAULT 'v1',
  created_at      TIMESTAMP DEFAULT NOW()
);

-- ── NOTIFICHE ────────────────────────────────────────────────
CREATE TABLE notifiche (
  id          SERIAL PRIMARY KEY,
  utente_id   INTEGER NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
  tipo        VARCHAR(50) NOT NULL,
  messaggio   TEXT NOT NULL,
  letto       BOOLEAN DEFAULT false,
  link        VARCHAR(255),
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ── REMINDER LOG ─────────────────────────────────────────────
CREATE TABLE reminder_log (
  id              SERIAL PRIMARY KEY,
  paziente_id     INTEGER NOT NULL REFERENCES pazienti(id) ON DELETE CASCADE,
  appuntamento_id INTEGER REFERENCES appuntamenti(id),
  canale          VARCHAR(20) DEFAULT 'whatsapp' CHECK (canale IN ('whatsapp','sms','email')),
  messaggio       TEXT,
  inviato_at      TIMESTAMP DEFAULT NOW(),
  stato           VARCHAR(20) DEFAULT 'inviato' CHECK (stato IN ('inviato','consegnato','letto','errore'))
);

-- ── LOG ATTIVITÀ ─────────────────────────────────────────────
CREATE TABLE log_attivita (
  id          SERIAL PRIMARY KEY,
  utente_id   INTEGER REFERENCES utenti(id),
  azione      VARCHAR(100) NOT NULL,
  tabella     VARCHAR(50),
  record_id   INTEGER,
  dettagli    JSONB,
  ip          INET,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ── INDICI ───────────────────────────────────────────────────
CREATE INDEX idx_pazienti_cf ON pazienti(cf);
CREATE INDEX idx_pazienti_cognome ON pazienti(cognome);
CREATE INDEX idx_pazienti_score ON pazienti(score DESC);
CREATE INDEX idx_pazienti_ultima_visita ON pazienti(ultima_visita);
CREATE INDEX idx_piani_paziente ON piani_cura(paziente_id);
CREATE INDEX idx_preventivi_paziente ON preventivi(paziente_id);
CREATE INDEX idx_preventivi_stato ON preventivi(stato);
CREATE INDEX idx_preventivi_genya ON preventivi(inviato_genya_at) WHERE inviato_genya_at IS NULL;
CREATE INDEX idx_appuntamenti_data ON appuntamenti(data);
CREATE INDEX idx_appuntamenti_medico ON appuntamenti(medico_id);
CREATE INDEX idx_pazienti_pacchetti_paziente ON pazienti_pacchetti(paziente_id);
CREATE INDEX idx_recall_paziente ON recall(paziente_id);
CREATE INDEX idx_notifiche_utente ON notifiche(utente_id, letto);

-- ── DATI INIZIALI ────────────────────────────────────────────
-- Password: Admin2026! (bcrypt hash)
INSERT INTO utenti (nome, cognome, email, password_hash, ruolo) VALUES
  ('Admin','Clinica','admin@clinica.it','$2b$12$placeholder_change_before_deploy','admin');

INSERT INTO pacchetti (nome, descrizione, prezzo, rate, prezzo_mensile, colore) VALUES
  ('Piano Prevenzione Annuale','2 sedute igiene, 2 controlli, coaching domiciliare, recall automatico',300,12,28,'#2D6A4F'),
  ('Smile & Face','Consulenza integrata sorriso/viso, piano trattamento, follow-up',850,NULL,NULL,'#7B2D8B'),
  ('Ingresso Prevenzione','Prima visita, status fotografico, indice di placca, piano scritto',99,NULL,NULL,'#1D4E89');

INSERT INTO pacchetti_prestazioni (pacchetto_id, descrizione, ordine) VALUES
  (1,'Detartrasi semestrale x2',1),(1,'Visita di controllo x2',2),(1,'Coaching igiene domiciliare',3),(1,'Recall automatico annuale',4),(1,'Priorità urgenze soft',5),
  (2,'Consulenza sorriso-viso',1),(2,'Piano trattamento estetico',2),(2,'Primo trattamento incluso',3),(2,'Follow-up 3 mesi',4),(2,'Priorità agenda estetica',5),
  (3,'Prima visita completa',1),(3,'Status fotografico',2),(3,'Indice di placca',3),(3,'RX se clinicamente indicata',4),(3,'Piano scritto + prenotazione',5);
