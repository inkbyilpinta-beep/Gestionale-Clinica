const express = require('express');
const { query } = require('../db');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// ─────────────────────────────────────────────────────────────
// LISTINO
// ─────────────────────────────────────────────────────────────

// GET /api/prestazioni/listino — voci di listino attive (per il selettore)
router.get('/listino', async (req, res) => {
  try {
    const { tutti } = req.query;
    let sql = `SELECT * FROM listino_prestazioni`;
    if (!tutti) sql += ` WHERE attivo = true`;
    sql += ` ORDER BY categoria, descrizione`;
    const result = await query(sql);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

// POST /api/prestazioni/listino — aggiunge una voce (solo admin)
router.post('/listino', requireRole('admin'), async (req, res) => {
  try {
    const { codice, descrizione, prezzo, costo_materiali_default, categoria } = req.body;
    if (!descrizione) return res.status(400).json({ error: 'Descrizione richiesta' });
    const result = await query(`
      INSERT INTO listino_prestazioni (codice, descrizione, prezzo, costo_materiali_default, categoria)
      VALUES ($1,$2,$3,$4,$5) RETURNING *
    `, [codice||null, descrizione, prezzo||0, costo_materiali_default||0, categoria||null]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Codice listino già presente' });
    res.status(500).json({ error: 'Errore server' });
  }
});

// ─────────────────────────────────────────────────────────────
// PRESTAZIONI ESEGUITE
// ─────────────────────────────────────────────────────────────

// POST /api/prestazioni — registra un lavoro eseguito (assistente/medico/admin)
router.post('/', requireRole('admin','medico','assistente'), async (req, res) => {
  try {
    const { medico_id, prestazione_id, paziente_id, incasso, costo_materiali, data, note } = req.body;
    if (!medico_id) return res.status(400).json({ error: 'medico_id richiesto' });

    // Se non passo incasso/costo, li prendo dal listino come valori di partenza
    let incassoFinale = incasso;
    let costoFinale = costo_materiali;
    if (prestazione_id && (incasso == null || costo_materiali == null)) {
      const voce = await query('SELECT prezzo, costo_materiali_default FROM listino_prestazioni WHERE id=$1', [prestazione_id]);
      if (voce.rows.length) {
        if (incasso == null) incassoFinale = voce.rows[0].prezzo;
        if (costo_materiali == null) costoFinale = voce.rows[0].costo_materiali_default;
      }
    }

    const result = await query(`
      INSERT INTO prestazioni_eseguite
        (medico_id, prestazione_id, paziente_id, incasso, costo_materiali, data, registrata_da, note)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
    `, [
      medico_id, prestazione_id||null, paziente_id||null,
      incassoFinale||0, costoFinale||0, data||new Date().toISOString().slice(0,10),
      req.user.id, note||null
    ]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// GET /api/prestazioni — elenco prestazioni, filtrabile per medico e periodo
router.get('/', async (req, res) => {
  try {
    const { medico_id, dal, al } = req.query;
    let sql = `
      SELECT pe.*, lp.descrizione AS prestazione_nome, lp.codice,
        u.nome AS medico_nome, u.cognome AS medico_cognome
      FROM prestazioni_eseguite
