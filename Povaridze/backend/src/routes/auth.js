const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const sendEmail = require('../../utils/sendEmail'); 

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your_very_strong_secret_change_in_production';

router.post('/send-code', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email required' });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(400).json({ error: 'Email already registered' });
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); 

  await prisma.pendingEmailChange.upsert({
    where: { newEmail: email },
    update: { code, expiresAt, attempts: 3 },
    create: { newEmail: email, code, expiresAt, attempts: 3 }
  });

  try {
    await sendEmail(email, 'Your verification code', `Your code: ${code}`);
    res.json({ message: 'Code sent' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send email' });
  }
});

router.post('/verify-code', async (req, res) => {
  const { email, code, username, password } = req.body;

  if (!email || !code || !username || !password) {
    return res.status(400).json({ error: 'All fields required' });
  }

  const pending = await prisma.pendingEmailChange.findUnique({ where: { newEmail: email } });
  if (!pending || pending.code !== code || new Date() > pending.expiresAt || pending.attempts <= 0) {
    return res.status(400).json({ error: 'Invalid or expired code' });
  }

  if (password.length < 8) return res.status(400).json({ error: 'Password too short' });
  if (!/[A-Z]/.test(password)) return res.status(400).json({ error: 'No uppercase letter' });
  if (!/\d/.test(password)) return res.status(400).json({ error: 'No number' });
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) return res.status(400).json({ error: 'No special character' });

  const existingUsername = await prisma.user.findUnique({ where: { username } });
  if (existingUsername) return res.status(400).json({ error: 'Username taken' });

  const hashed = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      username,
      email,
      password: hashed,
      role: 'USER'
    }
  });

  await prisma.pendingEmailChange.delete({ where: { newEmail: email } });

  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
});

router.post('/login', async (req, res) => {
  const { credential, password } = req.body;

  if (!credential || !password) {
    return res.status(400).json({ error: 'Credential and password required' });
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: credential },
        { username: credential }
      ]
    }
  });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(400).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role, profilePicture: user.profilePicture } });
});

module.exports = router;