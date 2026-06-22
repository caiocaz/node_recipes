const escapeHtml = (value) => {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Função para converter frações em decimais
// Exemplos: "1/2" → 0.5, "1 e 1/2" → 1.5, "1 1/2" → 1.5, "2/3" → 0.67
const convertFractionToDecimal = (quantity) => {
  if (!quantity) return ''
  
  const str = String(quantity).trim()
  
  // Remover espaços extras
  let normalized = str.replace(/\s+/g, ' ')
  
  // Padrão: "X e 1/2" ou "X 1/2" ou "1/2" ou "X"
  // Regex para capturar: número inteiro opcional + "e"/"e" + fração OU apenas fração OU apenas inteiro
  const fractionPattern = /^(\d+)?(?:\s+e\s+|\s+)?(\d+\/\d+)?$/i
  const match = normalized.match(fractionPattern)
  
  if (!match) {
    // Tentar converter como número simples
    const num = parseFloat(normalized)
    return isNaN(num) ? '' : num
  }
  
  let result = 0
  
  // Parte inteira
  if (match[1]) {
    result += parseInt(match[1], 10)
  }
  
  // Parte fracionária
  if (match[2]) {
    const [numerator, denominator] = match[2].split('/').map(Number)
    if (denominator && denominator !== 0) {
      result += numerator / denominator
    }
  }
  
  // Se não tiver nenhuma das partes, tentar extrair apenas números
  if (!match[1] && !match[2]) {
    const num = parseFloat(str)
    return isNaN(num) ? '' : num
  }
  
  // Arredondar para 2 casas decimais
  return Math.round(result * 100) / 100
}

const createIngredientRow = (item = {}) => {
  const row = document.createElement('div')
  row.className = 'ingredient-row'

  const units = [
    { value: '', label: 'Unidade' },
    { value: 'mg', label: 'mg' },
    { value: 'g', label: 'g' },
    { value: 'kg', label: 'kg' },
    { value: 'ml', label: 'ml' },
    { value: 'l', label: 'l' },
    { value: 'un', label: 'un' },
    { value: 'pitada', label: 'pitada' },
    { value: 'gota', label: 'gota' },
    { value: 'colher_cafe', label: 'colher_cafe' },
    { value: 'colher_cha', label: 'colher_cha' },
    { value: 'colher_sobremesa', label: 'colher_sobremesa' },
    { value: 'colher_sopa', label: 'colher_sopa' },
    { value: 'xicara', label: 'xicara' },
    { value: 'copo', label: 'copo' },
    { value: 'concha', label: 'concha' },
    { value: 'dente', label: 'dente' },
    { value: 'folha', label: 'folha' },
    { value: 'ramo', label: 'ramo' },
    { value: 'maco', label: 'maco' },
    { value: 'fatia', label: 'fatia' },
    { value: 'rodela', label: 'rodela' },
    { value: 'cubo', label: 'cubo' },
    { value: 'pedaco', label: 'pedaco' },
    { value: 'duzia', label: 'duzia' },
    { value: 'pacote', label: 'pacote' },
    { value: 'lata', label: 'lata' },
    { value: 'caixa', label: 'caixa' },
    { value: 'sache', label: 'sache' },
    { value: 'garrafa', label: 'garrafa' },
    { value: 'pote', label: 'pote' },
    { value: 'tablete', label: 'tablete' },
    { value: 'barra', label: 'barra' }
  ]

  // Converter quantidade se contiver frações
  const convertedQuantity = convertFractionToDecimal(item.quantity)

  row.innerHTML = `
    <input name="quantity" type="number" value="${escapeHtml(convertedQuantity)}" placeholder="Qtd" min="0" step="any" />
    <div class="custom-select" data-input-name="unit">
      <button type="button" class="custom-select__trigger" aria-haspopup="listbox" aria-expanded="false">
        <span class="custom-select__value">${escapeHtml(item.unit || 'Unidade')}</span>
        <i class="bi bi-chevron-down"></i>
      </button>
      <ul class="custom-select__options" role="listbox">
        ${units.map(unit => `<li class="custom-select__option" data-value="${unit.value}">${unit.label}</li>`).join('')}
      </ul>
      <input type="hidden" name="unit" value="${escapeHtml(item.unit || '')}" />
    </div>
    <div class="ingredient-with-button">
      <input name="ingredient" type="text" value="${escapeHtml(item.ingredient)}" placeholder="Ingrediente" />
      <button type="button" class="btn-add-ingredient" title="Adicionar ingrediente">+</button>
    </div>
  `

  return row
}

const fillRecipeForm = (recipe) => {
  const titleInput = document.getElementById('title')
  const preparationTextarea = document.getElementById('preparation')
  const linkInput = document.querySelector('input[name="link"][type="url"]')
  const categoryHiddenInput = document.querySelector('.custom-select input[type="hidden"]')
  const categoryValueSpan = document.querySelector('.custom-select__value')
  const categoryOptions = Array.from(document.querySelectorAll('.custom-select__option'))
  const ingredientRowsContainer = document.getElementById('ingredient-rows')

  if (titleInput) titleInput.value = recipe.title || ''
  if (preparationTextarea) preparationTextarea.value = recipe.preparation || ''
  if (linkInput) linkInput.value = recipe.link || recipe.url || ''
  // preencher campo oculto de URL da imagem (se houver)
  try {
    const imageUrlInput = document.querySelector('input[name="image"][type="hidden"]')
    if (imageUrlInput) imageUrlInput.value = recipe.image || ''
  } catch (e) {
    // ignore
  }

  if (categoryHiddenInput && categoryValueSpan) {
    const category = recipe.category || 'Pratos Principais'
    categoryHiddenInput.value = category
    categoryValueSpan.textContent = category
    categoryOptions.forEach((option) => {
      const optionValue = option.getAttribute('data-value')
      if (optionValue === category) {
        option.classList.add('active')
      } else {
        option.classList.remove('active')
      }
    })
  }

  if (ingredientRowsContainer) {
    ingredientRowsContainer.innerHTML = ''
    const rows = Array.isArray(recipe.ingredients) && recipe.ingredients.length ? recipe.ingredients : [{ quantity: '', unit: '', ingredient: '' }]
    rows.forEach((ingredient) => ingredientRowsContainer.appendChild(createIngredientRow(ingredient)))
    // Initialize any custom-selects added by createIngredientRow
    try {
      const newCustoms = Array.from(ingredientRowsContainer.querySelectorAll('.custom-select'))
      newCustoms.forEach(sel => typeof initCustomSelect === 'function' && initCustomSelect(sel))
    } catch (e) {
      // ignore
    }
  }
}

const showModal = (modal) => {
  if (!modal) return
  modal.classList.add('open')
  modal.setAttribute('aria-hidden', 'false')
}

const hideModal = (modal) => {
  if (!modal) return
  modal.classList.remove('open')
  modal.setAttribute('aria-hidden', 'true')
}

const renderSuggestions = (recipes, container, feedback) => {
  container.innerHTML = ''

  if (!recipes || !recipes.length) {
    feedback.textContent = 'Nenhuma sugestão encontrada para o tipo informado.'
    return
  }

  feedback.textContent = `Foram encontradas ${recipes.length} sugestões.`

  recipes.forEach((recipe, index) => {
    const card = document.createElement('div')
    card.className = 'ai-suggestion-card'

    const ingredientList = Array.isArray(recipe.ingredients) ? recipe.ingredients.slice(0, 6) : []

    card.innerHTML = `
      <div class="suggestion-card-header">
        <div class="suggestion-image-wrap">
          ${recipe.image ? `<img src="${escapeHtml(recipe.image)}" alt="${escapeHtml(recipe.title)}" class="ai-suggestion-image" />` : ''}
        </div>
        <div class="suggestion-main">
          <h4>${escapeHtml(recipe.title)}</h4>
          <span class="suggestion-category">${escapeHtml(recipe.category)}</span>
        </div>
      </div>
      <p class="suggestion-preview">${escapeHtml(recipe.preparation || '').slice(0, 180)}${recipe.preparation && recipe.preparation.length > 180 ? '...' : ''}</p>
      <ul class="suggestion-ingredients">
        ${ingredientList.map(item => `<li>${escapeHtml(item.quantity)} ${escapeHtml(item.unit)} ${escapeHtml(item.ingredient)}</li>`).join('')}
      </ul>
      <button type="button" class="btn btn-select-suggestion" data-suggestion-index="${index}">Selecionar esta receita</button>
    `

    card.querySelector('.btn-select-suggestion')?.addEventListener('click', () => {
      fillRecipeForm(recipe)
      hideModal(document.getElementById('ai-suggestion-modal'))
    })

    container.appendChild(card)
  })
}

const initAiSuggestion = () => {
  const aiButton = document.getElementById('ai-suggestion-button')
  const modal = document.getElementById('ai-suggestion-modal')
  const closeButtons = modal ? Array.from(modal.querySelectorAll('[data-close], .ai-modal__close')) : []
  const form = document.querySelector('.ai-suggestion-form')
  const feedback = document.querySelector('.ai-suggestion-feedback')
  const suggestionsList = document.getElementById('ai-suggestions-list')

  if (!aiButton || !modal || !form || !feedback || !suggestionsList) return

  // Função para normalizar títulos
  function normalizeTitle(title) {
    if (!title) return ''
    return String(title)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
  }

  aiButton.addEventListener('click', () => {
    feedback.textContent = ''
    suggestionsList.innerHTML = ''
    form.reset()
    showModal(modal)
  })

  closeButtons.forEach((button) => {
    button.addEventListener('click', () => hideModal(modal))
  })

  modal.addEventListener('click', (event) => {
    if (event.target === modal || event.target.dataset.close === 'true') {
      hideModal(modal)
    }
  })

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    const typeInput = document.getElementById('ai-dish-type')
    const type = typeInput?.value.trim()

    if (!type) {
      feedback.textContent = 'Informe um tipo de prato, por exemplo: carne, frango, batata.'
      return
    }

    feedback.textContent = 'Buscando sugestões da IA...'
    suggestionsList.innerHTML = ''

    try {
      // Fetch user's existing recipe titles
      const titlesResponse = await fetch('/recipes/titles')
      const userTitles = titlesResponse.ok ? await titlesResponse.json() : []
      const normalizedUserTitles = userTitles.map(t => normalizeTitle(t))

      // Fetch AI suggestions
      const response = await fetch(`/recipes/ai-suggestions?type=${encodeURIComponent(type)}`)
      const data = await response.json()

      if (!response.ok) {
        feedback.textContent = data.message || 'Erro ao buscar sugestão. Tente novamente.'
        return
      }

      // Filter out user's existing recipes
      const recipes = Array.isArray(data) ? data : (data.recipes || [])
      const filteredRecipes = recipes.filter(recipe => {
        const normalizedTitle = normalizeTitle(recipe.title)
        return !normalizedUserTitles.includes(normalizedTitle)
      })

      const duplicatesCount = recipes.length - filteredRecipes.length
      if (duplicatesCount > 0) {
        console.log(`${duplicatesCount} sugestões removidas por serem duplicatas`)
      }

      const displayedRecipes = filteredRecipes.slice(0, 10)
      renderSuggestions(displayedRecipes, suggestionsList, feedback)
    } catch (error) {
      feedback.textContent = 'Não foi possível buscar sugestões no momento. Verifique sua conexão.'
      console.error('AI suggestion fetch failed:', error)
    }
  })
}

document.addEventListener('DOMContentLoaded', () => {
  initAiSuggestion()

  // Carregar sugestão armazenada na sessão (vinda da página inicial)
  try {
    const raw = sessionStorage.getItem('ai_suggestion')
    if (raw) {
      const recipe = JSON.parse(raw)
      fillRecipeForm(recipe)
      sessionStorage.removeItem('ai_suggestion')
      const titleInput = document.getElementById('title')
      if (titleInput) titleInput.focus()
    }
  } catch (err) {
    console.error('Erro ao carregar sugestão da sessão:', err)
  }
})
