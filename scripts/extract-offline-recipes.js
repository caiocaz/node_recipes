import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { load } from 'cheerio'
import { recipeSites } from '../data/sitesRecipes.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const query = process.argv.slice(2).join(' ') || 'receita brasileira'
const outputFile = path.resolve(__dirname, '../data', 'offlineWebRecipes.json')
const MAX_OFFLINE_RECIPES = 1000

async function loadExistingRecipes() {
  try {
    const content = await fs.readFile(outputFile, 'utf8')
    const recipes = JSON.parse(content)
    if (!Array.isArray(recipes)) return []
    return recipes.slice(-MAX_OFFLINE_RECIPES)
  } catch (error) {
    if (error.code === 'ENOENT') return []
    console.error('Erro ao carregar offlineWebRecipes.json existente:', error.message)
    return []
  }
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function resolveUrl(base, href) {
  try {
    return new URL(href, base).href
  } catch {
    return null
  }
}

function normalizeCategory(value) {
  const normalized = String(value || '').trim().toLowerCase()
  const categories = {
    'café da manhã': 'Café da Manhã',
    'cafe da manha': 'Café da Manhã',
    'cafe': 'Café da Manhã',
    'for breakfast': 'Café da Manhã',
    'entradas': 'Entradas',
    'saladas': 'Saladas',
    'sopas': 'Sopas',
    'pratos principais': 'Pratos Principais',
    'principais': 'Pratos Principais',
    'massas': 'Massas',
    'lanches': 'Lanches',
    'salgados': 'Salgados',
    'pães': 'Pães',
    'paes': 'Pães',
    'bolos e tortas': 'Bolos e Tortas',
    'sobremesas': 'Sobremesas',
    'bebidas': 'Bebidas',
    'saudáveis': 'Receitas Saudáveis',
    'saudaveis': 'Receitas Saudáveis',
    'receitas saudáveis': 'Receitas Saudáveis',
    'receitas saudaveis': 'Receitas Saudáveis',
    'receitas rápidas': 'Receitas Rápidas',
    'receitas rapidas': 'Receitas Rápidas',
    'air fryer': 'Air Fryer',
    'culinária internacional': 'Culinária Internacional',
    'culinaria internacional': 'Culinária Internacional',
    'datas especiais': 'Datas Especiais',
    'especial': 'Datas Especiais'
  }

  for (const [key, mapped] of Object.entries(categories)) {
    if (normalized.includes(key)) {
      return mapped
    }
  }

  return ''
}

function extractRecipeCategory($) {
  const candidateSelectors = [
    'meta[property="article:section"]',
    'meta[name="category"]',
    '[itemprop="recipeCategory"]',
    '.recipe-category',
    '.category',
    '.breadcrumb li:last-child',
    '.breadcrumb a:last-child',
    '.breadcrumb span:last-child',
    '.bc-item:last-child',
    '.tag',
    '.tags',
    '.tag a',
    '.tags a',
    '.recipe-info__category',
    '.recipe-data__category'
  ]

  for (const selector of candidateSelectors) {
    const element = $(selector).first()
    if (!element || !element.length) continue

    const text = normalizeText(element.attr('content') || element.text())
    if (!text) continue

    const mapped = normalizeCategory(text)
    if (mapped) return mapped
  }

  const metaKeywords = normalizeText($('meta[name="keywords"]').attr('content') || '')
  if (metaKeywords) {
    const parts = metaKeywords.split(/[,;]+/).map(item => item.trim()).filter(Boolean)
    for (const part of parts) {
      const mapped = normalizeCategory(part)
      if (mapped) return mapped
    }
  }

  return ''
}

function classifyRecipeCategory(title, ingredients, preparation) {
  const combined = [title, ingredients.join(' '), preparation].join(' ').toLowerCase()
  const includes = (pattern) => pattern.test(combined)

  if (includes(/\b(air\s?fryer|airfryer)\b/)) return 'Air Fryer'
  if (includes(/\b(natal|páscoa|pascoa|anivers[aá]rio|festa junina|reveillon|réveillon|dia dos namorados|halloween|fest[aá]|ceia|páscoa)\b/)) return 'Datas Especiais'
  if (includes(/\b(sopa|caldo|canja|creme|consom[eé]|cald[eã]|minestrone|gaspacho)\b/)) return 'Sopas'
  if (includes(/\b(salada|alface|rúcula|rúcula|tomate|folha|folhas|mix de folhas|vinagrete|agrião|couve|tomatinho|salpicão)\b/)) return 'Saladas'
  if (includes(/\b(bolo|torta|quiche|cheesecake|cupcake|brownie|pudim|mousse|sorvete|pav[eé]|brigadeiro|doces?)\b/)) {
    if (includes(/\b(bolo|torta|quiche|cheesecake|cupcake|brownie)\b/)) return 'Bolos e Tortas'
    return 'Sobremesas'
  }
  if (includes(/\b(suco|refrigerante|chá|cha|café|cafe|drink|coquetel|batida|vitamina|smoothie|milkshake|cerveja|vinho|liqueur|água de coco|água|café da manhã)\b/)) return 'Bebidas'
  if (includes(/\b(pão|pao|baguete|ciabatta|croissant|focaccia|pão de queijo|pao de queijo|broa|fatia de pão|pães|paes)\b/)) return 'Pães'
  if (includes(/\b(macarr[aã]o|massa|espaguete|penne|fettuccine|lasanha|talharim|ravioli|nhoque|rigatoni|capellini|gnochi)\b/)) return 'Massas'
  if (includes(/\b(entrada|aperitivo|petisco|canap[eé]|canapé|tábua|tabua|tapas|amuse bouche|bruschetta|voltinha)\b/)) return 'Entradas'
  if (includes(/\b(lanche|sandu[ií]che|sandubas|wrap|hamb[úu]rguer|hot[- ]dog|tapioca|beirute|biscoito|cookies|panini)\b/)) return 'Lanches'
  if (includes(/\b(salgado|coxinha|risol[eé]s?|empada|pastel|kibe|quibe|croquete|esfiha|salgados)\b/)) return 'Salgados'
  if (includes(/\b(italiana|mexicana|japonesa|chinesa|indiana|francesa|tailandesa|árabe|arabe|grega|peruana|mediterrânea|mediterranea|asiática|asiatica)\b/)) return 'Culinária Internacional'
  if (includes(/\b(café da manhã|cafe da manha|panqueca|panqueca|waffle|omelete|omeleta|crepioca|granola|iogurte|muesli|vitamina matinal|breakfast)\b/)) return 'Café da Manhã'
  if (includes(/\b(integral|saud[aá]vel|dieta|vegano|vegetariano|vegetariana|low carb|lowcarb|light|fit|sem gl[uú]ten|sem lactose|sem lactose)\b/)) return 'Receitas Saudáveis'
  if (includes(/\b(rápida|rapida|fácil|facil|5 minutos|10 minutos|15 minutos|20 minutos|30 minutos|pronto em|preparo rápido|preparo rapido)\b/)) return 'Receitas Rápidas'
  if (includes(/\b(frango|carne|peixe|bife|costela|moqueca|feijoada|arroz|feij[ãa]o|escondidinho|picanha|estrogonofe|strogonoff|assado|grelhado|ensopado|cozido|panela|prato principal|prato principal)\b/)) return 'Pratos Principais'

  return 'Pratos Principais'
}

function parseIngredientText(text) {
  const raw = normalizeText(text)
  if (!raw) return null

  const quantityMatch = raw.match(/^([\d.,/]+)\s+/)
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

  return {
    quantity,
    unit,
    ingredient
  }
}

function collectTextValues($, selector) {
  const results = []
  $(selector).each((_, element) => {
    const text = normalizeText($(element).text())
    if (text) results.push(text)
  })
  return results
}

function extractRecipeLinks(site, html) {
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

  if (urls.size > 0) {
    return Array.from(urls)
  }

  $('a[href]').each((_, element) => {
    const href = $(element).attr('href')
    const url = resolveUrl(site.url, href)
    if (!url) return

    try {
      const parsed = new URL(url)
      if (parsed.hostname.toLowerCase() !== allowedHost) return
      if (parsed.pathname.toLowerCase().length > 10) {
        urls.add(parsed.href)
      }
    } catch {
      return
    }
  })

  return Array.from(urls)
}

function extractRecipeData(pageUrl, html) {
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
    ...collectTextValues($, '.recipe-method p'),
    ...collectTextValues($, '.instructions li'),
    ...collectTextValues($, '.preparo li'),
    ...collectTextValues($, '.method li')
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

  const ingredients = ingredientTexts
    .map(parseIngredientText)
    .filter(Boolean)
    .slice(0, 30)

  const preparation = preparationTexts.join(' ').trim()
  const ingredientStrings = ingredients.map((ingredient) => `${ingredient.quantity} ${ingredient.unit} ${ingredient.ingredient}`.trim())
  const category = extractRecipeCategory($) || classifyRecipeCategory(title, ingredientStrings, preparation)

  return {
    title,
    category,
    ingredients,
    preparation,
    image: imageUrl,
    link: pageUrl
  }
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0 Safari/537.36'
    }
  })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }
  return response.text()
}

const MAX_RECIPES = 10

async function scrapeSite(site) {
  const searchUrl = site.searchUrl.replace('{query}', encodeURIComponent(query))
  const searchHtml = await fetchHtml(searchUrl)
  const candidateLinks = extractRecipeLinks(site, searchHtml)
  if (!candidateLinks.length) {
    throw new Error('No recipe links found on search page')
  }

  const recipes = []
  const seenLinks = new Set()

  for (const recipeUrl of candidateLinks.slice(0, 10)) {
    if (seenLinks.has(recipeUrl)) continue
    seenLinks.add(recipeUrl)

    try {
      const recipeHtml = await fetchHtml(recipeUrl)
      const recipe = extractRecipeData(recipeUrl, recipeHtml)
      if (recipe.title && recipe.ingredients.length && recipe.preparation) {
        recipes.push(recipe)
        console.log(`  -> extracted: ${recipe.title}`)
      }
    } catch (error) {
      continue
    }
  }

  if (!recipes.length) {
    throw new Error('Failed to extract recipe data from candidate links')
  }

  return recipes
}

async function main() {
  const existingRecipes = await loadExistingRecipes()
  const recipes = []
  const foundLinks = new Set(existingRecipes.map((recipe) => recipe.link))

  for (const site of recipeSites) {
    if (recipes.length >= MAX_RECIPES) {
      break
    }

    try {
      console.log(`Scraping ${site.name}...`)
      const siteRecipes = await scrapeSite(site)
      siteRecipes.forEach((recipe) => {
        if (recipes.length < MAX_RECIPES && recipe.link && !foundLinks.has(recipe.link)) {
          foundLinks.add(recipe.link)
          recipes.push(recipe)
        }
      })
    } catch (error) {
      console.error(`  ✗ ${site.name}:`, error.message)
    }
  }

  if (!recipes.length) {
    throw new Error('No recipes were extracted from configured sites.')
  }

  const combinedRecipes = [...existingRecipes, ...recipes]
  const uniqueRecipesByLink = new Map()

  for (const recipe of combinedRecipes) {
    if (!recipe.link) continue
    if (!uniqueRecipesByLink.has(recipe.link)) {
      uniqueRecipesByLink.set(recipe.link, recipe)
    }
  }

  const allRecipes = Array.from(uniqueRecipesByLink.values())
  const trimmedRecipes = allRecipes.slice(-MAX_OFFLINE_RECIPES)

  await fs.writeFile(outputFile, JSON.stringify(trimmedRecipes, null, 2), 'utf8')
  console.log(`\nWrote ${trimmedRecipes.length} recipes to ${outputFile} (kept latest ${MAX_OFFLINE_RECIPES} recipes)`)
}

main().catch((error) => {
  console.error('Extraction failed:', error)
  process.exit(1)
})
