const express = require('express');
const { query, withTransaction } = require('../db');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// GET /api/pacchetti
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT pk.*,
        json_agg(pp.descrizione ORDER BY pp.ordine) FILTER (WHERE pp.id IS NOT NULL) AS prestazioni
      FROM pacchetti pk
      LEFT JOIN pacchetti_prestazioni pp ON pp.pacchetto_id = pk.id
      WHERE pk.attivo=true
      GROUP BY pk.id ORDER BY pk.prezzo
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

// POST /api/pacchetti
router.post('/', requireRole('admin'), async (req, res) => {
  try {
    const { nome, descrizione, prezzo, rate, prezzo_mensile, colore, prestazioni } = req.body;
    if (!nome || !prezzo) return res.status(400).json({ error: 'Nome e prezzo richiesti' });

    const result = await withTransaction(async (client) => {
      const pk = await client.query(
        'INSERT INTO pacchetti (nome, descrizione, prezzo, rate, prezzo_mensile, colore) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
        [nome, descrizione||null, parseFloat(prezzo), rate||null, prezzo_mensile||null, colore||'#2B5741']
      );
      if (prestazioni?.length) {
        for (let i = 0; i < prestazioni.length; i++) {
          await client.query(
            'INSERT INTO pacchetti_prestazioni (pacchetto_id, descrizione, ordine) VALUES ($1,$2,$3)',
            [pk.rows[0].id, prestazioni[i], i]
          );
        }
      }
      return pk.rows[0];
    });
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

// DELETE /api/pacchetti/:id — soft delete
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    await query('UPDATE pacchetti SET attivo=false WHERE id=$1', [req.params.id]);
    res.json({ message: 'Pacchetto disattivato' });
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

// POST /api/vendite — assegna pacchetto a paziente + venditore
router.post('/vendite', async (req, res) => {
  try {
    const { paziente_id, pacchetto_id, venditore_id, data_vendita, importo, data_scadenza } = req.body;
    if (!paziente_id || !pacchetto_id || !venditore_id) return res.status(400).json({ error: 'Dati mancanti' });

    const result = await query(`
      INSERT INTO pazienti_pacchetti (paziente_id, pacchetto_id, venditore_id, data_vendita, importo, data_scadenza)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING *
    `, [paziente_id, pacchetto_id, venditore_id, data_vendita||new Date().toISOString().split('T')[0], importo, data_scadenza||null]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

// GET /api/vendite — per premio produzione
router.get('/vendite', async (req, res) => {
  try {
    const result = await query(`
      SELECT pp.*,
        pk.nome AS pacchetto_nome, pk.colore,
        p.nome||' '||p.cognome AS paziente_nome,
        u.nome||' '||u.cognome AS venditore_nome, u.ruolo AS venditore_ruolo
      FROM pazienti_pacchetti pp
      JOIN pacchetti pk ON pk.id = pp.pacchetto_id
      JOIN pazienti p ON p.id = pp.paziente_id
      JOIN utenti u ON u.id = pp.venditore_id
      ORDER BY pp.data_vendita DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

module.exports = router;
