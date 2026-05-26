const express = require('express');
const { query, withTransaction } = require('../db');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// GET /api/pazienti — lista con score, abbonamento, recall
router.get('/', async (req, res) => {
  try {
    const { search, recall, score_min } = req.query;
    let sql = `
      SELECT p.*,
        COALESCE(json_agg(DISTINCT pp.*) FILTER (WHERE pp.id IS NOT NULL), '[]') AS pacchetti_attivi,
        COUNT(DISTINCT pc.id) FILTER (WHERE pc.stato='da_fare') AS lavori_da_fare,
        COUNT(DISTINCT pr.id) FILTER (WHERE pr.stato='in_attesa') AS preventivi_aperti,
        EXTRACT(EPOCH FROM (NOW() - p.ultima_visita::timestamp)) / 2592000 AS mesi_da_visita
      FROM pazienti p
      LEFT JOIN pazienti_pacchetti pp ON pp.paziente_id = p.id AND pp.stato='attivo'
      LEFT JOIN piani_cura pc ON pc.paziente_id = p.id
      LEFT JOIN preventivi pr ON pr.paziente_id = p.id
      WHERE p.id IS NOT NULL
    `;
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (p.nome ILIKE $${params.length} OR p.cognome ILIKE $${params.length} OR p.cf ILIKE $${params.length} OR p.telefono ILIKE $${params.length})`;
    }
    if (score_min) {
      params.push(parseInt(score_min));
      sql += ` AND p.score >= $${params.length}`;
    }
    sql += ` GROUP BY p.id ORDER BY p.cognome, p.nome`;
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// GET /api/pazienti/:id — scheda completa
router.get('/:id', async (req, res) => {
  try {
    const paz = await query('SELECT * FROM pazienti WHERE id=$1', [req.params.id]);
    if (!paz.rows.length) return res.status(404).json({ error: 'Paziente non trovato' });

    const pacchetti = await query(`
      SELECT pp.*, pk.nome as pacchetto_nome, pk.colore, pk.prezzo as pacchetto_prezzo
      FROM pazienti_pacchetti pp
      JOIN pacchetti pk ON pk.id = pp.pacchetto_id
      WHERE pp.paziente_id=$1 ORDER BY pp.data_vendita DESC
    `, [req.params.id]);

    res.json({ ...paz.rows[0], pacchetti_attivi: pacchetti.rows });
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

// POST /api/pazienti — nuovo paziente
router.post('/', requireRole('admin','medico','assistente'), async (req, res) => {
  try {
    const { nome, cognome, cf, data_nascita, telefono, email, note } = req.body;
    if (!nome || !cognome) return res.status(400).json({ error: 'Nome e cognome richiesti' });

    const result = await query(`
      INSERT INTO pazienti (nome, cognome, cf, data_nascita, telefono, email, note)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
    `, [nome, cognome, cf||null, data_nascita||null, telefono||null, email||null, note||null]);

    await query('INSERT INTO log_attivita (utente_id,azione,tabella,record_id) VALUES ($1,$2,$3,$4)',
      [req.user.id, 'create_paziente', 'pazienti', result.rows[0].id]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Codice fiscale già presente' });
    res.status(500).json({ error: 'Errore server' });
  }
});

// PUT /api/pazienti/:id — aggiorna paziente
router.put('/:id', requireRole('admin','medico'), async (req, res) => {
  try {
    const { nome, cognome, cf, data_nascita, telefono, email, note, ultima_visita } = req.body;
    const result = await query(`
      UPDATE pazienti SET
        nome=$1, cognome=$2, cf=$3, data_nascita=$4, telefono=$5,
        email=$6, note=$7, ultima_visita=$8, updated_at=NOW()
      WHERE id=$9 RETURNING *
    `, [nome, cognome, cf||null, data_nascita||null, telefono||null, email||null, note||null, ultima_visita||null, req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Paziente non trovato' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

// DELETE /api/pazienti/:id — solo admin (GDPR diritto all'oblio)
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    await query('DELETE FROM pazienti WHERE id=$1', [req.params.id]);
    await query('INSERT INTO log_attivita (utente_id,azione,tabella,record_id) VALUES ($1,$2,$3,$4)',
      [req.user.id, 'delete_paziente_gdpr', 'pazienti', req.params.id]);
    res.json({ message: 'Paziente eliminato (GDPR)' });
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

module.exports = router;
