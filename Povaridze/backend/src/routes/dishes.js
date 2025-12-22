const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authMiddleware');
const { PrismaClient } = require('@prisma/client');
const upload = require('../middlewares/uploadMiddleware');

const prisma = new PrismaClient();

router.get('/dishes', async (req, res) => {
  const { search, category, area, page = 1, limit = 12 } = req.query;

  try {
    const where = {};

    if (category && category.trim() !== '') {
      where.category = category.trim();
    }
    if (area && area.trim() !== '') {
      where.area = area.trim();
    }
    if (search && search.trim() !== '') {
      const searchTerm = search.trim();
      where.OR = [
        { name: { contains: searchTerm } },
        { category: { contains: searchTerm } },
        { area: { contains: searchTerm } },
        { tags: { contains: searchTerm } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [dishes, total] = await Promise.all([
      prisma.dish.findMany({
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
              votes: true,
              _count: { select: { votes: true, comments: true } }
            },
            orderBy: { createdAt: 'desc' }
          }
        },
        skip,
        take: parseInt(limit),
        orderBy: { name: 'asc' }
      }),
      prisma.dish.count({ where })
    ]);

    const pages = Math.ceil(total / parseInt(limit));

    res.json({
      dishes,
      pagination: {
        total,
        pages,
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load dishes' });
  }
});

router.get('/dishes/:idMeal', async (req, res) => {
  const { idMeal } = req.params;

  try {
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
            votes: true,
            _count: { select: { votes: true, comments: true } }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!dish) return res.status(404).json({ error: 'Dish not found' });

    res.json(dish);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load dish' });
  }
});

router.get('/categories', async (req, res) => {
  try {
    const categories = await prisma.dish.findMany({
      select: { category: true },
      distinct: ['category'],
      where: { category: { not: null } },
      orderBy: { category: 'asc' }
    });
    res.json(categories.map(c => c.category).filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: 'Failed to load categories' });
  }
});

router.get('/areas', async (req, res) => {
  try {
    const areas = await prisma.dish.findMany({
      select: { area: true },
      distinct: ['area'],
      where: { area: { not: null } },
      orderBy: { area: 'asc' }
    });
    res.json(areas.map(a => a.area).filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: 'Failed to load areas' });
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
    res.status(500).json({ error: err.message });
  }
});

router.post('/recipes', authMiddleware, upload.single('image'), async (req, res) => {
  const { dishId, title, instructions, ingredients, youtube } = req.body;
  if (!dishId || !title) {
    return res.status(400).json({ error: 'dishId and title are required' });
  }
  try {
    const dish = await prisma.dish.findUnique({ where: { idMeal: dishId } });
    if (!dish) return res.status(404).json({ error: 'Dish not found' });

    let ingredientsStr = '';
    if (ingredients) {
      if (typeof ingredients === 'string') {
        try {
          const arr = JSON.parse(ingredients);
          ingredientsStr = Array.isArray(arr) ? arr.join('\n') : ingredients;
        } catch {
          ingredientsStr = ingredients;
        }
      }
    }

    const recipe = await prisma.recipe.create({
      data: {
        userId: req.user.id,
        dishId,
        title: title.trim(),
        instructions: instructions?.trim() || null,
        ingredients: ingredientsStr,
        youtube: youtube?.trim() || null,
        image: req.file ? req.file.filename : null
      },
      include: {
        user: { select: { id: true, username: true } },
        dish: { select: { name: true, thumb_file: true } },
        votes: true,
        _count: { select: { votes: true, comments: true } }
      }
    });

    res.status(201).json(recipe);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/recipes', async (req, res) => {
  try {
    const recipes = await prisma.recipe.findMany({
      include: {
        dish: true,
        user: { select: { username: true, profilePicture: true } },
        comments: {
          include: { user: { select: { username: true, profilePicture: true } } },
          orderBy: { createdAt: 'desc' }
        },
        votes: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const recipesWithVotes = recipes.map(recipe => ({
      ...recipe,
      upvotes: recipe.votes.filter(v => v.type === 'UP').length,
      downvotes: recipe.votes.filter(v => v.type === 'DOWN').length
    }));

    res.json(recipesWithVotes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/recipes/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const recipe = await prisma.recipe.findUnique({
      where: { id: parseInt(id) },
      include: {
        dish: true,
        user: { select: { username: true, profilePicture: true } },
        comments: {
          include: { user: { select: { username: true, profilePicture: true } } },
          orderBy: { createdAt: 'desc' }
        },
        votes: true
      }
    });

    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });

    res.json({
      ...recipe,
      upvotes: recipe.votes.filter(v => v.type === 'UP').length,
      downvotes: recipe.votes.filter(v => v.type === 'DOWN').length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/recipes/:id/comments', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Text required' });

  try {
    const comment = await prisma.comment.create({
      data: {
        recipeId: parseInt(id),
        userId: req.user.id,
        text
      },
      include: { user: { select: { username: true, profilePicture: true } } }
    });

    res.json(comment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/recipes/:id/vote', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { type } = req.body;
  if (!['UP', 'DOWN'].includes(type)) return res.status(400).json({ error: 'Invalid type' });

  try {
    await prisma.vote.deleteMany({
      where: { recipeId: parseInt(id), userId: req.user.id }
    });

    const vote = await prisma.vote.create({
      data: {
        recipeId: parseInt(id),
        userId: req.user.id,
        type
      }
    });

    res.json(vote);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/recipes/:id/vote', authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.vote.deleteMany({
      where: { recipeId: parseInt(id), userId: req.user.id }
    });

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/recipes/:id', authMiddleware, upload.single('image'), async (req, res) => {
  const { id } = req.params;
  const { title, instructions, ingredients, youtube } = req.body;

  try {
    const recipe = await prisma.recipe.findUnique({
      where: { id: parseInt(id) },
      include: { user: true }
    });

    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });

    const isAuthor = recipe.userId === req.user.id;
    const isAdmin = ['ADMIN', 'SUPERADMIN'].includes(req.user.role);

    if (!isAuthor && !isAdmin) return res.status(403).json({ error: 'Access denied' });

    let newIngredients = recipe.ingredients || '';

    if (ingredients) {
      if (typeof ingredients === 'string') {
        try {
          const arr = JSON.parse(ingredients);
          if (Array.isArray(arr)) {
            newIngredients = arr.join('\n');
          } else {
            newIngredients = ingredients;
          }
        } catch {
          newIngredients = ingredients;
        }
      }
    }

    const updateData = {
      title: title?.trim() || recipe.title,
      instructions: instructions?.trim() || recipe.instructions,
      ingredients: newIngredients,
      youtube: youtube?.trim() || recipe.youtube
    };

    if (req.file) {
      updateData.image = req.file.filename;
    }

    const updated = await prisma.recipe.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        user: { select: { username: true, profilePicture: true } },
        dish: true,
        votes: true,
        comments: {
          include: { user: { select: { username: true, profilePicture: true } } },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    res.json({
      ...updated,
      upvotes: updated.votes.filter(v => v.type === 'UP').length,
      downvotes: updated.votes.filter(v => v.type === 'DOWN').length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/recipes/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const recipe = await prisma.recipe.findUnique({
      where: { id: parseInt(id) },
      include: { user: true }
    });

    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });

    const isAuthor = recipe.userId === req.user.id;
    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPERADMIN';

    if (!isAuthor && !isAdmin) return res.status(403).json({ error: 'Access denied' });

    await prisma.vote.deleteMany({ where: { recipeId: parseInt(id) } });
    await prisma.comment.deleteMany({ where: { recipeId: parseInt(id) } });
    await prisma.recipe.delete({ where: { id: parseInt(id) } });

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/comments/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const comment = await prisma.comment.findUnique({
      where: { id: parseInt(id) },
      include: { user: true }
    });

    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    const isAuthor = comment.userId === req.user.id;
    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPERADMIN';

    if (!isAuthor && !isAdmin) return res.status(403).json({ error: 'Access denied' });

    await prisma.comment.delete({ where: { id: parseInt(id) } });

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;