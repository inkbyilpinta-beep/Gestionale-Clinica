const https = require('https');
const { query } = require('../db');

const GENYA_URL  = process.env.GENYA_API_URL  || 'https://api.genya.it/v1';
const GENYA_KEY  = process.env.GENYA_API_KEY;
const STUDIO_ID  = process.env.GENYA_STUDIO_ID;

// Chiamata HTTP generica a Genya
const genyaRequest = (method, path, body = null) => new Promise((resolve, reject) => {
  const url = new URL(GENYA_URL + path);
  const options = {
    hostname: url.hostname, port: 443, path: url.pathname + url.search,
    method, headers: { 'Content-Type': 'application/json', 'X-API-Key': GENYA_KEY, 'X-Studio-Id': STUDIO_ID }
  };
  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
      catch { resolve({ status: res.statusCode, data }); }
    });
  });
  req.on('error', reject);
  if (body) req.write(JSON.stringify(body));
  req.end();
});

// Crea/aggiorna anagrafica paziente in Genya
const syncAnagrafica = async (paziente) => {
  return genyaRequest('POST', '/anagrafiche', {
    nome:        paziente.nome,
    cognome:     paziente.cognome,
    codice_fiscale: paziente.cf,
    telefono:    paziente.telefono,
    email:       paziente.email,
    data_nascita: paziente.data_nascita,
    gestionale_id: paziente.id
  });
};

// Crea bozza fattura da preventivo accettato
const creaBozzaFattura = async (preventivo) => {
  return genyaRequest('POST', '/documenti/bozza', {
    tipo:         'parcella',
    paziente_cf:  preventivo.paziente_cf,
    data:         preventivo.data,
    voci: preventivo.voci.map(v => ({
      descrizione: v.descrizione,
      importo:     parseFloat(v.importo),
      iva:         'esente_10' // Art. 10 DPR 633/72 — da verificare con commercialista
    })),
    gestionale_preventivo_id: preventivo.id
  });
};

// Sync automatica ogni ora (L4) — eseguita dal cron
const syncPendingPreventivi = async () => {
  const pending = await query(`
    SELECT pr.*, p.cf AS paziente_cf, p.nome AS paziente_nome, p.cognome AS paziente_cognome,
      json_agg(pv.* ORDER BY pv.ordine) AS voci
    FROM preventivi pr
    JOIN pazienti p ON p.id = pr.paziente_id
    LEFT JOIN preventivi_voci pv ON pv.preventivo_id = pr.id
    WHERE pr.stato = 'accettato' AND pr.inviato_genya_at IS NULL
    GROUP BY pr.id, p.cf, p.nome, p.cognome
  `);

  let successi = 0, errori = 0;
  for (const pr of pending.rows) {
    try {
      const resp = await creaBozzaFattura(pr);
      if (resp.status === 200 || resp.status === 201) {
        await query(
          'UPDATE preventivi SET inviato_genya_at=NOW(), genya_doc_id=$1 WHERE id=$2',
          [resp.data?.id || null, pr.id]
        );
        successi++;
      } else {
        errori++;
        console.error(`[Genya] Errore preventivo ${pr.id}:`, resp.data);
      }
    } catch (err) {
      errori++;
      console.error(`[Genya] Eccezione preventivo ${pr.id}:`, err.message);
    }
  }
  console.log(`[Genya Sync] ${successi} inviati, ${errori} errori`);
  return { successi, errori, totale: pending.rows.length };
};

module.exports = { syncAnagrafica, creaBozzaFattura, syncPendingPreventivi };
