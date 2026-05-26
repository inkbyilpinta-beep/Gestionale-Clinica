// ── SCORING SERVICE (L3) ─────────────────────────────────────
const { query } = require('../db');

const calcScore = async (pazienteId) => {
  const paz = await query(`
    SELECT p.*,
      EXTRACT(MONTH FROM AGE(NOW(), p.ultima_visita::date)) AS mesi_da_visita,
      COUNT(DISTINCT pc.id) FILTER (WHERE pc.stato='da_fare') AS lavori_da_fare,
      COALESCE(SUM(pc.prezzo) FILTER (WHERE pc.stato='da_fare'), 0) AS valore_residuo,
      COUNT(DISTINCT pr.id) FILTER (WHERE pr.stato='in_attesa') AS preventivi_aperti,
      COUNT(DISTINCT pp.id) FILTER (WHERE pp.stato='attivo') AS pacchetti_attivi,
      COUNT(DISTINCT r.id) AS tentativi_recall,
      COUNT(DISTINCT r.id) FILTER (WHERE r.esito='risposto') AS recall_risposti
    FROM pazienti p
    LEFT JOIN piani_cura pc ON pc.paziente_id = p.id
    LEFT JOIN preventivi pr ON pr.paziente_id = p.id
    LEFT JOIN pazienti_pacchetti pp ON pp.paziente_id = p.id
    LEFT JOIN recall r ON r.paziente_id = p.id
    WHERE p.id = $1
    GROUP BY p.id
  `, [pazienteId]);

  if (!paz.rows.length) return 0;
  const d = paz.rows[0];

  // Peso 1: mesi da ultima visita (30%)
  const mesi = parseFloat(d.mesi_da_visita) || 0;
  const s1 = mesi >= 12 ? 100 : mesi >= 9 ? 65 : mesi >= 6 ? 35 : 0;

  // Peso 2: valore piano residuo (25%)
  const valore = parseFloat(d.valore_residuo) || 0;
  const s2 = Math.min(100, valore / 20); // 2000€ = 100 punti

  // Peso 3: pacchetto attivo (20%)
  const s3 = parseInt(d.pacchetti_attivi) > 0 ? 100 : 0;

  // Peso 4: preventivi non chiusi (15%)
  const s4 = Math.min(75, parseInt(d.preventivi_aperti) * 25);

  // Peso 5: tasso risposta recall (10%)
  const tot = parseInt(d.tentativi_recall) || 0;
  const risp = parseInt(d.recall_risposti) || 0;
  const s5 = tot > 0 ? (risp / tot) * 100 : 50;

  const score = Math.round(s1*0.30 + s2*0.25 + s3*0.20 + s4*0.15 + s5*0.10);
  await query('UPDATE pazienti SET score=$1 WHERE id=$2', [score, pazienteId]);
  return score;
};

const updateAllScores = async () => {
  const pazienti = await query('SELECT id FROM pazienti WHERE id IS NOT NULL');
  for (const p of pazienti.rows) {
    await calcScore(p.id);
  }
  console.log(`[Scoring] Aggiornati ${pazienti.rows.length} score`);
};

module.exports = { calcScore, updateAllScores };
