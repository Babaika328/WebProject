const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const sendEmail = require('../../utils/sendEmail');
const { authMiddleware } = require('../middlewares/authMiddleware');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your_very_strong_secret_change_in_production';

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

router.post('/send-code', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  const trimmed = email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: trimmed } });
  if (existing) return res.status(400).json({ error: 'Email already registered' });

  const code = generateCode();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  const pending = await prisma.pendingEmailChange.findUnique({
    where: { newEmail: trimmed }
  });

  if (pending) {
    await prisma.pendingEmailChange.update({
      where: { id: pending.id },
      data: { code, expiresAt, attempts: 3 }
    });
  } else {
    await prisma.pendingEmailChange.create({
      data: { newEmail: trimmed, code, expiresAt, attempts: 3 }
    });
  }

  const html = `
  <div style="font-family: Arial, sans-serif; text-align: center; padding: 40px; background: #f5f7fa; max-width: 520px; margin: auto; border-radius: 16px;">
    <img src="https://i.imgur.com/2EnxFDX.jpeg" alt="Povaridze Logo" width="120" style="margin-bottom: 20px;" />
    <h1 style="color: #e74c3c;">Registration Verification</h1>
    <p>Welcome to Povaridze! Your verification code:</p>
    <div style="margin: 25px 0;">
      <span style="font-size: 42px; letter-spacing: 10px; background: #ffffff; padding: 20px 35px; border-radius: 12px; display: inline-block; color: #27ae60; font-weight: bold; border: 1px solid #e0e0e0;">
        ${code}
      </span>
    </div>
    <p style="font-size: 14px; color: #666;">The code is valid for <strong>5 minutes</strong>.</p>
    <p style="font-size: 14px; color: #e74c3c; font-weight: bold;">You have <strong>3 attempts</strong>.</p>
    <p style="font-size: 13px; color: #888; margin-top: 20px;">If you didn't request this, ignore this email.</p>
  </div>
  `;

  try {
    await sendEmail(trimmed, 'Povaridze - Verification Code', html);
    res.json({ message: 'Code sent successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

router.post('/verify-code', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: 'Email and code required' });
  const trimmed = email.trim().toLowerCase();
  const trimmedCode = code.trim();

  const pending = await prisma.pendingEmailChange.findUnique({ where: { newEmail: trimmed } });
  if (!pending) return res.status(400).json({ error: 'No verification request found' });

  if (new Date() > pending.expiresAt) {
    await prisma.pendingEmailChange.delete({ where: { newEmail: trimmed } });
    return res.status(400).json({ error: 'Code expired' });
  }

  if (pending.attempts <= 0) {
    await prisma.pendingEmailChange.delete({ where: { newEmail: trimmed } });
    return res.status(400).json({ error: 'No attempts left' });
  }

  if (pending.code !== trimmedCode) {
    const updated = await prisma.pendingEmailChange.update({
      where: { newEmail: trimmed },
      data: { attempts: { decrement: 1 } }
    });
    return res.status(400).json({
      error: `Invalid code. ${updated.attempts} attempt${updated.attempts === 1 ? '' : 's'} left`
    });
  }

  await prisma.pendingEmailChange.delete({ where: { newEmail: trimmed } });
  res.json({ message: 'Code verified successfully' });
});

router.post('/register', async (req, res) => {
  const { email, username, password } = req.body;
  if (!email || !username || !password) return res.status(400).json({ error: 'All fields required' });
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedUsername = username.trim().toLowerCase();

  const pending = await prisma.pendingEmailChange.findUnique({ where: { newEmail: trimmedEmail } });
  if (pending) return res.status(400).json({ error: 'Please verify your email first' });

  const existingEmail = await prisma.user.findUnique({ where: { email: trimmedEmail } });
  if (existingEmail) return res.status(400).json({ error: 'Email already registered' });

  const existingUsername = await prisma.user.findUnique({ where: { username: trimmedUsername } });
  if (existingUsername) return res.status(400).json({ error: 'Username taken' });

  if (password.length < 8) return res.status(400).json({ error: 'Password too short' });
  if (!/[A-Z]/.test(password)) return res.status(400).json({ error: 'No uppercase letter' });
  if (!/\d/.test(password)) return res.status(400).json({ error: 'No number' });
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) return res.status(400).json({ error: 'No special character' });

  const hashed = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      username: trimmedUsername,
      email: trimmedEmail,
      password: hashed,
      role: 'USER'
    }
  });

  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30d' });

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      profilePicture: user.profilePicture
    }
  });
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  const trimmed = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({ where: { email: trimmed } });
  if (!user) {
    return res.json({ message: 'If the email is registered, a reset code has been sent' });
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  const pending = await prisma.pendingEmailChange.findUnique({ where: { newEmail: trimmed } });

  if (pending) {
    await prisma.pendingEmailChange.update({
      where: { id: pending.id },
      data: { code, expiresAt, attempts: 3 }
    });
  } else {
    await prisma.pendingEmailChange.create({
      data: { newEmail: trimmed, code, expiresAt, attempts: 3 }
    });
  }

  const html = `
  <div style="font-family: Arial, sans-serif; text-align: center; padding: 40px; background: #f5f7fa; max-width: 520px; margin: auto; border-radius: 16px;">
    <img src="https://i.imgur.com/2EnxFDX.jpeg" alt="Povaridze Logo" width="120" style="margin-bottom: 20px;" />
    <h1 style="color: #e74c3c;">Password Reset</h1>
    <p>You requested a password reset.</p>
    <div style="margin: 25px 0;">
      <span style="font-size: 42px; letter-spacing: 10px; background: #ffffff; padding: 20px 35px; border-radius: 12px; display: inline-block; color: #27ae60; font-weight: bold; border: 1px solid #e0e0e0;">
        ${code}
      </span>
    </div>
    <p style="font-size: 14px; color: #666;">The code is valid for <strong>5 minutes</strong>.</p>
    <p style="font-size: 13px; color: #888; margin-top: 20px;">If you didn't request this, ignore this email.</p>
  </div>
  `;

  try {
    await sendEmail(trimmed, 'Povaridze - Password Reset', html);
  } catch (err) {
    console.error(err);
  }

  res.json({ message: 'If the email is registered, a reset code has been sent' });
});

router.post('/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) return res.status(400).json({ error: 'All fields required' });
  const trimmed = email.trim().toLowerCase();
  const trimmedCode = code.trim();

  const pending = await prisma.pendingEmailChange.findUnique({ where: { newEmail: trimmed } });
  if (!pending || pending.code !== trimmedCode || new Date() > pending.expiresAt) {
    return res.status(400).json({ error: 'Invalid or expired code' });
  }

  if (newPassword.length < 8) return res.status(400).json({ error: 'Password too short' });
  if (!/[A-Z]/.test(newPassword)) return res.status(400).json({ error: 'No uppercase letter' });
  if (!/\d/.test(newPassword)) return res.status(400).json({ error: 'No number' });
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword)) return res.status(400).json({ error: 'No special character' });

  const hashed = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { email: trimmed },
    data: { password: hashed }
  });

  await prisma.pendingEmailChange.delete({ where: { newEmail: trimmed } });

  res.json({ message: 'Password reset successfully' });
});

router.post('/send-change-code', authMiddleware, async (req, res) => {
  const { newEmail } = req.body;
  if (!newEmail) return res.status(400).json({ error: 'New email required' });

  const trimmed = newEmail.trim().toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: trimmed } });
  if (existing && existing.id !== req.user.id) {
    return res.status(400).json({ error: 'Email already in use' });
  }

  try {
    await prisma.pendingEmailChange.deleteMany({
      where: { userId: req.user.id }
    });

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.pendingEmailChange.create({
      data: {
        userId: req.user.id,
        newEmail: trimmed,
        code,
        expiresAt
      }
    });

    const html = `
    <div style="font-family: Arial, sans-serif; text-align: center; padding: 40px; background: #f5f7fa; max-width: 520px; margin: auto; border-radius: 16px;">
      <img src="https://i.imgur.com/2EnxFDX.jpeg" alt="Povaridze Logo" width="120" style="margin-bottom: 20px;" />
      <h1 style="color: #e74c3c;">Email Change Verification</h1>
      <p>You requested to change your email.</p>
      <div style="margin: 25px 0;">
        <span style="font-size: 42px; letter-spacing: 10px; background: #ffffff; padding: 20px 35px; border-radius: 12px; display: inline-block; color: #27ae60; font-weight: bold; border: 1px solid #e0e0e0;">
          ${code}
        </span>
      </div>
      <p style="font-size: 14px; color: #666;">The code is valid for <strong>5 minutes</strong>.</p>
      <p style="font-size: 13px; color: #888; margin-top: 20px;">If you didn't request this, ignore this email.</p>
    </div>
    `;

    await sendEmail(trimmed, 'Povaridze - Email Change Code', html);
    res.json({ message: 'Code sent to new email' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send code' });
  }
});

router.post('/confirm-change-code', authMiddleware, async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Code required' });

  const trimmedCode = code.trim();

  try {
    const pending = await prisma.pendingEmailChange.findFirst({
      where: {
        userId: req.user.id,
        code: trimmedCode,
        expiresAt: { gt: new Date() }
      }
    });

    if (!pending) return res.status(400).json({ error: 'Invalid or expired code' });

    await prisma.user.update({
      where: { id: req.user.id },
      data: { email: pending.newEmail }
    });

    await prisma.pendingEmailChange.delete({ where: { id: pending.id } });

    res.json({ message: 'Email changed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to change email' });
  }
});

router.post('/login', async (req, res) => {
  const { credential, password } = req.body;
  if (!credential || !password) return res.status(400).json({ error: 'Credential and password required' });

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: credential.trim().toLowerCase() },
        { username: credential.trim().toLowerCase() }
      ]
    }
  });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(400).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30d' });

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      profilePicture: user.profilePicture
    }
  });
});

module.exports = router;