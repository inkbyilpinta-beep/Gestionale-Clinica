const express = require('express');
const { query } = require('../db');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// Calcola la fascia (mattina/pomeriggio) usando SEMPRE l'ora di Roma,
// non quella del server (che è fisico a Helsinki).
function fasciaCorrente() {
  const oraRoma = new Date().toLocaleString('en-US', {
    timeZone: 'Europe/Rome',
    hour12: false,
    hour: '2-digit',
  });
  const ora = parseInt(oraRoma, 10);
  return ora < 14 ? 'mattina' : 'pomeriggio';
}

// Data di oggi in formato YYYY-MM-DD secondo il fuso di Roma.
function dataOggiRoma() {
  // en-CA produce direttamente il formato YYYY-MM-DD
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Rome' });
}

// POST /api/presenze/timbra — registra la presenza dell'operatore
// Si chiama quando l'operatore apre la sua scheda dal tesserino.
router.post('/timbra', async (req, res) => {
  try {
    const { operatore_id } = req.body;
    if (!operatore_id) return res.status(400).json({ error: 'operatore_id richiesto' });

    const fascia = fasciaCorrente();
    const data = dataOggiRoma();

    // INSERT con anti-doppione: se la fascia di oggi esiste già, non fa nulla.
    const result = await query(`
      INSERT INTO presenze (utente_id, data, fascia)
      VALUES ($1, $2, $3)
      ON CONFLICT (utente_id, data, fascia) DO NOTHING
      RETURNING *
    `, [operatore_id, data, fascia]);

    if (result.rows.length) {
      // Riga nuova creata → timbratura registrata adesso
      res.status(201).json({ registrata: true, fascia, data, presenza: result.rows[0] });
    } else {
      // Nessuna riga → era già timbrata in questa fascia
      res.json({ registrata: false, fascia, data, messaggio: 'Presenza già registrata per questa fascia' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// GET /api/presenze — elenco presenze, filtrabile per operatore e periodo
// Serve al report compensi (conteggio mezze giornate).
router.get('/', async (req, res) => {
  try {
    const { operatore_id, dal, al } = req.query;
    let sql = `
      SELECT p.*, u.nome, u.cognome
      FROM presenze p
      JOIN utenti u ON u.id = p.utente_id
      WHERE 1=1
    `;
    const params = [];
    if (operatore_id) {
      params.push(operatore_id);
      sql += ` AND p.utente_id = $${params.length}`;
    }
    if (dal) {
      params.push(dal);
      sql += ` AND p.data >= $${params.length}`;
    }
    if (al) {
      params.push(al);
      sql += ` AND p.data <= $${params.length}`;
    }
    sql += ` ORDER BY p.data DESC, p.fascia`;
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

// DELETE /api/presenze/:id — correzione manuale (solo admin)
// Per quando qualcuno timbra per sbaglio.
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    await query('DELETE FROM presenze WHERE id = $1', [req.params.id]);
    await query('INSERT INTO log_attivita (utente_id,azione,tabella,record_id) VALUES ($1,$2,$3,$4)',
      [req.user.id, 'delete_presenza', 'presenze', req.params.id]);
    res.json({ message: 'Presenza eliminata' });
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

module.exports = router;
