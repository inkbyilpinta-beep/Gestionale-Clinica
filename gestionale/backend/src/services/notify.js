const { query } = require('../db');

// ── NOTIFICHE IN-APP ──────────────────────────────────────────
let wsClients = {}; // { utenteId: ws }

const registerWsClient = (utenteId, ws) => { wsClients[utenteId] = ws; };
const removeWsClient  = (utenteId) => { delete wsClients[utenteId]; };

const notify = async (utenteId, tipo, messaggio, link = null) => {
  await query(
    'INSERT INTO notifiche (utente_id, tipo, messaggio, link) VALUES ($1,$2,$3,$4)',
    [utenteId, tipo, messaggio, link]
  );
  if (wsClients[utenteId]?.readyState === 1) {
    wsClients[utenteId].send(JSON.stringify({ tipo, messaggio, link, ora: new Date().toISOString() }));
  }
};

const notifyAdmin = async (messaggio, tipo = 'info') => {
  const admins = await query(`SELECT id FROM utenti WHERE ruolo IN ('admin') AND attivo=true`);
  for (const u of admins.rows) await notify(u.id, tipo, messaggio);
};

const notifyAll = async (messaggio, tipo = 'info') => {
  const utenti = await query(`SELECT id FROM utenti WHERE attivo=true`);
  for (const u of utenti.rows) await notify(u.id, tipo, messaggio);
};

// ── EMAIL REPORT GIORNALIERO (L4) ────────────────────────────
const sendDailyReport = async () => {
  const oggi = new Date().toISOString().split('T')[0];
  const ieri = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const [fatturato, appOggi, recallUrgenti, prevAttesa, abbScadenza] = await Promise.all([
    query(`SELECT COALESCE(SUM(totale),0) AS tot, COUNT(*) AS num FROM preventivi WHERE stato='accettato' AND DATE(updated_at)=$1`, [ieri]),
    query(`SELECT a.*, p.nome||' '||p.cognome AS paziente FROM appuntamenti a JOIN pazienti p ON p.id=a.paziente_id WHERE a.data=$1 ORDER BY a.start_time`, [oggi]),
    query(`SELECT p.nome||' '||p.cognome AS nome, p.score, p.ultima_visita FROM pazienti p WHERE p.ultima_visita < NOW()-INTERVAL '9 months' AND p.score > 60 ORDER BY p.score DESC LIMIT 5`),
    query(`SELECT pr.*, p.nome||' '||p.cognome AS paziente FROM preventivi pr JOIN pazienti p ON p.id=pr.paziente_id WHERE pr.stato='in_attesa' AND pr.created_at < NOW()-INTERVAL '7 days' ORDER BY pr.created_at`),
    query(`SELECT p.nome||' '||p.cognome AS nome, pp.data_scadenza FROM pazienti_pacchetti pp JOIN pazienti p ON p.id=pp.paziente_id WHERE pp.data_scadenza BETWEEN NOW() AND NOW()+INTERVAL '14 days' AND pp.stato='attivo'`),
  ]);

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#1E4D35;padding:20px;border-radius:8px 8px 0 0">
        <h1 style="color:#fff;margin:0;font-size:20px">📋 Report Giornaliero — ${oggi}</h1>
        <p style="color:#A8D5B5;margin:4px 0 0;font-size:13px">${process.env.CLINIC_NAME}</p>
      </div>
      <div style="background:#fff;padding:20px;border:1px solid #ddd">
        <h3 style="color:#1E4D35">💰 Fatturato ieri</h3>
        <p style="font-size:24px;font-weight:700;color:#1E4D35">€${parseFloat(fatturato.rows[0].tot).toLocaleString('it')}</p>
        <p style="color:#666">${fatturato.rows[0].num} preventivi accettati</p>
        <hr style="border-color:#eee">
        <h3 style="color:#1E4D35">📅 Appuntamenti oggi (${appOggi.rows.length})</h3>
        ${appOggi.rows.map(a => `<p style="margin:4px 0"><strong>${a.start_time.slice(0,5)}</strong> — ${a.paziente} — ${a.tipo} — ${a.riunito}</p>`).join('')}
        ${appOggi.rows.length === 0 ? '<p style="color:#999">Nessun appuntamento</p>' : ''}
        <hr style="border-color:#eee">
        <h3 style="color:#DC2626">🔴 Recall urgenti</h3>
        ${recallUrgenti.rows.map(p => `<p style="margin:4px 0"><strong>${p.nome}</strong> — score ${p.score} — ultima visita: ${p.ultima_visita}</p>`).join('')}
        ${recallUrgenti.rows.length === 0 ? '<p style="color:#999">Nessuno</p>' : ''}
        <hr style="border-color:#eee">
        <h3 style="color:#D97706">⚠️ Preventivi in attesa > 7gg</h3>
        ${prevAttesa.rows.map(p => `<p style="margin:4px 0"><strong>${p.paziente}</strong> — €${p.totale}</p>`).join('')}
        ${prevAttesa.rows.length === 0 ? '<p style="color:#999">Nessuno</p>' : ''}
        <hr style="border-color:#eee">
        <h3 style="color:#7C3AED">📦 Abbonamenti in scadenza < 14gg</h3>
        ${abbScadenza.rows.map(p => `<p style="margin:4px 0"><strong>${p.nome}</strong> — scade: ${p.data_scadenza}</p>`).join('')}
        ${abbScadenza.rows.length === 0 ? '<p style="color:#999">Nessuno</p>' : ''}
      </div>
      <div style="background:#f5f5f5;padding:12px;text-align:center;font-size:12px;color:#999;border-radius:0 0 8px 8px">
        ${process.env.CLINIC_NAME} · Report automatico · <a href="${process.env.DOMAIN}">Apri gestionale</a>
      </div>
    </div>
  `;

  // Invio via Brevo (Sendinblue)
  if (process.env.BREVO_API_KEY) {
    const https = require('https');
    const body = JSON.stringify({
      sender: { name: process.env.CLINIC_NAME, email: process.env.EMAIL_FROM },
      to: [{ email: process.env.EMAIL_ADMIN }],
      subject: `📋 Report ${oggi} — ${process.env.CLINIC_NAME}`,
      htmlContent: html
    });
    const req = https.request({
      hostname: 'api.brevo.com', port: 443, path: '/v3/smtp/email', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': process.env.BREVO_API_KEY }
    });
    req.write(body);
    req.end();
    console.log('[Email] Report giornaliero inviato');
  }
};

module.exports = { notify, notifyAdmin, notifyAll, registerWsClient, removeWsClient, sendDailyReport };
