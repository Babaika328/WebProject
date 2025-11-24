require('dotenv').config();
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');  
const cors = require('cors');


const urlModule = require('url');  
let dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'povaridze',
};

if (process.env.DATABASE_URL) {
  const parsedUrl = new urlModule.URL(process.env.DATABASE_URL);
  dbConfig = {
    host: parsedUrl.hostname,
    port: parseInt(parsedUrl.port || '3306'),
    user: parsedUrl.username,
    password: parsedUrl.password,
    database: parsedUrl.pathname.slice(1),  
  };
}

const adapter = new PrismaMariaDb(dbConfig);  
const prisma = new PrismaClient({ adapter });

const app = express();
app.use(cors());
app.use(express.json());

app.get('/meals', async (req, res) => {
  try {
    const meals = await prisma.dish.findMany();
    res.json(meals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/meals/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const meal = await prisma.dish.findUnique({
      where: { idMeal: id }
    });
    if (!meal) return res.status(404).json({ error: 'Meal not found' });
    res.json(meal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/meals/name/:name', async (req, res) => {
  const { name } = req.params;
  try {
    const meals = await prisma.dish.findMany({
      where: {
        name: {
          contains: name
        }
      }
    });
    if (!meals.length) return res.status(404).json({ error: 'Meal not found' });
    res.json(meals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));