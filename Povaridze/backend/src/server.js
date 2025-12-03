require('dotenv').config();
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const urlModule = require('url');
const sendEmail = require('../utils/sendEmail');   

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
const path = require('path');
app.use(cors());
app.use(express.json());
app.use('/images', express.static(path.join(__dirname, '..', 'data/images')));


const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_change_me';


const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});


const loginSchema = Joi.object({
  credential: Joi.alternatives().try(
    Joi.string().email(),
    Joi.string().alphanum().min(3).max(50)
  ).required(),
  password: Joi.string().required()
});

const recipeSchema = Joi.object({
  dishId: Joi.string().required(),
  title: Joi.string().required(),
  instructions: Joi.string().optional(),
  ingredients: Joi.string().optional()
});


const updateRecipeSchema = recipeSchema.fork(['dishId'], schema => schema.optional());

const voteSchema = Joi.object({
  recipeId: Joi.number().required(),
  type: Joi.string().valid('UP', 'DOWN').required()
});

const commentSchema = Joi.object({
  recipeId: Joi.number().required(),
  text: Joi.string().min(1).required()
});


const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(400).json({ error: 'Invalid token.' });
  }
};


const adminMiddleware = async (req, res, next) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (user.role !== 'ADMIN') return res.status(403).json({ error: 'Admin access required.' });
  next();
};


const canAccessResource = async (req, res, resourceType, resourceId) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (user.role === 'ADMIN') return true;

  const resource = await prisma[resourceType].findUnique({ where: { id: parseInt(resourceId) } });
  if (!resource || resource.userId !== req.user.id) {
    return res.status(403).json({ error: 'Access denied. You can only modify your own resources.' });
  }
  return true;
};

const verificationCodes = new Map();

const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

app.post('/api/auth/send-code', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  const code = generateCode();
  const expires = Date.now() + 5 * 60 * 1000; 

  verificationCodes.set(email.toLowerCase(), { code, expires });

  const html = `
  <div style="font-family: Arial, sans-serif; text-align: center; padding: 40px; background: #f5f7fa; max-width: 520px; margin: auto; border-radius: 16px;">
    <img src="https://i.imgur.com/2EnxFDX.jpeg" alt="Povaridze Logo" width="120" style="margin-bottom: 20px;" />

    <h1 style="color: #e74c3c; margin-bottom: 10px;">Email Verification</h1>

    <p style="font-size: 16px; color: #333;">
      Please use the verification code below to complete your authentication.
    </p>

    <div style="margin: 25px 0;">
      <span style="font-size: 42px; letter-spacing: 10px; background: #ffffff; padding: 20px 35px; border-radius: 12px; display: inline-block; color: #27ae60; font-weight: bold; border: 1px solid #e0e0e0;">
        ${code}
      </span>
    </div>

    <p style="font-size: 14px; color: #666;">The code is valid for <strong>5 minutes</strong>.</p>

    <p style="color: #999; font-size: 13px; margin-top: 30px;">
      If you did not request this verification code, simply ignore this message.
    </p>
  </div>
  `;

  try {
    await sendEmail(email, 'Your Povaridze Verification Code', html);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send verification code.' });
  }
});

app.post('/api/auth/verify-code', (req, res) => {
  const { email, code } = req.body;

  const stored = verificationCodes.get(email.toLowerCase());
  if (!stored || Date.now() > stored.expires || stored.code !== code) {
    return res.status(400).json({ error: 'Invalid or expired verification code.' });
  }

  verificationCodes.delete(email.toLowerCase());
  res.json({ success: true });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { error } = registerSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    let { username, email, password } = req.body;

    username = username.trim().toLowerCase();
    const usernameRegex = /^[a-z0-9_-]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({ 
        error: 'Username must be 3–20 characters and contain only lowercase letters, numbers, _ or -' 
      });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'User with this email already exists.' });

    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) return res.status(400).json({ error: 'Username is already taken.' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { 
        username, 
        email, 
        password: hashedPassword 
      }
    });

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });

    const welcomeHtml = `
      <div style="font-family: Arial, sans-serif; text-align: center; padding: 40px; background: #f5f7fa; max-width: 600px; margin: auto; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
        <img src="https://i.imgur.com/2EnxFDX.jpeg" alt="Povaridze Logo" width="140" style="margin-bottom: 20px;" />
        <h1 style="color: #e74c3c; margin-bottom: 10px;">Welcome to Povaridze, ${user.username}!</h1>
        <p style="font-size: 17px; color: #333;">
          Your account has been successfully created.
        </p>
        <p style="font-size: 16px; color: #27ae60; font-weight: bold; margin-top: 20px;">
          Start exploring our curated collection of recipes and discover your next favorite dish!
        </p>
        <p style="font-size: 13px; color: #888; margin-top: 30px;">
          Thank you for joining Povaridze — we are excited to have you with us.
        </p>
      </div>
    `;

    await sendEmail(email, 'Welcome to Povaridze!', welcomeHtml);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});



app.post('/api/auth/login', async (req, res) => {
  try {
    const { error } = loginSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const { credential, password } = req.body;
    let user;
    const emailValidation = Joi.string().email().validate(credential);
    if (emailValidation.error) {
      
      user = await prisma.user.findUnique({ where: { username: credential } });
    } else {
      
      user = await prisma.user.findUnique({ where: { email: credential } });
    }
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.get('/api/dishes/:idMeal', async (req, res) => {
  try {
    const { idMeal } = req.params;
    const dish = await prisma.dish.findUnique({
      where: { idMeal },
      select: {
        idMeal: true,
        name: true,
        category: true,
        area: true,
        instructions: true,
        ingredients: true,
        tags: true,
        thumb_file: true,
        youtube: true,
        recipes: {
          include: {
            user: { select: { id: true, username: true } },
            _count: { select: { votes: true, comments: true } }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    if (!dish) return res.status(404).json({ error: 'Dish not found' });

    
    let recipes = dish.recipes;
    if (recipes.length === 0) {
      const defaultRecipe = {
        id: null,
        title: `${dish.name.trim()} (Default)`,
        instructions: dish.instructions || 'No instructions available.',
        ingredients: dish.ingredients || 'No ingredients available.',
        user: { id: null, username: 'System' },
        _count: { votes: 0, comments: 0 },
        createdAt: new Date()
      };
      recipes = [defaultRecipe];
    }

    
    const { instructions, ingredients, ...cleanDish } = dish;
    res.json({ ...cleanDish, recipes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.get('/api/dishes', async (req, res) => {
  try {
    const { category, area, tags, limit = 20, page = 1, search, sortBy = 'name_asc' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    
    if (category) where.category = category;
    if (area) where.area = area;

    
    if (tags) {
      where.tags = { contains: tags };
    }

    
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { category: { contains: search } },
        { area: { contains: search } },
        { tags: { contains: search } }
      ];
    }

    
    let orderBy = { name: 'asc' };
    if (sortBy === 'votes_desc') {
      
      const dishesWithCounts = await prisma.dish.findMany({
        where,
        select: {
          idMeal: true,
          name: true,
          category: true,
          area: true,
          instructions: true,
          ingredients: true,
          tags: true,
          thumb_file: true,
          youtube: true,
          recipes: {
            include: {
              votes: true,
              comments: true,
              user: { select: { id: true, username: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit)
          }
        },
        skip,
        take: parseInt(limit)
      });
      
      const sortedDishes = dishesWithCounts.sort((a, b) => {
        const countA = a.recipes.reduce((sum, r) => sum + r.votes.length, 0);
        const countB = b.recipes.reduce((sum, r) => sum + r.votes.length, 0);
        return countB - countA;
      });
      
      const enrichedDishes = sortedDishes.map(dish => {
        const totalVotes = dish.recipes.reduce((sum, r) => sum + r.votes.length, 0);
        let recipes = dish.recipes.map(r => ({
          ...r,
          _count: { votes: r.votes.length, comments: r.comments ? r.comments.length : 0 }
        }));
        if (recipes.length === 0) {
          const defaultRecipe = {
            id: null,
            title: `${dish.name.trim()} (Default)`,
            instructions: dish.instructions || 'No instructions available.',
            ingredients: dish.ingredients || 'No ingredients available.',
            user: { id: null, username: 'System' },
            _count: { votes: 0, comments: 0 },
            createdAt: new Date()
          };
          recipes = [defaultRecipe];
        }
        
        const { instructions, ingredients, ...cleanDish } = dish;
        return { ...cleanDish, recipes, totalVotes };
      });
      const total = await prisma.dish.count({ where });
      return res.json({
        dishes: enrichedDishes,
        pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) }
      });
    } else {
      
      const dishes = await prisma.dish.findMany({
        where,
        select: {
          idMeal: true,
          name: true,
          category: true,
          area: true,
          instructions: true,
          ingredients: true,
          tags: true,
          thumb_file: true,
          youtube: true,
          recipes: {
            include: {
              user: { select: { id: true, username: true } },
              _count: { select: { votes: true, comments: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit)
          }
        },
        skip,
        take: parseInt(limit),
        orderBy
      });

      const enrichedDishes = dishes.map(dish => {
        if (dish.recipes.length === 0) {
          const defaultRecipe = {
            id: null,
            title: `${dish.name.trim()} (Default)`,
            instructions: dish.instructions || 'No instructions available.',
            ingredients: dish.ingredients || 'No ingredients available.',
            user: { id: null, username: 'System' },
            _count: { votes: 0, comments: 0 },
            createdAt: new Date()
          };
         
          const { instructions, ingredients, ...cleanDish } = dish;
          return { ...cleanDish, recipes: [defaultRecipe] };
        } else {
         
          const { instructions, ingredients, ...cleanDish } = dish;
          return { ...cleanDish, recipes: dish.recipes };
        }
      }).sort((a, b) => a.name.trim().localeCompare(b.name.trim())); 

      const total = await prisma.dish.count({ where });
      res.json({
        dishes: enrichedDishes,
        pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) }
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.get('/api/recipes', async (req, res) => {
  try {
    const { dishId, limit = 50, page = 1, sortBy = 'createdAt_desc' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = dishId ? { dishId } : {};

    let orderBy;
    switch (sortBy) {
      case 'votes_desc':
        orderBy = { votes: { _count: 'desc' } };
        break;
      case 'votes_asc':
        orderBy = { votes: { _count: 'asc' } };
        break;
      case 'createdAt_desc':
      default:
        orderBy = { createdAt: 'desc' };
        break;
    }

    const recipes = await prisma.recipe.findMany({
      where,
      include: {
        user: { select: { id: true, username: true } },
        dish: { select: { name: true, thumb_file: true } },
        _count: { select: { votes: true, comments: true } }
      },
      orderBy,
      skip,
      take: parseInt(limit)
    });

    const total = await prisma.recipe.count({ where });

    res.json({
      recipes,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.get('/api/recipes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const recipe = await prisma.recipe.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: { select: { id: true, username: true } },
        dish: { select: { name: true, thumb_file: true } },
        votes: { include: { user: { select: { id: true } } } },
        comments: {
          include: { user: { select: { id: true, username: true } } },
          orderBy: { createdAt: 'asc' }
        }
      }
    });
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
    res.json(recipe);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.post('/api/recipes', authMiddleware, async (req, res) => {
  try {
    const { error } = recipeSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const { dishId, title, instructions, ingredients } = req.body;
    const dish = await prisma.dish.findUnique({ where: { idMeal: dishId } });
    if (!dish) return res.status(404).json({ error: 'Dish not found' });
    const recipe = await prisma.recipe.create({
      data: {
        dishId,
        title,
        instructions,
        ingredients,
        userId: req.user.id
      },
      include: {
        user: { select: { id: true, username: true } },
        dish: { select: { name: true, thumb_file: true } }
      }
    });
    res.status(201).json(recipe);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.put('/api/recipes/:id', authMiddleware, async (req, res, next) => {
  const canAccess = await canAccessResource(req, res, 'recipe', req.params.id);
  if (canAccess !== true) return;  
  next();
}, async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = updateRecipeSchema.validate(req.body, { allowUnknown: true, stripUnknown: true });
    if (error) return res.status(400).json({ error: error.details[0].message });
    const { dishId, title, instructions, ingredients } = req.body;
    const recipe = await prisma.recipe.update({
      where: { id: parseInt(id) },
      data: { dishId: dishId || undefined, title, instructions, ingredients },  
      include: {
        user: { select: { id: true, username: true } },
        dish: { select: { name: true, thumb_file: true } }
      }
    });
    res.json(recipe);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.delete('/api/recipes/:id', authMiddleware, async (req, res, next) => {
  const canAccess = await canAccessResource(req, res, 'recipe', req.params.id);
  if (canAccess !== true) return;
  next();
}, async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.vote.deleteMany({ where: { recipeId: parseInt(id) } });
    await prisma.comment.deleteMany({ where: { recipeId: parseInt(id) } });
    await prisma.recipe.delete({ where: { id: parseInt(id) } });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.post('/api/votes', authMiddleware, async (req, res) => {
  try {
    const { error } = voteSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const { recipeId, type } = req.body;
    const recipe = await prisma.recipe.findUnique({ where: { id: recipeId } });
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
    
    await prisma.vote.deleteMany({ where: { recipeId, userId: req.user.id } });
    if (type !== 'NONE') {
      await prisma.vote.create({ data: { recipeId, userId: req.user.id, type } });
    }
    const updatedRecipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
      include: { _count: { select: { votes: true } } }
    });
    res.json({ voteCount: updatedRecipe._count.votes, type }); 
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.post('/api/comments', authMiddleware, async (req, res) => {
  try {
    const { error } = commentSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const { recipeId, text } = req.body;
    const recipe = await prisma.recipe.findUnique({ where: { id: recipeId } });
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
    const comment = await prisma.comment.create({
      data: { recipeId, userId: req.user.id, text },
      include: { user: { select: { id: true, username: true } } }
    });
    res.status(201).json(comment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.get('/api/recipes/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const comments = await prisma.comment.findMany({
      where: { recipeId: parseInt(id) },
      include: { user: { select: { id: true, username: true } } },
      orderBy: { createdAt: 'asc' }
    });
    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.delete('/api/comments/:id', authMiddleware, async (req, res, next) => {
  const canAccess = await canAccessResource(req, res, 'comment', req.params.id);
  if (canAccess !== true) return;
  next();
}, async (req, res) => {
  try {
    const { id } = req.params;
    const comment = await prisma.comment.findUnique({ where: { id: parseInt(id) } });
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    await prisma.comment.delete({ where: { id: parseInt(id) } });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.delete('/api/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }
    
    await prisma.vote.deleteMany({ where: { userId: parseInt(id) } });
    await prisma.comment.deleteMany({ where: { userId: parseInt(id) } });
    await prisma.recipe.deleteMany({ where: { userId: parseInt(id) } });
    await prisma.user.delete({ where: { id: parseInt(id) } });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});