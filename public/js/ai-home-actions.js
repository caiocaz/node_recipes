document.addEventListener('DOMContentLoaded', async () => {
  let suggestions = window.AI_SUGGESTIONS || []
  if (!suggestions.length) return

  const modal = document.getElementById('recipeModal')
  const modalClose = document.querySelector('.recipe-modal-close')
  const modalCloseBtn = document.getElementById('modalCloseBtn')
  const modalAddBtn = document.getElementById('modalAddBtn')
  let currentRecipeId = null

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

  // Função para buscar títulos das receitas do usuário
  async function fetchUserTitles() {
    try {
      const response = await fetch('/recipes/titles')
      if (!response.ok) return []
      return await response.json()
    } catch (error) {
      console.error('Erro ao buscar títulos do usuário:', error)
      return []
    }
  }

  // Função para filtrar sugestões removendo duplicatas
  async function filterSuggestions() {
    const userTitles = await fetchUserTitles()
    const normalizedUserTitles = userTitles.map(t => normalizeTitle(t))

    // Criar array com informações de quais sugestões manter
    const suggestionsToKeep = []
    const cardsToRemove = []

    suggestions.forEach((recipe, index) => {
      const normalizedTitle = normalizeTitle(recipe.title)
      if (normalizedUserTitles.includes(normalizedTitle)) {
        // Esta sugestão é uma duplicata - remover do DOM
        const card = document.querySelector(`[data-ai-index="${index}"]`)
        if (card) {
          cardsToRemove.push(card.closest('.ai-suggestion-card'))
        }
      } else {
        // Esta sugestão será mantida
        suggestionsToKeep.push({ recipe, originalIndex: index })
      }
    })

    // Remover os cards do DOM e atualizar índices
    cardsToRemove.forEach(card => {
      if (card) card.remove()
    })

    // Atualizar os data-ai-index dos cards mantidos para corresponder aos novos índices
    suggestionsToKeep.forEach((item, newIndex) => {
      const card = document.querySelector(`[data-ai-index="${item.originalIndex}"]`)
      if (card) {
        card.setAttribute('data-ai-index', newIndex)
      }
    })

    // Atualizar array de sugestões
    const filtered = suggestionsToKeep.map(item => item.recipe)
    const removedCount = suggestions.length - filtered.length
    suggestions = filtered
    window.AI_SUGGESTIONS = suggestions

    if (removedCount > 0) {
      console.log(`${removedCount} sugestões removidas por serem duplicatas`)
    }
  }

  // Aplicar filtro antes de exibir sugestões
  await filterSuggestions()

  // Função para abrir o modal com os dados da receita
  function openRecipeModal(recipe) {
    if (!recipe) return

    // Preencher os dados do modal
    document.getElementById('modalRecipeTitle').textContent = recipe.title
    document.getElementById('modalRecipeCategory').textContent = recipe.category
    
    if (recipe.image) {
      document.getElementById('modalRecipeImage').src = recipe.image
    }

    // Preencher ingredientes
    const ingredientsList = document.getElementById('modalRecipeIngredients')
    ingredientsList.innerHTML = ''
    recipe.ingredients.forEach((ingredient) => {
      const li = document.createElement('li')
      li.textContent = `${ingredient.quantity} ${ingredient.unit} ${ingredient.ingredient}`
      ingredientsList.appendChild(li)
    })

    // Preencher modo de preparo
    document.getElementById('modalRecipePreparation').textContent = recipe.preparation

    // Armazenar receita atual
    currentRecipeId = recipe
    
    // Mostrar modal
    modal.hidden = false
  }

  // Função para fechar o modal
  function closeRecipeModal() {
    modal.hidden = true
    currentRecipeId = null
  }

  // Eventos para abrir o modal
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-view-recipe')) {
      const card = e.target.closest('.ai-suggestion-card')
      if (card) {
        const index = Number(card.getAttribute('data-ai-index'))
        if (!Number.isNaN(index) && suggestions[index]) {
          openRecipeModal(suggestions[index])
        }
      }
    }
  })

  // Evento para fechar o modal
  modalClose.addEventListener('click', closeRecipeModal)
  modalCloseBtn.addEventListener('click', closeRecipeModal)

  // Fechar modal ao clicar fora dele
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeRecipeModal()
    }
  })

  // Botão de adicionar receita do modal
  modalAddBtn.addEventListener('click', (e) => {
    if (!currentRecipeId) return
    try {
      sessionStorage.setItem('ai_suggestion', JSON.stringify(currentRecipeId))
      window.location.href = '/recipes/add'
    } catch (err) {
      console.error('Erro ao armazenar sugestão na sessão:', err)
    }
  })

  // Botão de adicionar diretamente das sugestões
  document.addEventListener('click', async (e) => {
    if (!e.target.classList.contains('btn-add-from-ai')) return

    const btn = e.target
    const card = btn.closest('.ai-suggestion-card')
    if (!card) return

    const index = Number(card.getAttribute('data-ai-index'))
    if (Number.isNaN(index) || !suggestions[index]) return

    const recipe = suggestions[index]
    btn.disabled = true
    const originalText = btn.textContent
    btn.textContent = 'Adicionando...'

    try {
      sessionStorage.setItem('ai_suggestion', JSON.stringify(recipe))
      window.location.href = '/recipes/add'
    } catch (err) {
      console.error('Erro ao armazenar sugestão na sessão:', err)
      btn.textContent = 'Erro'
      setTimeout(() => {
        btn.disabled = false
        btn.textContent = originalText
      }, 2500)
    }
  })
})
