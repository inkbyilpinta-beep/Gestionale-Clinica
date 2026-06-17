const express = require('express');
const { query } = require('../db');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// GET /api/operatori — lista operatori attivi con scheda-paga
// Serve sia al "tesserino" (selettore in home) sia al pannello admin.
router.get('/', async (req, res) => {
  try {
    const { tutti } = req.query; // ?tutti=1 mostra anche i disattivati (per admin)
    let sql = `
      SELECT u.id, u.nome, u.cognome, u.ruolo, u.attivo,
        oc.tipo_compenso, oc.importo_mezza_giornata,
        oc.percentuale, oc.base_calcolo
      FROM utenti u
      LEFT JOIN operatori_compensi oc ON oc.utente_id = u.id
      WHERE u.ruolo IN ('medico','assistente','igienista')
    `;
    if (!tutti) sql += ` AND u.attivo = true`;
    sql += ` ORDER BY u.cognome, u.nome`;
    const result = await query(sql);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// GET /api/operatori/:id — singolo operatore + scheda-paga
router.get('/:id', async (req, res) => {
  try {
    const result = await query(`
      SELECT u.id, u.nome, u.cognome, u.ruolo, u.attivo,
        oc.tipo_compenso, oc.importo_mezza_giornata,
        oc.percentuale, oc.base_calcolo
      FROM utenti u
      LEFT JOIN operatori_compensi oc ON oc.utente_id = u.id
      WHERE u.id = $1
    `, [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Operatore non trovato' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

// PUT /api/operatori/:id/compenso — imposta/aggiorna la scheda-paga (solo admin)
// Usa UPSERT: se la scheda non esiste la crea, se esiste la aggiorna.
router.put('/:id/compenso', requireRole('admin'), async (req, res) => {
  try {
    const { tipo_compenso, importo_mezza_giornata, percentuale, base_calcolo } = req.body;

    if (!['fisso', 'percentuale'].includes(tipo_compenso)) {
      return res.status(400).json({ error: 'tipo_compenso deve essere fisso o percentuale' });
    }
    if (tipo_compenso === 'fisso' && (importo_mezza_giornata == null)) {
      return res.status(400).json({ error: 'Importo mezza giornata richiesto per compenso fisso' });
    }
    if (tipo_compenso === 'percentuale' && (percentuale == null || !base_calcolo)) {
      return res.status(400).json({ error: 'Percentuale e base calcolo richiesti per compenso percentuale' });
    }

    const result = await query(`
      INSERT INTO operatori_compensi
        (utente_id, tipo_compenso, importo_mezza_giornata, percentuale, base_calcolo)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (utente_id) DO UPDATE SET
        tipo_compenso = EXCLUDED.tipo_compenso,
        importo_mezza_giornata = EXCLUDED.importo_mezza_giornata,
        percentuale = EXCLUDED.percentuale,
        base_calcolo = EXCLUDED.base_calcolo,
        updated_at = NOW()
      RETURNING *
    `, [
      req.params.id,
      tipo_compenso,
      tipo_compenso === 'fisso' ? importo_mezza_giornata : null,
      tipo_compenso === 'percentuale' ? percentuale : null,
      tipo_compenso === 'percentuale' ? base_calcolo : null,
    ]);

    await query('INSERT INTO log_attivita (utente_id,azione,tabella,record_id) VALUES ($1,$2,$3,$4)',
      [req.user.id, 'set_compenso', 'operatori_compensi', req.params.id]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

module.exports = router;
