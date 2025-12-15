const express = require('express');
const router = express.Router();
const { authMiddleware, requireAdmin } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/upload');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs').promises;

const prisma = new PrismaClient();

router.get('/users', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        profilePicture: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:id', authMiddleware, requireAdmin, upload.single('profilePicture'), async (req, res) => {
  const { id } = req.params;
  const { username, email, role, newPassword } = req.body;
  const profilePicture = req.file?.filename;

  try {
    const targetUser = await prisma.user.findUnique({ where: { id: parseInt(id) } });
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    const currentUser = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (currentUser.role !== 'SUPERADMIN') {
      if (targetUser.role === 'SUPERADMIN' || targetUser.role === 'ADMIN') {
        return res.status(403).json({ error: 'You cannot edit admins or superadmin' });
      }
    }

    if (username && username.trim() !== targetUser.username) {
      const regex = /^[a-zA-Z0-9_-]{3,20}$/;
      if (!regex.test(username.trim())) {
        return res.status(400).json({ error: 'Username must be 3-20 chars, letters, numbers, _ or - only' });
      }
      const existing = await prisma.user.findUnique({ where: { username: username.trim() } });
      if (existing && existing.id !== targetUser.id) {
        return res.status(400).json({ error: 'Username already taken' });
      }
    }

    if (email && email.trim() !== targetUser.email) {
      const existing = await prisma.user.findUnique({ where: { email: email.trim() } });
      if (existing && existing.id !== targetUser.id) {
        return res.status(400).json({ error: 'Email already taken' });
      }
    }

    let newRole = targetUser.role;
    if (role && currentUser.role === 'SUPERADMIN') {
      if (!['USER', 'ADMIN'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      newRole = role;
    }

    if (newPassword) {
      if (newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters long' });
      if (!/[A-Z]/.test(newPassword)) return res.status(400).json({ error: 'Password must contain at least one uppercase letter' });
      if (!/\d/.test(newPassword)) return res.status(400).json({ error: 'Password must contain at least one number' });
      if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword)) return res.status(400).json({ error: 'Password must contain at least one special character' });
    }

    const updateData = {};
    if (username) updateData.username = username.trim();
    if (email) updateData.email = email.trim();
    if (newRole !== targetUser.role) updateData.role = newRole;
    if (newPassword) updateData.password = await bcrypt.hash(newPassword, 10);
    if (profilePicture) {
      if (targetUser.profilePicture) {
        const oldPath = path.join(__dirname, '..', '..', 'data/avatars', targetUser.profilePicture);
        await fs.unlink(oldPath).catch(() => {});
      }
      updateData.profilePicture = profilePicture;
    }

    if (Object.keys(updateData).length === 0) {
      return res.json({ message: 'No changes' });
    }

    const updated = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: { id: true, username: true, email: true, role: true, profilePicture: true }
    });

    res.json({ message: 'User updated', user: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/users/:id', authMiddleware, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const currentUser = await prisma.user.findUnique({ where: { id: req.user.id } });

  try {
    const target = await prisma.user.findUnique({ where: { id: parseInt(id) } });
    if (!target) return res.status(404).json({ error: 'User not found' });

    if (currentUser.role !== 'SUPERADMIN' && target.role !== 'USER') {
      return res.status(403).json({ error: 'You can only delete regular users' });
    }

    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    await prisma.comment.deleteMany({ where: { userId: parseInt(id) } });
    await prisma.vote.deleteMany({ where: { userId: parseInt(id) } });
    await prisma.recipe.deleteMany({ where: { userId: parseInt(id) } });

    if (target.profilePicture) {
      const avatarPath = path.join(__dirname, '..', '..', 'data/avatars', target.profilePicture);
      await fs.unlink(avatarPath).catch(() => {});
    }

    await prisma.user.delete({ where: { id: parseInt(id) } });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;