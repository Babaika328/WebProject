require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const sendEmail = require('../utils/sendEmail');

const app = express();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your_very_strong_secret_change_in_production';

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());
app.use('/avatars', express.static(path.join(__dirname, '..', 'data/avatars')));
app.use('/images', express.static(path.join(__dirname, '..', 'data/images')));
app.use('/recipes', express.static(path.join(__dirname, '..', 'data/recipes')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/user'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api', require('./routes/dishes'));
app.use(require('./middlewares/errorHandler'));

const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

app.post('/api/me/request-email-change', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  const { newEmail } = req.body;
  if (!newEmail) return res.status(400).json({ error: 'New email is required' });
  const trimmed = newEmail.trim().toLowerCase();
  const currentUser = await prisma.user.findUnique({ where: { id: decoded.id } });
  if (!currentUser) return res.status(404).json({ error: 'User not found' });
  if (trimmed === currentUser.email) {
    return res.status(400).json({ error: 'New email must be different from current' });
  }
  const existing = await prisma.user.findUnique({ where: { email: trimmed } });
  if (existing) return res.status(400).json({ error: 'This email is already taken' });
  const code = generateCode();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  await prisma.pendingEmailChange.deleteMany({ where: { userId: currentUser.id } });
  await prisma.pendingEmailChange.create({
    data: {
      userId: currentUser.id,
      newEmail: trimmed,
      code,
      expiresAt,
      attempts: 3
    }
  });
  const html = `
  <div style="font-family: Arial, sans-serif; text-align: center; padding: 40px; background: #f5f7fa; max-width: 520px; margin: auto; border-radius: 16px;">
    <img src="https://i.imgur.com/2EnxFDX.jpeg" alt="Povaridze Logo" width="120" style="margin-bottom: 20px;" />
    <h1 style="color: #e74c3c;">Email Change Verification</h1>
    <p>You requested to change your email to <strong>${trimmed}</strong></p>
    <div style="margin: 25px 0;">
      <span style="font-size: 42px; letter-spacing: 10px; background: #ffffff; padding: 20px 35px; border-radius: 12px; display: inline-block; color: #27ae60; font-weight: bold; border: 1px solid #e0e0e0;">
        ${code}
      </span>
    </div>
    <p style="font-size: 14px; color: #666;">The code is valid for <strong>5 minutes</strong>.</p>
    <p style="font-size: 14px; color: #e74c3c; font-weight: bold;">You have <strong>3 attempts</strong> to enter the code.</p>
    <p style="font-size: 13px; color: #888; margin-top: 20px;">If you didn't request this, ignore this email.</p>
  </div>
  `;
  try {
    await sendEmail(trimmed, 'Verify Email Change - Povaridze', html);
    res.json({ message: 'Verification code sent to new email' });
  } catch (err) {
    console.error('Email send error:', err);
    res.status(500).json({ error: 'Failed to send verification code' });
  }
});

app.post('/api/me/verify-email-change', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  const { code } = req.body;
  if (!code || code.length !== 6) return res.status(400).json({ error: 'Invalid code format' });
  const pending = await prisma.pendingEmailChange.findFirst({
    where: { userId: decoded.id }
  });
  if (!pending) {
    return res.status(400).json({ error: 'No email change request found. Please request a new code.' });
  }
  if (new Date() > pending.expiresAt) {
    await prisma.pendingEmailChange.deleteMany({ where: { userId: decoded.id } });
    return res.status(400).json({ error: 'Code has expired. Please request a new one.' });
  }
  if (pending.code !== code) {
    await prisma.pendingEmailChange.updateMany({
      where: { userId: decoded.id },
      data: { attempts: { decrement: 1 } }
    });
    const refreshed = await prisma.pendingEmailChange.findFirst({
      where: { userId: decoded.id }
    });
    if (!refreshed || refreshed.attempts <= 0) {
      await prisma.pendingEmailChange.deleteMany({ where: { userId: decoded.id } });
      return res.status(400).json({ error: 'No attempts left. Please request a new code.' });
    }
    return res.status(400).json({
      error: `Invalid code. ${refreshed.attempts} attempt${refreshed.attempts === 1 ? '' : 's'} left.`
    });
  }
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: decoded.id },
      data: { email: pending.newEmail }
    });
    await tx.pendingEmailChange.deleteMany({
      where: { userId: decoded.id }
    });
  });
  const updatedUser = await prisma.user.findUnique({ where: { id: decoded.id } });
  const newToken = jwt.sign({ id: updatedUser.id }, JWT_SECRET, { expiresIn: '30d' });
  res.json({
    message: 'Email successfully changed',
    token: newToken,
    user: {
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      role: updatedUser.role,
      profilePicture: updatedUser.profilePicture
    }
  });
});

const createPredefinedUsers = async () => {
  const hashedPassword = await bcrypt.hash('wolk', 10);
  const users = [
    { username: 'superadmin', email: 'superadmin@admin.com', role: 'SUPERADMIN' },
    { username: 'admin', email: 'admin@admin.com', role: 'ADMIN' },
    { username: 'testuser1', email: 'test1@example.com', role: 'USER' },
    { username: 'testuser2', email: 'test2@example.com', role: 'USER' },
    { username: 'testuser3', email: 'test3@example.com', role: 'USER' },
    { username: 'testuser4', email: 'test4@example.com', role: 'USER' },
    { username: 'testuser5', email: 'test5@example.com', role: 'USER' },
    { username: 'testuser6', email: 'test6@example.com', role: 'USER' },
    { username: 'testuser7', email: 'test7@example.com', role: 'USER' },
    { username: 'testuser8', email: 'test8@example.com', role: 'USER' },
    { username: 'testuser9', email: 'test9@example.com', role: 'USER' },
    { username: 'testuser10', email: 'test10@example.com', role: 'USER' }
  ];
  for (const u of users) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (!existing) {
      await prisma.user.create({
        data: {
          username: u.username,
          email: u.email,
          password: hashedPassword,
          role: u.role
        }
      });
      console.log(`Created user: ${u.email} / wolk (role: ${u.role})`);
    }
  }
  await prisma.$disconnect();
};

createPredefinedUsers().catch(console.error);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  prisma.$disconnect();
  process.exit(0);
});