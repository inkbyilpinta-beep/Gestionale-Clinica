const express = require('express');
const { query } = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// GET /api/recall — lista automatica pazienti da richiamare
router.get('/', async (req, res) => {
  try {
    const { urgenza, limit } = req.query;
    let sql = `
      SELECT p.*,
        EXTRACT(MONTH FROM AGE(NOW(), p.ultima_visita::date)) AS mesi_da_visita,
        CASE
          WHEN p.ultima_visita < NOW() - INTERVAL '12 months' THEN 'alta'
          WHEN p.ultima_visita < NOW() - INTERVAL '9 months'  THEN 'media'
          WHEN p.ultima_visita < NOW() - INTERVAL '6 months'  THEN 'bassa'
        END AS urgenza,
        r.id AS recall_id, r.data_contatto, r.esito,
        COALESCE(json_agg(DISTINCT pp.stato) FILTER (WHERE pp.id IS NOT NULL), '[]') AS stati_pacchetti
      FROM pazienti p
      LEFT JOIN recall r ON r.paziente_id = p.id AND r.created_at = (
        SELECT MAX(created_at) FROM recall WHERE paziente_id = p.id
      )
      LEFT JOIN pazienti_pacchetti pp ON pp.paziente_id = p.id
      WHERE p.ultima_visita < NOW() - INTERVAL '6 months'
    `;
    const params = [];
    if (urgenza) { params.push(urgenza); sql += ` AND (
      ($${params.length}='alta' AND p.ultima_visita < NOW() - INTERVAL '12 months') OR
      ($${params.length}='media' AND p.ultima_visita BETWEEN NOW() - INTERVAL '12 months' AND NOW() - INTERVAL '9 months') OR
      ($${params.length}='bassa' AND p.ultima_visita BETWEEN NOW() - INTERVAL '9 months' AND NOW() - INTERVAL '6 months')
    )`; }
    sql += ` GROUP BY p.id, r.id ORDER BY p.score DESC, p.ultima_visita ASC`;
    if (limit) { params.push(parseInt(limit)); sql += ` LIMIT $${params.length}`; }

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// POST /api/recall — registra tentativo di recall
router.post('/', async (req, res) => {
  try {
    const { paziente_id, esito, note } = req.body;
    const result = await query(`
      INSERT INTO recall (paziente_id, data_contatto, esito, note, utente_id)
      VALUES ($1, CURRENT_DATE, $2, $3, $4) RETURNING *
    `, [paziente_id, esito||null, note||null, req.user.id]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

// PUT /api/recall/:id
router.put('/:id', async (req, res) => {
  try {
    const { esito, note } = req.body;
    const result = await query(`
      UPDATE recall SET esito=$1, note=$2, data_contatto=CURRENT_DATE WHERE id=$3 RETURNING *
    `, [esito, note||null, req.params.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

module.exports = router;
