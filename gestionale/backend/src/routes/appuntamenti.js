const express = require('express');
const { query } = require('../db');
const { auth, requireRole } = require('../middleware/auth');
const { notifyAll } = require('../services/notify');

const router = express.Router();
router.use(auth);

// GET /api/appuntamenti?data=2026-05-20
router.get('/', async (req, res) => {
  try {
    const { data, settimana_dal, medico_id } = req.query;
    let sql = `
      SELECT a.*,
        p.nome||' '||p.cognome AS paziente_nome, p.telefono AS paziente_tel,
        u.nome||' '||u.cognome AS medico_nome
      FROM appuntamenti a
      JOIN pazienti p ON p.id = a.paziente_id
      LEFT JOIN utenti u ON u.id = a.medico_id
      WHERE 1=1
    `;
    const params = [];
    if (data) { params.push(data); sql += ` AND a.data=$${params.length}`; }
    if (settimana_dal) {
      params.push(settimana_dal);
      sql += ` AND a.data >= $${params.length} AND a.data < $${params.length}::date + 7`;
    }
    if (medico_id) { params.push(medico_id); sql += ` AND a.medico_id=$${params.length}`; }
    sql += ` ORDER BY a.data, a.start_time`;
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

// POST /api/appuntamenti
router.post('/', requireRole('admin','assistente','medico'), async (req, res) => {
  try {
    const { paziente_id, medico_id, riunito, tipo, data, start_time, end_time, note } = req.body;
    if (!paziente_id || !riunito || !tipo || !data || !start_time) {
      return res.status(400).json({ error: 'Dati mancanti' });
    }
    // Controlla conflitti
    const conflitto = await query(`
      SELECT id FROM appuntamenti
      WHERE riunito=$1 AND data=$2 AND stato NOT IN ('cancellato','no_show')
      AND (start_time, end_time) OVERLAPS ($3::time, $4::time)
    `, [riunito, data, start_time, end_time||start_time]);
    if (conflitto.rows.length) return res.status(409).json({ error: 'Slot già occupato' });

    const result = await query(`
      INSERT INTO appuntamenti (paziente_id, medico_id, riunito, tipo, data, start_time, end_time, note)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
    `, [paziente_id, medico_id||null, riunito, tipo, data, start_time, end_time||start_time, note||null]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

// PUT /api/appuntamenti/:id/stato — aggiorna stato (no-show, completato)
router.put('/:id/stato', async (req, res) => {
  try {
    const { stato } = req.body;
    const result = await query(
      'UPDATE appuntamenti SET stato=$1, updated_at=NOW() WHERE id=$2 RETURNING *, paziente_id',
      [stato, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Appuntamento non trovato' });

    // Notifica no-show
    if (stato === 'no_show') {
      const paz = await query('SELECT nome||chr(32)||cognome AS nome FROM pazienti WHERE id=$1', [result.rows[0].paziente_id]);
      await notifyAll(`${paz.rows[0]?.nome} non si è presentato — slot ${result.rows[0].start_time} libero`, 'noshow');
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

// DELETE /api/appuntamenti/:id
router.delete('/:id', requireRole('admin','assistente'), async (req, res) => {
  try {
    await query('UPDATE appuntamenti SET stato=\'cancellato\', updated_at=NOW() WHERE id=$1', [req.params.id]);
    res.json({ message: 'Appuntamento cancellato' });
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

// GET /api/appuntamenti/report — show rate settimanale
router.get('/report', requireRole('admin','medico'), async (req, res) => {
  try {
    const { dal, al } = req.query;
    const result = await query(`
      SELECT
        COUNT(*) FILTER (WHERE stato='completato') AS completati,
        COUNT(*) FILTER (WHERE stato='no_show') AS no_show,
        COUNT(*) FILTER (WHERE stato IN ('confermato','completato','no_show')) AS totale,
        tipo,
        ROUND(COUNT(*) FILTER (WHERE stato='completato')::numeric /
          NULLIF(COUNT(*) FILTER (WHERE stato IN ('confermato','completato','no_show'))::numeric, 0) * 100, 1) AS show_rate
      FROM appuntamenti
      WHERE data BETWEEN $1 AND $2
      GROUP BY tipo
    `, [dal || new Date().toISOString().split('T')[0], al || new Date().toISOString().split('T')[0]]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

module.exports = router;
