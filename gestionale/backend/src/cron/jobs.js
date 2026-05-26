const cron = require('node-cron');
const { syncPendingPreventivi } = require('../services/genya');
const { updateAllScores } = require('../services/scoring');
const { sendDailyReport, notifyAdmin } = require('../services/notify');
const { query } = require('../db');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const setupCronJobs = () => {

  // ── OGNI ORA: sync Genya automatico (L4) ─────────────────
  cron.schedule('0 * * * *', async () => {
    console.log('[Cron] Genya sync...');
    try {
      const res = await syncPendingPreventivi();
      if (res.errori > 0) await notifyAdmin(`Genya sync: ${res.errori} errori su ${res.totale}`, 'genya_errore');
    } catch (err) { console.error('[Cron] Genya error:', err.message); }
  });

  // ── OGNI MATTINA 06:00: aggiorna lista recall (L1) ───────
  cron.schedule('0 6 * * *', async () => {
    console.log('[Cron] Aggiornamento recall...');
    try {
      const urgenti = await query(`
        SELECT COUNT(*) AS n FROM pazienti WHERE ultima_visita < NOW()-INTERVAL '12 months'
      `);
      if (parseInt(urgenti.rows[0].n) > 0) {
        await notifyAdmin(`${urgenti.rows[0].n} pazienti con recall urgente (>12 mesi)`, 'recall');
      }
    } catch (err) { console.error('[Cron] Recall error:', err.message); }
  });

  // ── OGNI MATTINA 07:00: report email (L4) ────────────────
  cron.schedule('0 7 * * *', async () => {
    console.log('[Cron] Invio report giornaliero...');
    try { await sendDailyReport(); }
    catch (err) { console.error('[Cron] Email error:', err.message); }
  });

  // ── OGNI MATTINA 10:00: reminder appuntamenti 48h (L3) ───
  cron.schedule('0 10 * * *', async () => {
    console.log('[Cron] Reminder appuntamenti...');
    try {
      const domani = new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0];
      const appuntamenti = await query(`
        SELECT a.*, p.nome, p.cognome, p.telefono
        FROM appuntamenti a
        JOIN pazienti p ON p.id = a.paziente_id
        WHERE a.data = $1 AND a.stato = 'confermato' AND a.reminder_inviato = false
      `, [domani]);

      for (const app of appuntamenti.rows) {
        if (app.telefono && process.env.TWILIO_ACCOUNT_SID) {
          const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
          const msg = `Ciao ${app.nome}, ti ricordiamo l'appuntamento il ${app.data} alle ${String(app.start_time).slice(0,5)} presso ${process.env.CLINIC_NAME}. Rispondi SI per confermare o NO per disdire.`;
          try {
            await twilio.messages.create({
              from: process.env.TWILIO_WHATSAPP_FROM,
              to: `whatsapp:${app.telefono.replace(/\s/g, '')}`,
              body: msg
            });
            await query('UPDATE appuntamenti SET reminder_inviato=true WHERE id=$1', [app.id]);
            await query('INSERT INTO reminder_log (paziente_id, appuntamento_id, canale, messaggio) VALUES ($1,$2,$3,$4)',
              [app.paziente_id, app.id, 'whatsapp', msg]);
          } catch (e) { console.error(`[Twilio] Errore per ${app.nome}:`, e.message); }
        }
      }
      console.log(`[Cron] ${appuntamenti.rows.length} reminder inviati`);
    } catch (err) { console.error('[Cron] Reminder error:', err.message); }
  });

  // ── OGNI DOMENICA 02:30: ricalcolo score pazienti (L3) ───
  cron.schedule('30 2 * * 0', async () => {
    console.log('[Cron] Aggiornamento score pazienti...');
    try { await updateAllScores(); }
    catch (err) { console.error('[Cron] Scoring error:', err.message); }
  });

  // ── OGNI NOTTE 02:00: backup database (L4) ───────────────
  cron.schedule('0 2 * * *', async () => {
    console.log('[Cron] Backup database...');
    try {
      const dir = process.env.BACKUP_DIR || '/backup';
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const file = path.join(dir, `gestionale_${new Date().toISOString().split('T')[0]}.sql.gz`);
      execSync(`PGPASSWORD="${process.env.DB_PASSWORD}" pg_dump -U ${process.env.DB_USER} -h ${process.env.DB_HOST} ${process.env.DB_NAME} | gzip > ${file}`);
      console.log(`[Backup] Salvato: ${file}`);
      // Elimina backup più vecchi di 30 giorni
      const retention = parseInt(process.env.BACKUP_RETENTION_DAYS) || 30;
      execSync(`find ${dir} -name "*.sql.gz" -mtime +${retention} -delete`);
    } catch (err) { console.error('[Cron] Backup error:', err.message); }
  });

  // ── OGNI LUNEDÌ 07:30: alert abbonamenti in scadenza (L1) ─
  cron.schedule('30 7 * * 1', async () => {
    try {
      const scadenza = await query(`
        SELECT p.nome||' '||p.cognome AS nome FROM pazienti_pacchetti pp
        JOIN pazienti p ON p.id=pp.paziente_id
        WHERE pp.data_scadenza BETWEEN NOW() AND NOW()+INTERVAL '30 days' AND pp.stato='attivo'
      `);
      for (const p of scadenza.rows) {
        await notifyAdmin(`Abbonamento di ${p.nome} in scadenza entro 30 giorni`, 'abbonamento');
      }
    } catch (err) { console.error('[Cron] Abbonamento alert error:', err.message); }
  });

  console.log('[Cron] Tutti i job attivi ✓');
};

module.exports = { setupCronJobs };
