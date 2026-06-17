require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { WebSocketServer } = require('ws');
const http      = require('http');

const { pool }  = require('./db');
const { setupCronJobs } = require('./cron/jobs');
const { registerWsClient, removeWsClient } = require('./services/notify');

// Routes
const authRoutes          = require('./routes/auth');
const pazientiRoutes      = require('./routes/pazienti');
const pianiRoutes         = require('./routes/piani');
const preventiviRoutes    = require('./routes/preventivi');
const pacchettiRoutes     = require('./routes/pacchetti');
const appuntamentiRoutes  = require('./routes/appuntamenti');
const recallRoutes        = require('./routes/recall');
const operatoriRoutes     = require('./routes/operatori');
const presenzeRoutes      = require('./routes/presenze');
const prestazioniRoutes   = require('./routes/prestazioni');

const app = express();
const server = http.createServer(app);

// ── MIDDLEWARE ─────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());
app.use(cors({
  origin: process.env.DOMAIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300, message: { error: 'Troppe richieste' } });
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { error: 'Troppi tentativi di login' } });
app.use('/api/', limiter);
app.use('/api/auth/login', loginLimiter);

// ── ROUTES ─────────────────────────────────────────────────
app.use('/api/auth',         authRoutes);
app.use('/api/pazienti',     pazientiRoutes);
app.use('/api/piani',        pianiRoutes);
app.use('/api/preventivi',   preventiviRoutes);
app.use('/api/pacchetti',    pacchettiRoutes);
app.use('/api/appuntamenti', appuntamentiRoutes);
app.use('/api/recall',       recallRoutes);
app.use('/api/operatori',    operatoriRoutes);
app.use('/api/presenze',     presenzeRoutes);
app.use('/api/prestazioni',  prestazioniRoutes);

// Webhook Twilio (risposta reminder)
app.post('/webhook/twilio', express.urlencoded({ extended: false }), async (req, res) => {
  const { From, Body } = req.body;
  const risposta = (Body || '').trim().toUpperCase();
  const telefono = (From || '').replace('whatsapp:', '');
  const { query } = require('./db');
  const { notifyAdmin } = require('./services/notify');

  try {
    const paz = await query('SELECT id, nome||chr(32)||cognome AS nome FROM pazienti WHERE telefono ILIKE $1', [`%${telefono.slice(-9)}%`]);
    if (paz.rows.length) {
      const paziente = paz.rows[0];
      if (risposta === 'SI' || risposta === 'SÌ') {
        await query(`UPDATE appuntamenti SET stato='confermato' WHERE paziente_id=$1 AND data > NOW() AND stato='confermato' ORDER BY data LIMIT 1`, [paziente.id]);
        await notifyAdmin(`${paziente.nome} ha confermato l'appuntamento via WhatsApp`, 'reminder_conferma');
      } else if (risposta === 'NO') {
        await query(`UPDATE appuntamenti SET stato='cancellato' WHERE paziente_id=$1 AND data > NOW() ORDER BY data LIMIT 1`, [paziente.id]);
        await notifyAdmin(`${paziente.nome} ha disdetto l'appuntamento via WhatsApp — slot libero`, 'reminder_disdetta');
      }
    }
  } catch (err) { console.error('[Twilio Webhook]', err); }
  res.type('text/xml').send('<Response></Response>');
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// 404
app.use((req, res) => res.status(404).json({ error: 'Endpoint non trovato' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Errore interno del server' });
});

// ── WEBSOCKET (L2 notifiche real-time) ─────────────────────
const wss = new WebSocketServer({ server, path: '/ws' });
const jwt = require('jsonwebtoken');

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const token = url.searchParams.get('token');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    registerWsClient(decoded.id, ws);
    ws.on('close', () => removeWsClient(decoded.id));
    ws.send(JSON.stringify({ tipo: 'connected', messaggio: 'WebSocket connesso' }));
  } catch { ws.close(1008, 'Token non valido'); }
});

// ── AVVIO ──────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
server.listen(PORT, async () => {
  console.log(`\n🦷 Gestionale Clinica — Backend avviato su porta ${PORT}`);
  console.log(`   Ambiente: ${process.env.NODE_ENV || 'development'}`);
  try {
    await pool.query('SELECT 1');
    console.log('   PostgreSQL: ✓ connesso');
  } catch (err) {
    console.error('   PostgreSQL: ✗ errore connessione', err.message);
  }
  setupCronJobs();
  console.log('   Cron jobs: ✓ attivi\n');
});

module.exports = { app, server };
