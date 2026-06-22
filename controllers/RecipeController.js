import Recipe from '../models/Recipe.js'
import ShoppingList from '../models/ShoppingList.js'
import { Op } from 'sequelize'
import { getOfflineRecipes, getFeaturedOfflineRecipes } from '../data/offlineRecipes.js'
import sharp from 'sharp'
import fs from 'fs/promises'
import path from 'path'
import { execFile } from 'child_process'

export default class RecipeController {
  static normalizeTitle(title) {
    if (!title) return ''
    try {
      return String(title)
        .normalize('NFD')
        .replace(/[\u0000-\u007F]/g, (c) => c) // keep ASCII (noop)
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim()
    } catch (e) {
      // Fallback for environments without \p{Diacritic}
      return String(title)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim()
    }
  }

  static async loadOfflineRecipesFromJson() {
    try {
      const filePath = path.resolve('data', 'offlineWebRecipes.json')
      const content = await fs.readFile(filePath, 'utf8')
      const recipes = JSON.parse(content)
      return Array.isArray(recipes) ? recipes : []
    } catch (error) {
      console.error('Erro ao ler data/offlineWebRecipes.json:', error.message)
      return []
    }
  }

  static async getWebSuggestions(type = '', count = 8) {
    const recipes = await RecipeController.loadOfflineRecipesFromJson()
    const normalizedType = String(type || '').trim().toLowerCase()
    const filtered = normalizedType
      ? recipes.filter(recipe => {
          const text = `${recipe.title || ''} ${recipe.category || ''} ${recipe.preparation || ''} ${Array.isArray(recipe.ingredients) ? recipe.ingredients.map(i => i.ingredient).join(' ') : ''}`.toLowerCase()
          return text.includes(normalizedType)
        })
      : recipes

    if (!filtered.length) {
      return RecipeController.shuffleArray(recipes).slice(0, count)
    }

    return RecipeController.shuffleArray(filtered).slice(0, count)
  }

  static shuffleArray(array) {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  static async ensureOfflineRecipesJson(minCount = 8) {
    const currentRecipes = await RecipeController.loadOfflineRecipesFromJson()
    if (currentRecipes.length >= minCount) {
      return RecipeController.shuffleArray(currentRecipes)
    }

    try {
      console.log(`Offline recipes below ${minCount}; extracting pratos tradicionais...`)
      await RecipeController.runExtractOfflineRecipes('pratos tradicionais')
      const updatedRecipes = await RecipeController.loadOfflineRecipesFromJson()
      return RecipeController.shuffleArray(updatedRecipes)
    } catch (error) {
      console.error('Erro ao garantir receitas offline suficientes:', error)
      return RecipeController.shuffleArray(currentRecipes)
    }
  }

  static runExtractOfflineRecipes(term) {
    return new Promise((resolve, reject) => {
      const scriptPath = path.resolve('scripts', 'extract-offline-recipes.js')
      const args = term ? [term] : []
      execFile(
        process.execPath,
        [scriptPath, ...args],
        { cwd: process.cwd(), windowsHide: true },
        (error, stdout, stderr) => {
          if (error) {
            reject(error)
          } else {
            resolve(stdout)
          }
        }
      )
    })
  }

  static async callAiModel(prompt, opts = {}) {
    const provider = process.env.AI_PROVIDER || 'web'

    if (provider === 'openai') {
      return RecipeController.callOpenAi(prompt, opts)
    } else if (provider === 'gemini') {
      return RecipeController.callGemini(prompt, opts)
    } else {
      return RecipeController.getWebSuggestions(prompt, opts.maxResults || 8)
    }
  }

  static async callOpenAi(prompt, opts = {}) {
    const apiKey = process.env.OPENAI_API_KEY
    const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo'

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY não configurada')
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: opts.max_tokens || 500
      })
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(`OpenAI error: ${err.error?.message || response.statusText}`)
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || ''
  }

  static async callGemini(prompt, opts = {}) {
    const apiKey = process.env.GEMINI_API_KEY
    const apiUrl = process.env.GEMINI_API_URL

    if (!apiKey || !apiUrl) {
      throw new Error('GEMINI_API_KEY ou GEMINI_API_URL não configurada')
    }

    const response = await fetch(`${apiUrl}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(`Gemini error: ${err.error?.message || response.statusText}`)
    }

    const data = await response.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  }

  static async listRecipes(req, res) {
    try {
      const userId = req.session.userId
      const recipes = await Recipe.findAll({
        where: { UserId: userId },
      })

      const groupedCategories = {}
      recipes.forEach(recipe => {
        const recipeData = recipe.get({ plain: true })

        let ingredientsJson = []
        try {
          ingredientsJson = Array.isArray(recipeData.ingredients)
            ? recipeData.ingredients
            : JSON.parse(recipeData.ingredients || '[]')
        } catch (err) {
          ingredientsJson = []
        }

        const recipeWithIngredients = {
          ...recipeData,
          ingredientsJson: JSON.stringify(ingredientsJson)
        }

        if (!groupedCategories[recipeData.category]) {
          groupedCategories[recipeData.category] = []
        }
        groupedCategories[recipeData.category].push(recipeWithIngredients)
      })

      const categoriesArray = Object.keys(groupedCategories)
        .sort()
        .map(category => ({
          category,
          recipes: groupedCategories[category]
        }))

      const aiSuggestions = await RecipeController.ensureOfflineRecipesJson()
      const aiSuggestionsRaw = JSON.stringify(aiSuggestions)

      res.render('recipes/home', {
        groupedCategories: categoriesArray,
        aiSuggestions,
        aiSuggestionsRaw
      })
    } catch (error) {
      console.error('Erro em listRecipes:', error)
      res.status(500).render('error', { message: 'Erro ao listar receitas' })
    }
  }

  static async createRecipe(req, res) {
    try {
      const recipe = { ingredientRows: [{}] }
      res.render('recipes/create', { recipe })
    } catch (error) {
      console.error('Erro em createRecipe:', error)
      res.status(500).render('error', { message: 'Erro ao abrir formulário' })
    }
  }

  static buildShoppingKey(item) {
    return `${item.name.trim().toLowerCase()}|${(item.unit || '').trim().toLowerCase()}`
  }

  static normalizeShoppingItem(item) {
    return {
      name: String(item.name || '').trim(),
      quantity: String(item.quantity || '').trim() || '1',
      unit: String(item.unit || '').trim(),
      origin: String(item.origin || 'Receita').trim(),
      status: item.status === 'bought' ? 'bought' : 'pending'
    }
  }

  static async findShoppingListItems(userId) {
    return ShoppingList.findAll({
      where: { UserId: userId },
      order: [['id', 'ASC']]
    })
  }

  static async shoppingList(req, res) {
    try {
      const userId = req.session.userId
      const items = await RecipeController.findShoppingListItems(userId)
      const shoppingListItems = items.map(item => item.get({ plain: true }))

      res.render('recipes/shopping-list', {
        shoppingListItems,
        shoppingListItemsRaw: JSON.stringify(shoppingListItems)
      })
    } catch (error) {
      console.error('Erro em shoppingList:', error)
      res.status(500).render('error', { message: 'Erro ao abrir a lista de compras' })
    }
  }

  static async upsertShoppingListItem(userId, rawItem) {
    const item = RecipeController.normalizeShoppingItem(rawItem)
    if (!item.name) {
      throw new Error('Nome do ingrediente é obrigatório.')
    }

    const existing = await ShoppingList.findOne({
      where: {
        UserId: userId,
        name: item.name,
        unit: item.unit
      }
    })

    if (existing) {
      const existingQuantity = Number(existing.quantity)
      const newQuantity = Number(item.quantity)
      existing.quantity = Number.isFinite(existingQuantity) && Number.isFinite(newQuantity)
        ? String(existingQuantity + newQuantity)
        : item.quantity
      if (!existing.origin.includes(item.origin)) {
        existing.origin = `${existing.origin}, ${item.origin}`
      }
      await existing.save()
      return existing
    }

    return ShoppingList.create({
      ...item,
      UserId: userId
    })
  }

  static async addShoppingListItem(req, res) {
    try {
      const userId = req.session.userId
      const item = req.body
      const created = await RecipeController.upsertShoppingListItem(userId, item)
      return res.json(created)
    } catch (error) {
      console.error('Erro em addShoppingListItem:', error)
      return res.status(500).json({ message: error.message || 'Erro ao adicionar item à lista de compras.' })
    }
  }

  static async addShoppingListFromRecipe(req, res) {
    try {
      const userId = req.session.userId
      const items = Array.isArray(req.body) ? req.body : req.body.ingredients || []
      const normalizedItems = items
        .map(RecipeController.normalizeShoppingItem)
        .filter(item => item.name)

      if (!normalizedItems.length) {
        return res.status(400).json({ message: 'Receita sem ingredientes válidos.' })
      }

      for (const item of normalizedItems) {
        await RecipeController.upsertShoppingListItem(userId, item)
      }

      const updatedItems = await RecipeController.findShoppingListItems(userId)
      return res.json(updatedItems.map(item => item.get({ plain: true })))
    } catch (error) {
      console.error('Erro em addShoppingListFromRecipe:', error)
      return res.status(500).json({ message: 'Erro ao adicionar ingredientes da receita.' })
    }
  }

  static async getShoppingListItems(req, res) {
    try {
      const userId = req.session.userId
      const items = await RecipeController.findShoppingListItems(userId)
      return res.json(items.map(item => item.get({ plain: true })))
    } catch (error) {
      console.error('Erro em getShoppingListItems:', error)
      return res.status(500).json({ message: 'Erro ao buscar itens da lista de compras.' })
    }
  }

  static async updateShoppingListItem(req, res) {
    try {
      const userId = req.session.userId
      const { id } = req.params
      const item = await ShoppingList.findOne({ where: { id, UserId: userId } })

      if (!item) {
        return res.status(404).json({ message: 'Item não encontrado.' })
      }

      const updated = RecipeController.normalizeShoppingItem({
        ...item.get({ plain: true }),
        ...req.body
      })

      item.name = updated.name
      item.quantity = updated.quantity
      item.unit = updated.unit
      item.origin = updated.origin
      item.status = updated.status
      await item.save()

      return res.json(item)
    } catch (error) {
      console.error('Erro em updateShoppingListItem:', error)
      return res.status(500).json({ message: 'Erro ao atualizar item da lista de compras.' })
    }
  }

  static async deleteShoppingListItem(req, res) {
    try {
      const userId = req.session.userId
      const { id } = req.params
      const deleted = await ShoppingList.destroy({ where: { id, UserId: userId } })
      if (!deleted) {
        return res.status(404).json({ message: 'Item não encontrado.' })
      }
      return res.json({ success: true })
    } catch (error) {
      console.error('Erro em deleteShoppingListItem:', error)
      return res.status(500).json({ message: 'Erro ao remover item da lista de compras.' })
    }
  }

  static async clearShoppingList(req, res) {
    try {
      const userId = req.session.userId
      await ShoppingList.destroy({ where: { UserId: userId } })
      return res.json({ success: true })
    } catch (error) {
      console.error('Erro em clearShoppingList:', error)
      return res.status(500).json({ message: 'Erro ao limpar lista de compras.' })
    }
  }

  static async saveRecipe(req, res) {
    try {
      const userId = req.session.userId
      const { title, category, preparation, link } = req.body
      const quantities = Array.isArray(req.body.quantity) ? req.body.quantity : [req.body.quantity]
      const units = Array.isArray(req.body.unit) ? req.body.unit : [req.body.unit]
      const ingredientNames = Array.isArray(req.body.ingredient) ? req.body.ingredient : [req.body.ingredient]

      const ingredients = quantities
        .map((qty, idx) => ({
          quantity: qty || '',
          unit: units[idx] || '',
          ingredient: ingredientNames[idx] || ''
        }))
        .filter(ing => ing.ingredient)

      if (!ingredients.length) {
        return res.render('recipes/create', {
          recipe: req.body,
          message: 'Pelo menos um ingrediente é obrigatório.'
        })
      }

      let imageUrl = req.body.image || ''
      if (req.file) {
        imageUrl = `/img/recipes/${req.file.filename}`
      }

      const recipe = await Recipe.create({
        title,
        category,
        ingredients: JSON.stringify(ingredients),
        preparation,
        link: link || null,
        image: imageUrl,
        UserId: userId
      })

      res.redirect('/recipes')
    } catch (error) {
      console.error('Erro em saveRecipe:', error)
      res.render('recipes/create', {
        recipe: req.body,
        message: 'Erro ao salvar receita'
      })
    }
  }

  static async showRecipe(req, res) {
    try {
      const { id } = req.params
      const recipe = await Recipe.findByPk(id)

      if (!recipe) {
        return res.status(404).render('error', { message: 'Receita não encontrada' })
      }

      const recipeData = recipe.get({ plain: true })
      recipeData.ingredientRows = JSON.parse(recipeData.ingredients)
      res.render('recipes/detail', { recipe: recipeData })
    } catch (error) {
      console.error('Erro em showRecipe:', error)
      res.status(500).render('error', { message: 'Erro ao carregar receita' })
    }
  }

  static async editRecipe(req, res) {
    try {
      const { id } = req.params
      const recipe = await Recipe.findByPk(id)

      if (!recipe) {
        return res.status(404).render('error', { message: 'Receita não encontrada' })
      }

      const recipeData = recipe.get({ plain: true })
      recipeData.ingredientRows = JSON.parse(recipeData.ingredients)
      res.render('recipes/edit', { recipe: recipeData })
    } catch (error) {
      console.error('Erro em editRecipe:', error)
      res.status(500).render('error', { message: 'Erro ao editar receita' })
    }
  }

  static async updateRecipe(req, res) {
    try {
      const { id } = req.body
      const { title, category, preparation, link } = req.body
      const quantities = Array.isArray(req.body.quantity) ? req.body.quantity : [req.body.quantity]
      const units = Array.isArray(req.body.unit) ? req.body.unit : [req.body.unit]
      const ingredientNames = Array.isArray(req.body.ingredient) ? req.body.ingredient : [req.body.ingredient]

      const ingredients = quantities
        .map((qty, idx) => ({
          quantity: qty || '',
          unit: units[idx] || '',
          ingredient: ingredientNames[idx] || ''
        }))
        .filter(ing => ing.ingredient)

      if (!ingredients.length) {
        const recipe = await Recipe.findByPk(id)
        recipe.ingredientRows = JSON.parse(recipe.ingredients)
        return res.render('recipes/edit', {
          recipe,
          message: 'Pelo menos um ingrediente é obrigatório.'
        })
      }

      const recipe = await Recipe.findByPk(id)
      let imageUrl = recipe.image

      if (req.file) {
        if (recipe.image) {
          const oldPath = path.join(process.cwd(), 'public', recipe.image)
          try {
            await fs.unlink(oldPath)
          } catch (err) {
            console.warn('Erro ao deletar imagem antiga:', err)
          }
        }
        imageUrl = `/img/recipes/${req.file.filename}`
      } else if (req.body.image) {
        imageUrl = req.body.image
      }

      await recipe.update({
        title,
        category,
        ingredients: JSON.stringify(ingredients),
        preparation,
        link: link || null,
        image: imageUrl
      })

      res.redirect(`/recipes/view/${recipe.id}`)
    } catch (error) {
      console.error('Erro em updateRecipe:', error)
      res.render('recipes/edit', {
        recipe: req.body,
        message: 'Erro ao atualizar receita'
      })
    }
  }

  static async deleteRecipe(req, res) {
    try {
      const { id } = req.body
      const recipe = await Recipe.findByPk(id)

      if (!recipe) {
        return res.status(404).json({ message: 'Receita não encontrada' })
      }

      if (recipe.image) {
        const imagePath = path.join(process.cwd(), 'public', recipe.image)
        try {
          await fs.unlink(imagePath)
        } catch (err) {
          console.warn('Erro ao deletar imagem:', err)
        }
      }

      await recipe.destroy()
      res.redirect('/recipes')
    } catch (error) {
      console.error('Erro em deleteRecipe:', error)
      res.status(500).json({ message: 'Erro ao deletar receita' })
    }
  }

  static async importSuggestion(req, res) {
    try {
      const userId = req.session.userId
      const { recipe } = req.body

      if (!recipe || !recipe.title) {
        return res.status(400).json({ message: 'Dados de receita inválidos' })
      }

      const newRecipe = await Recipe.create({
        title: recipe.title,
        category: recipe.category || 'Pratos Principais',
        ingredients: JSON.stringify(recipe.ingredients || []),
        preparation: recipe.preparation || '',
        link: recipe.link || null,
        image: recipe.image || null,
        UserId: userId
      })

      res.json({ success: true, id: newRecipe.id })
    } catch (error) {
      console.error('Erro em importSuggestion:', error)
      res.status(500).json({ message: 'Erro ao importar sugestão' })
    }
  }
}
