const express = require('express');
const { query, withTransaction } = require('../db');
const { auth, requireRole } = require('../middleware/auth');
const { notifyAdmin } = require('../services/notify');

const router = express.Router();
router.use(auth);

// GET /api/preventivi — lista con filtri
router.get('/', async (req, res) => {
  try {
    const { paziente_id, stato, urgenti } = req.query;
    let sql = `
      SELECT pr.*,
        p.nome||' '||p.cognome AS paziente_nome,
        p.cf AS paziente_cf,
        json_agg(pv.* ORDER BY pv.ordine) FILTER (WHERE pv.id IS NOT NULL) AS voci,
        EXTRACT(DAY FROM NOW()-pr.created_at) AS giorni_in_attesa
      FROM preventivi pr
      JOIN pazienti p ON p.id = pr.paziente_id
      LEFT JOIN preventivi_voci pv ON pv.preventivo_id = pr.id
      WHERE 1=1
    `;
    const params = [];
    if (paziente_id) { params.push(paziente_id); sql += ` AND pr.paziente_id=$${params.length}`; }
    if (stato) { params.push(stato); sql += ` AND pr.stato=$${params.length}`; }
    if (urgenti === 'true') sql += ` AND pr.stato='in_attesa' AND pr.created_at < NOW()-INTERVAL '7 days'`;
    sql += ` GROUP BY pr.id, p.nome, p.cognome, p.cf ORDER BY pr.created_at DESC`;
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// POST /api/preventivi — nuovo preventivo manuale
router.post('/', requireRole('admin','medico'), async (req, res) => {
  try {
    const { paziente_id, voci, note } = req.body;
    if (!paziente_id || !voci?.length) return res.status(400).json({ error: 'Dati mancanti' });
    const totale = voci.reduce((s, v) => s + (parseFloat(v.importo) || 0), 0);

    const result = await withTransaction(async (client) => {
      const pr = await client.query(
        'INSERT INTO preventivi (paziente_id, totale, note, creato_da) VALUES ($1,$2,$3,$4) RETURNING *',
        [paziente_id, totale, note||null, req.user.id]
      );
      for (let i = 0; i < voci.length; i++) {
        await client.query(
          'INSERT INTO preventivi_voci (preventivo_id, descrizione, importo, ordine) VALUES ($1,$2,$3,$4)',
          [pr.rows[0].id, voci[i].descrizione, parseFloat(voci[i].importo)||0, i]
        );
      }
      return pr.rows[0];
    });
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

// POST /api/preventivi/da-piano/:pazienteId — L1: genera da piano
router.post('/da-piano/:pazienteId', requireRole('admin','medico'), async (req, res) => {
  try {
    const vociPiano = await query(
      `SELECT descrizione, prezzo FROM piani_cura WHERE paziente_id=$1 AND stato='da_fare' ORDER BY id`,
      [req.params.pazienteId]
    );
    if (!vociPiano.rows.length) return res.status(400).json({ error: 'Nessun lavoro da fare nel piano' });

    const totale = vociPiano.rows.reduce((s, v) => s + parseFloat(v.prezzo), 0);
    const result = await withTransaction(async (client) => {
      const pr = await client.query(
        'INSERT INTO preventivi (paziente_id, totale, creato_da, note) VALUES ($1,$2,$3,$4) RETURNING *',
        [req.params.pazienteId, totale, req.user.id, 'Generato automaticamente dal piano di cura']
      );
      for (let i = 0; i < vociPiano.rows.length; i++) {
        await client.query(
          'INSERT INTO preventivi_voci (preventivo_id, descrizione, importo, ordine) VALUES ($1,$2,$3,$4)',
          [pr.rows[0].id, vociPiano.rows[i].descrizione, vociPiano.rows[i].prezzo, i]
        );
      }
      return pr.rows[0];
    });
    res.status(201).json({ ...result, voci: vociPiano.rows, generato_da_piano: true });
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

// PUT /api/preventivi/:id — aggiorna stato
router.put('/:id', requireRole('admin','medico','assistente'), async (req, res) => {
  try {
    const { stato, note } = req.body;
    const result = await query(`
      UPDATE preventivi SET stato=COALESCE($1,stato), note=COALESCE($2,note), updated_at=NOW()
      WHERE id=$3 RETURNING *
    `, [stato||null, note||null, req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Preventivo non trovato' });

    // Notifica se accettato
    if (stato === 'accettato') {
      const paz = await query('SELECT nome||chr(32)||cognome AS nome FROM pazienti WHERE id=$1', [result.rows[0].paziente_id]);
      await notifyAdmin(`${paz.rows[0]?.nome} ha accettato il preventivo di €${result.rows[0].totale}`, 'preventivo');
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

module.exports = router;
