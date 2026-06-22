import Recipe from '../models/Recipe.js'
import RecipeController from './RecipeController.js'
import { load } from 'cheerio'
import { recipeSites } from '../data/offlineWebRecipes.js'

export default class AiController {
  static extractJson(text) {
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []
    try {
      return JSON.parse(jsonMatch[0])
    } catch (e) {
      console.error('Erro ao fazer parse JSON:', e)
      return []
    }
  }

  static findFirstUrl(text) {
    if (!text) return null
    const urlRegex = /https?:\/\/[^\s]+/
    const match = text.match(urlRegex)
    return match ? match[0] : null
  }

  static async getAiRecipeSuggestions(req, res) {
    try {
      const { type } = req.query
      const userId = req.session.userId

      // Get user's existing recipe titles
      const userRecipes = await Recipe.findAll({
        where: { UserId: userId },
        attributes: ['title']
      })
      const userTitles = userRecipes.map(r => AiController.normalizeTitle(r.title))

      // Build prompt requesting link field
      const prompt = `Forneça 5 sugestões de receitas em JSON com os seguintes campos:
- title: nome da receita
- category: categoria (Pratos Principais, Acompanhamentos, Doces, Bebidas, etc)
- ingredients: array com objetos {quantity: "quantidade", unit: "unidade", ingredient: "ingrediente"}
- preparation: modo de preparo em um parágrafo
- link: (opcional) URL da fonte da receita

Tema: ${type || 'receitas variadas'}

Responda APENAS com um array JSON válido, sem texto adicional.`

      // Decide how to obtain suggestions depending on configured provider.
      const provider = process.env.AI_PROVIDER || 'web'
      let recipes = []
      let sourceText = ''

      if (provider === 'web') {
        // "web" provider: perform a live search on configured sites in data/offlineWebRecipes.js
        // Use site.searchUrl with the `{query}` placeholder to run searches.
        const maxPerSite = 5
        const maxTotal = parseInt(process.env.AI_SUGGESTION_COUNT || '5', 10)

        const normalizeText = (value) => String(value || '').replace(/\s+/g, ' ').trim()

        const resolveUrl = (base, href) => {
          try {
            return new URL(href, base).href
          } catch {
            return null
          }
        }

        const collectTextValues = ($, selector) => {
          const results = []
          $(selector).each((_, element) => {
            const text = normalizeText($(element).text())
            if (text) results.push(text)
          })
          return results
        }

        const parseIngredientText = (text) => {
          const raw = normalizeText(text)
          if (!raw) return null

          const quantityMatch = raw.match(/^([\d.,\/]+)\s+/)
          let quantity = ''
          let rest = raw

          if (quantityMatch) {
            quantity = quantityMatch[1].replace(/,/g, '.')
            rest = raw.slice(quantityMatch[0].length).trim()
          }

          const [firstToken, secondToken, ...remaining] = rest.split(' ')
          const unitCandidates = [
            'un', 'unidade', 'unidades', 'g', 'kg', 'mg', 'ml', 'l', 'litro', 'litros',
            'colher', 'colheres', 'xícara', 'xícaras', 'copo', 'copos', 'fatia', 'fatias',
            'dente', 'dentes', 'pitada', 'mesa', 'sopa', 'chá', 'pedaço', 'pedaços'
          ]

          let unit = ''
          let ingredient = rest

          if (quantity && firstToken && unitCandidates.includes(firstToken.toLowerCase().replace(/\W/g, ''))) {
            unit = firstToken
            ingredient = remaining.join(' ').replace(/^de\s+/i, '').trim()
          } else if (quantity && secondToken && unitCandidates.includes(secondToken.toLowerCase().replace(/\W/g, ''))) {
            unit = `${firstToken} ${secondToken}`
            ingredient = remaining.join(' ').replace(/^de\s+/i, '').trim()
          }

          if (!ingredient) ingredient = rest

          return { quantity, unit, ingredient }
        }

        const extractRecipeLinks = (site, html) => {
          const $ = load(html)
          const urls = new Set()
          const allowedHost = new URL(site.url).hostname.toLowerCase()

          $('a[href]').each((_, element) => {
            const href = $(element).attr('href')
            const url = resolveUrl(site.url, href)
            if (!url) return

            try {
              const parsed = new URL(url)
              if (parsed.hostname.toLowerCase() !== allowedHost) return
              const pathname = parsed.pathname.toLowerCase()
              if (pathname === '/' || pathname === '') return
              if (/receita|receitas|prato|comida|sobremesa|entrada|massa|bebida/.test(pathname)) {
                urls.add(parsed.href)
              }
            } catch {
              return
            }
          })

          if (urls.size > 0) return Array.from(urls)

          $('a[href]').each((_, element) => {
            const href = $(element).attr('href')
            const url = resolveUrl(site.url, href)
            if (!url) return

            try {
              const parsed = new URL(url)
              if (parsed.hostname.toLowerCase() !== allowedHost) return
              if (parsed.pathname.toLowerCase().length > 10) urls.add(parsed.href)
            } catch {
              return
            }
          })

          return Array.from(urls)
        }

        const extractRecipeData = (pageUrl, html) => {
          const $ = load(html)
          const title = normalizeText($('h1').first().text() || $('title').first().text())
          const image = normalizeText(
            $('meta[property="og:image"]').attr('content') ||
            $('meta[name="twitter:image"]').attr('content') ||
            $('img[src]').first().attr('src') || ''
          )
          const imageUrl = image ? resolveUrl(pageUrl, image) : ''

          const ingredientTexts = [
            ...collectTextValues($, '.ingredientes li'),
            ...collectTextValues($, '.recipe-ingredientes li'),
            ...collectTextValues($, '.ingredients li'),
            ...collectTextValues($, '.ingredient-list li'),
            ...collectTextValues($, '.recipe-item-ingredient'),
            ...collectTextValues($, '.recipe-ingredient'),
            ...collectTextValues($, '.ingredient')
          ]

          const preparationTexts = [
            ...collectTextValues($, '.modo-preparo p'),
            ...collectTextValues($, '.preparo p'),
            ...collectTextValues($, '.instructions p'),
            ...collectTextValues($, '.modo-de-preparo p'),
            ...collectTextValues($, '.recipe-method p')
          ]

          if (!ingredientTexts.length) {
            const possible = collectTextValues($, 'li')
            possible.forEach((text) => {
              if (/\b(?:xícara|colher|g|kg|ml|unidade|dente|pitada|fatias|pedaço)\b/i.test(text)) {
                ingredientTexts.push(text)
              }
            })
          }

          if (!preparationTexts.length) {
            const possible = collectTextValues($, 'p')
            preparationTexts.push(...possible.filter(text => text.length > 80))
          }

          const ingredients = ingredientTexts.map(parseIngredientText).filter(Boolean).slice(0, 30)
          const preparation = preparationTexts.join(' ').trim()

          return {
            title,
            category: '',
            ingredients,
            preparation,
            image: imageUrl,
            link: pageUrl
          }
        }

        const fetchHtml = async (url) => {
          const resp = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0 Safari/537.36' }
          })
          if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${url}`)
          return resp.text()
        }

        const found = []
        for (const site of recipeSites) {
          if (found.length >= maxTotal) break
          try {
            const searchUrl = site.searchUrl.replace('{query}', encodeURIComponent(type || ''))
            const searchHtml = await fetchHtml(searchUrl)
            const candidateLinks = extractRecipeLinks(site, searchHtml)
            for (const link of candidateLinks.slice(0, maxPerSite)) {
              if (found.length >= maxTotal) break
              try {
                const pageHtml = await fetchHtml(link)
                const recipe = extractRecipeData(link, pageHtml)
                if (recipe.title && recipe.ingredients.length && recipe.preparation) {
                  found.push(recipe)
                }
              } catch (err) {
                continue
              }
            }
          } catch (err) {
            continue
          }
        }

        if (found.length) {
          recipes = found.slice(0, maxTotal)
          sourceText = JSON.stringify(recipes)
        } else {
          // fallback to bundled JSON if scraping failed
          recipes = await RecipeController.getWebSuggestions(type || '', maxTotal)
          sourceText = JSON.stringify(recipes)
        }
      } else {
        // For real AI providers, build the prompt and call the model.
        const response = await RecipeController.callAiModel(prompt, { maxResults: 5 })
        sourceText = response
        if (Array.isArray(response)) {
          recipes = response
        } else {
          recipes = AiController.extractJson(response)
        }
      }
      
      // Ensure fields are present and provide sensible fallbacks (including image)
      recipes = recipes.map(r => ({
        title: r.title || '',
        category: r.category || 'Pratos Principais',
        ingredients: r.ingredients || [],
        preparation: r.preparation || '',
        image: r.image || r.img || '/img/recipes/recipe-default.webp',
        link: r.link || r.url || r.source || AiController.findFirstUrl(sourceText) || null
      }))

      // Filter out user's existing recipes
      const filteredRecipes = recipes.filter(r => {
        const normalizedTitle = AiController.normalizeTitle(r.title)
        return !userTitles.includes(normalizedTitle)
      })

      // Shuffle recipes for random display
      const shuffledRecipes = RecipeController.shuffleArray(filteredRecipes)

      res.json(shuffledRecipes)
    } catch (error) {
      console.error('Erro em getAiRecipeSuggestions:', error)
      res.status(500).json({ message: 'Erro ao buscar sugestões de IA' })
    }
  }

  static async getUserRecipeTitles(req, res) {
    try {
      const userId = req.session.userId
      const recipes = await Recipe.findAll({
        where: { UserId: userId },
        attributes: ['title']
      })

      const titles = recipes.map(r => AiController.normalizeTitle(r.title))
      res.json(titles)
    } catch (error) {
      console.error('Erro em getUserRecipeTitles:', error)
      res.status(500).json({ message: 'Erro ao buscar títulos de receitas' })
    }
  }

  static normalizeTitle(title) {
    return RecipeController.normalizeTitle(title)
  }

  static callAiModel(prompt, opts = {}) {
    return RecipeController.callAiModel(prompt, opts)
  }
}
