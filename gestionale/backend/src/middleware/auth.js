const jwt = require('jsonwebtoken');
const { query } = require('../db');

// Verifica token JWT
const auth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token mancante' });
    }
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await query('SELECT id, nome, cognome, ruolo FROM utenti WHERE id=$1 AND attivo=true', [decoded.id]);
    if (!result.rows.length) return res.status(401).json({ error: 'Utente non trovato' });
    req.user = result.rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token non valido' });
  }
};

// Controllo ruolo
const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.ruolo)) {
    return res.status(403).json({ error: 'Accesso non autorizzato' });
  }
  next();
};

module.exports = { auth, requireRole };
