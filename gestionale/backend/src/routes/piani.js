const express = require('express');
const { query } = require('../db');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// GET /api/piani/:pazienteId
router.get('/:pazienteId', async (req, res) => {
  try {
    const result = await query(`
      SELECT pc.*, u.nome||' '||u.cognome AS medico_nome_full
      FROM piani_cura pc
      LEFT JOIN utenti u ON u.id = pc.medico_id
      WHERE pc.paziente_id=$1
      ORDER BY pc.stato, pc.created_at
    `, [req.params.pazienteId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

// POST /api/piani — aggiungi lavoro
router.post('/', requireRole('admin','medico'), async (req, res) => {
  try {
    const { paziente_id, descrizione, prezzo, medico_nome } = req.body;
    if (!paziente_id || !descrizione) return res.status(400).json({ error: 'Dati mancanti' });
    const result = await query(`
      INSERT INTO piani_cura (paziente_id, descrizione, prezzo, medico_id, medico_nome)
      VALUES ($1,$2,$3,$4,$5) RETURNING *
    `, [paziente_id, descrizione, parseFloat(prezzo)||0, req.user.id, medico_nome||null]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

// PUT /api/piani/:id — aggiorna stato (eseguito/da_fare)
router.put('/:id', requireRole('admin','medico'), async (req, res) => {
  try {
    const { stato, descrizione, prezzo } = req.body;
    const data_esecuzione = stato === 'eseguito' ? new Date().toISOString().split('T')[0] : null;
    const result = await query(`
      UPDATE piani_cura SET
        stato=COALESCE($1,stato),
        descrizione=COALESCE($2,descrizione),
        prezzo=COALESCE($3,prezzo),
        data_esecuzione=$4,
        updated_at=NOW()
      WHERE id=$5 RETURNING *
    `, [stato||null, descrizione||null, prezzo?parseFloat(prezzo):null, data_esecuzione, req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Lavoro non trovato' });

    // Aggiorna ultima_visita se eseguito
    if (stato === 'eseguito') {
      await query('UPDATE pazienti SET ultima_visita=CURRENT_DATE, updated_at=NOW() WHERE id=(SELECT paziente_id FROM piani_cura WHERE id=$1)', [req.params.id]);
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

// DELETE /api/piani/:id
router.delete('/:id', requireRole('admin','medico'), async (req, res) => {
  try {
    await query('DELETE FROM piani_cura WHERE id=$1', [req.params.id]);
    res.json({ message: 'Lavoro rimosso' });
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

module.exports = router;
