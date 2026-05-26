const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email e password richiesti' });

    const result = await query('SELECT * FROM utenti WHERE email=$1 AND attivo=true', [email.toLowerCase()]);
    if (!result.rows.length) return res.status(401).json({ error: 'Credenziali non valide' });

    const utente = result.rows[0];
    const valid = await bcrypt.compare(password, utente.password_hash);
    if (!valid) return res.status(401).json({ error: 'Credenziali non valide' });

    const token = jwt.sign(
      { id: utente.id, ruolo: utente.ruolo },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    // Log accesso
    await query('INSERT INTO log_attivita (utente_id, azione) VALUES ($1, $2)', [utente.id, 'login']);

    res.json({
      token,
      utente: { id: utente.id, nome: utente.nome, cognome: utente.cognome, email: utente.email, ruolo: utente.ruolo }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// GET /api/auth/me — profilo utente corrente
router.get('/me', auth, async (req, res) => {
  res.json(req.user);
});

// POST /api/auth/change-password
router.post('/change-password', auth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const result = await query('SELECT password_hash FROM utenti WHERE id=$1', [req.user.id]);
    const valid = await bcrypt.compare(oldPassword, result.rows[0].password_hash);
    if (!valid) return res.status(400).json({ error: 'Password attuale non corretta' });
    if (newPassword.length < 8) return res.status(400).json({ error: 'Password minimo 8 caratteri' });
    const hash = await bcrypt.hash(newPassword, 12);
    await query('UPDATE utenti SET password_hash=$1, updated_at=NOW() WHERE id=$2', [hash, req.user.id]);
    res.json({ message: 'Password aggiornata' });
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
});

module.exports = router;
