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
      FROM prestazioni_eseguite pe
      LEFT JOIN listino_prestazioni lp ON lp.id = pe.prestazione_id
      JOIN utenti u ON u.id = pe.medico_id
      WHERE 1=1
    `;
    const params = [];
    if (medico_id) { params.push(medico_id); sql += ` AND pe.medico_id = $${params.length}`; }
    if (dal)       { params.push(dal);       sql += ` AND pe.data >= $${params.length}`; }
    if (al)        { params.push(al);        sql += ` AND pe.data <= $${params.length}`; }
    sql += ` ORDER BY pe.data DESC`;
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

// DELETE /api/prestazioni/:id — correzione (solo admin)
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    await query('DELETE FROM prestazioni_eseguite WHERE id=$1', [req.params.id]);
    await query('INSERT INTO log_attivita (utente_id,azione,tabella,record_id) VALUES ($1,$2,$3,$4)',
      [req.user.id, 'delete_prestazione', 'prestazioni_eseguite', req.params.id]);
    res.json({ message: 'Prestazione eliminata' });
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

// ─────────────────────────────────────────────────────────────
// REPORT COMPENSI
// ─────────────────────────────────────────────────────────────

// GET /api/prestazioni/report/:medico_id?dal=...&al=...
// Calcola il compenso del medico nel periodo, secondo la sua regola.
router.get('/report/:medico_id', async (req, res) => {
  try {
    const { medico_id } = req.params;
    const { dal, al } = req.query;

    // 1. Recupero la regola di compenso del medico
    const compenso = await query(`
      SELECT u.nome, u.cognome, u.ruolo,
        oc.tipo_compenso, oc.importo_mezza_giornata, oc.percentuale, oc.base_calcolo
      FROM utenti u
      LEFT JOIN operatori_compensi oc ON oc.utente_id = u.id
      WHERE u.id = $1
    `, [medico_id]);
    if (!compenso.rows.length) return res.status(404).json({ error: 'Operatore non trovato' });
    const reg = compenso.rows[0];

    // Helper per i filtri di periodo
    const periodo = [medico_id];
    let filtroData = '';
    if (dal) { periodo.push(dal); filtroData += ` AND data >= $${periodo.length}`; }
    if (al)  { periodo.push(al);  filtroData += ` AND data <= $${periodo.length}`; }

    // 2. Conto le mezze giornate (presenze) nel periodo
    const presenze = await query(
      `SELECT COUNT(*)::int AS mezze_giornate FROM presenze WHERE utente_id = $1 ${filtroData}`,
      periodo
    );
    const mezzeGiornate = presenze.rows[0].mezze_giornate;

    // 3. Sommo incassi e costi materiali delle prestazioni nel periodo
    const totali = await query(
      `SELECT
         COALESCE(SUM(incasso),0)::numeric AS incasso_totale,
         COALESCE(SUM(costo_materiali),0)::numeric AS materiali_totale,
         COUNT(*)::int AS n_prestazioni
       FROM prestazioni_eseguite WHERE medico_id = $1 ${filtroData}`,
      periodo
    );
    const { incasso_totale, materiali_totale, n_prestazioni } = totali.rows[0];

    // 4. Calcolo il compenso secondo la regola del medico
    let compensoCalcolato = 0;
    let dettaglio = '';
    if (reg.tipo_compenso === 'fisso') {
      compensoCalcolato = mezzeGiornate * Number(reg.importo_mezza_giornata || 0);
      dettaglio = `${mezzeGiornate} mezze giornate × €${reg.importo_mezza_giornata}`;
    } else if (reg.tipo_compenso === 'percentuale') {
      const base = reg.base_calcolo === 'netto'
        ? Number(incasso_totale) - Number(materiali_totale)
        : Number(incasso_totale);
      compensoCalcolato = base * (Number(reg.percentuale) / 100);
      dettaglio = `${reg.percentuale}% su €${base.toFixed(2)} (${reg.base_calcolo})`;
    } else {
      dettaglio = 'Nessuna regola di compenso impostata';
    }

    res.json({
      operatore: { id: Number(medico_id), nome: reg.nome, cognome: reg.cognome, ruolo: reg.ruolo },
      tipo_compenso: reg.tipo_compenso,
      periodo: { dal: dal||null, al: al||null },
      mezze_giornate: mezzeGiornate,
      incasso_totale: Number(incasso_totale),
      materiali_totale: Number(materiali_totale),
      n_prestazioni,
      compenso: Number(compensoCalcolato.toFixed(2)),
      dettaglio,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

module.exports = router;
