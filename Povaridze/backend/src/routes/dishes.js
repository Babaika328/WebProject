const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authMiddleware');
const { PrismaClient } = require('@prisma/client');

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
        { category: { not: null, contains: searchTerm } },
        { area: { not: null, contains: searchTerm } },
        { tags: { not: null, contains: searchTerm } }
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

    const enrichedDishes = dishes.map(dish => {
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
      return { ...cleanDish, recipes };
    });

    res.json({
      dishes: enrichedDishes,
      pagination: {
        total,
        pages,
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (err) {
    console.error('Error fetching dishes:', err);
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
            _count: { select: { votes: true, comments: true } }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!dish) {
      return res.status(404).json({ error: 'Dish not found' });
    }

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
    console.error('Error fetching dish:', err);
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
    console.error('Error fetching categories:', err);
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
    console.error('Error fetching areas:', err);
    res.status(500).json({ error: 'Failed to load areas' });
  }
});

router.post('/recipes', authMiddleware, async (req, res) => {
  const { dishId, title, instructions, ingredients } = req.body;

  if (!dishId || !title) {
    return res.status(400).json({ error: 'dishId and title are required' });
  }

  try {
    const dish = await prisma.dish.findUnique({ where: { idMeal: dishId } });
    if (!dish) return res.status(404).json({ error: 'Dish not found' });

    const recipe = await prisma.recipe.create({
      data: {
        userId: req.user.id,
        dishId,
        title,
        instructions,
        ingredients: JSON.stringify(ingredients || [])
      }
    });

    res.json(recipe);
  } catch (err) {
    console.error('Error creating recipe:', err);
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
    console.error('Error fetching recipes:', err);
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
    console.error('Error fetching recipe:', err);
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
    console.error('Error adding comment:', err);
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
    console.error('Error voting:', err);
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
    console.error('Error removing vote:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;