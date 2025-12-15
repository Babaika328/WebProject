require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());

app.use('/avatars', express.static(path.join(__dirname, '..', 'data/avatars')));
app.use('/images', express.static(path.join(__dirname, '..', 'data/images')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/user'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api', require('./routes/dishes'));

app.use(require('./middlewares/errorHandler'));

const createPredefinedUsers = async () => {
  const { PrismaClient } = require('@prisma/client');
  const bcrypt = require('bcryptjs');
  const prisma = new PrismaClient();

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
  process.exit(0);
});