const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/upload');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs').promises;

const prisma = new PrismaClient();

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, username: true, email: true, role: true, profilePicture: true }
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/me', authMiddleware, upload.single('profilePicture'), async (req, res) => {
  const { username } = req.body;
  const profilePicture = req.file?.filename;

  try {
    const currentUser = await prisma.user.findUnique({ where: { id: req.user.id } });

    const updateData = {};
    if (username && username.trim() !== currentUser.username) {
      const regex = /^[a-zA-Z0-9_-]{3,20}$/;
      if (!regex.test(username.trim())) {
        return res.status(400).json({ error: 'Invalid username format' });
      }
      const existing = await prisma.user.findUnique({ where: { username: username.trim() } });
      if (existing) {
        return res.status(400).json({ error: 'Username already taken' });
      }
      updateData.username = username.trim();
    }

    if (profilePicture) {
      if (currentUser.profilePicture) {
        const oldPath = path.join(__dirname, '..', '..', 'data/avatars', currentUser.profilePicture);
        await fs.unlink(oldPath).catch(() => {});
      }
      updateData.profilePicture = profilePicture;
    }

    if (Object.keys(updateData).length === 0) {
      return res.json({ message: 'No changes' });
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData
    });

    res.json({ message: 'Profile updated', user: { username: updated.username, profilePicture: updated.profilePicture } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/me/change-password', authMiddleware, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.status(400).json({ error: 'Wrong current password' });

    if (newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    if (!/[A-Z]/.test(newPassword)) return res.status(400).json({ error: 'Password must contain at least one uppercase letter' });
    if (!/\d/.test(newPassword)) return res.status(400).json({ error: 'Password must contain at least one number' });
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword)) return res.status(400).json({ error: 'Password must contain at least one special character' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashed }
    });

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me/recipes', authMiddleware, async (req, res) => {
  try {
    const recipes = await prisma.recipe.findMany({
      where: { userId: req.user.id },
      include: {
        dish: true,
        user: { select: { username: true, profilePicture: true } },
        votes: true,
        comments: {
          include: { user: { select: { username: true, profilePicture: true } } },
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const recipesWithStats = recipes.map(recipe => ({
      ...recipe,
      upvotes: recipe.votes.filter(v => v.type === 'UP').length,
      downvotes: recipe.votes.filter(v => v.type === 'DOWN').length
    }));

    res.json(recipesWithStats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch my recipes' });
  }
});

router.post('/me/delete-account', authMiddleware, async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password required' });

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: 'Wrong password' });

    await prisma.comment.deleteMany({ where: { userId: user.id } });
    await prisma.vote.deleteMany({ where: { userId: user.id } });
    await prisma.recipe.deleteMany({ where: { userId: user.id } });

    if (user.profilePicture) {
      const avatarPath = path.join(__dirname, '..', '..', 'data/avatars', user.profilePicture);
      await fs.unlink(avatarPath).catch(() => {});
    }

    await prisma.user.delete({ where: { id: user.id } });
    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;