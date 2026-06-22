let currentShoppingList = window.SHOPPING_LIST_DATA || []
let currentFilter = 'all'
let currentSearch = ''

const parseIngredients = (data) => {
  if (!data) return []
  if (Array.isArray(data)) return data

  const normalized = String(data)
    .trim()
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')

  try {
    return JSON.parse(normalized)
  } catch {
    return []
  }
}

const buildKey = (item) => `${item.name.trim().toLowerCase()}|${item.unit.trim().toLowerCase()}`
const generateItemId = (item) => buildKey(item)

const getShoppingList = () => currentShoppingList
const setShoppingList = (list) => { currentShoppingList = list || [] }

const persistAndRender = (updatedList) => {
  setShoppingList(updatedList)
  renderSummary(updatedList)
  renderList(updatedList, currentFilter, currentSearch)
  return updatedList
}

const apiGetShoppingList = async () => {
  try {
    const response = await fetch('/shopping-list/items')
    if (!response.ok) throw new Error('Não foi possível carregar a lista de compras.')
    return response.json()
  } catch (error) {
    showFeedback(error.message, 'error')
    return []
  }
}

const apiAddShoppingItem = async (item) => {
  const response = await fetch('/shopping-list/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item)
  })
  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.message || 'Erro ao adicionar item.')
  }
  return response.json()
}

const apiAddShoppingListFromRecipe = async (items) => {
  const response = await fetch('/shopping-list/add-from-recipe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(items)
  })
  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.message || 'Erro ao adicionar ingredientes.')
  }
  return response.json()
}

const apiUpdateShoppingItem = async (id, updates) => {
  const response = await fetch(`/shopping-list/items/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  })
  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.message || 'Erro ao atualizar item.')
  }
  return response.json()
}

const apiDeleteShoppingItem = async (id) => {
  const response = await fetch(`/shopping-list/items/${id}`, {
    method: 'DELETE'
  })
  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.message || 'Erro ao remover item.')
  }
  return response.json()
}

const apiClearShoppingList = async () => {
  const response = await fetch('/shopping-list/clear', {
    method: 'POST'
  })
  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.message || 'Erro ao limpar a lista.')
  }
  return response.json()
}

const formatIngredient = (item) => ({
  id: item.id || generateItemId(item),
  name: String(item.name || '').trim(),
  quantity: String(item.quantity || '').trim() || '1',
  unit: String(item.unit || '').trim(),
  origin: item.origin || 'Manual',
  status: item.status || 'pending'
})

const renderSummary = (list) => {
  const total = list.length
  const bought = list.filter(item => item.status === 'bought').length
  const pending = total - bought

  const totalEl = document.getElementById('shopping-total')
  const boughtEl = document.getElementById('shopping-bought')
  const pendingEl = document.getElementById('shopping-pending')

  if (totalEl) totalEl.textContent = total
  if (boughtEl) boughtEl.textContent = bought
  if (pendingEl) pendingEl.textContent = pending
}

const renderList = (list, filter = 'all', search = '') => {
  const container = document.getElementById('shopping-list')
  if (!container) return

  const query = search.trim().toLowerCase()
  const filtered = list.filter(item => {
    const matchesFilter = filter === 'all' || (filter === 'bought' && item.status === 'bought') || (filter === 'pending' && item.status === 'pending')
    const matchesSearch = !query || item.name.toLowerCase().includes(query)
    return matchesFilter && matchesSearch
  })

  container.innerHTML = filtered.map((item) => `
    <div class="shopping-item ${item.status === 'bought' ? 'bought' : ''}" data-id="${item.id}">
      <div class="shopping-item-main">
        <label class="shopping-item-checkbox">
          <input type="checkbox" data-action="toggle-status" ${item.status === 'bought' ? 'checked' : ''} />
          <span>${item.name}</span>
        </label>
        <div class="shopping-item-details">
          <span>${item.quantity} ${item.unit}</span>
          <span class="shopping-item-origin">${item.origin}</span>
        </div>
      </div>
      <div class="shopping-item-actions">
        <button type="button" class="btn btn-secondary" data-action="edit-item">Editar</button>
        <button type="button" class="btn btn-danger" data-action="remove-item">Remover</button>
      </div>
    </div>
  `).join('')
}

const showFeedback = (message, type = 'success') => {
  const local = document.getElementById('shopping-list-feedback')
  const global = document.getElementById('global-toast')
  const container = local || global
  if (!container) return

  if (global && local !== global) {
    global.textContent = message
    global.classList.add('visible')
    global.classList.toggle('global-toast--error', type === 'error')
    global.hidden = false
  } else {
    container.textContent = message
    container.className = `shopping-list-feedback shopping-list-feedback--${type}`
    container.hidden = false
  }

  clearTimeout(showFeedback.timeoutId)
  showFeedback.timeoutId = setTimeout(() => {
    if (local) {
      local.hidden = true
    }
    if (global) {
      global.classList.remove('visible')
      global.hidden = true
    }
  }, 3000)
}

const bindShoppingListEvents = () => {
  const form = document.getElementById('shopping-form')
  const searchInput = document.getElementById('shopping-search')
  const clearButton = document.getElementById('shopping-clear')
  const filterButtons = Array.from(document.querySelectorAll('.btn-filter'))

  persistAndRender(getShoppingList())

  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault()
      const name = document.getElementById('shopping-name').value.trim()
      const quantity = document.getElementById('shopping-quantity').value.trim()
      const unit = document.getElementById('shopping-unit').value.trim()

      if (!name || !quantity || !unit) {
        showFeedback('Informe nome, quantidade e unidade.', 'error')
        return
      }

      try {
        const newItem = { name, quantity, unit, origin: 'Manual', status: 'pending' }
        const created = await apiAddShoppingItem(newItem)
        persistAndRender([...getShoppingList(), created])
        form.reset()
        
        // Reset unit custom-select to "un" default
        const unitHidden = document.getElementById('shopping-unit')
        const unitValueSpan = form.querySelector('.custom-select[data-input-name="unit"] .custom-select__value')
        const unitOptions = Array.from(form.querySelectorAll('.custom-select[data-input-name="unit"] .custom-select__option'))
        if (unitHidden) unitHidden.value = 'un'
        if (unitValueSpan) unitValueSpan.textContent = 'UN'
        unitOptions.forEach(opt => opt.classList.remove('active'))
        const unOption = form.querySelector('.custom-select[data-input-name="unit"] .custom-select__option[data-value="un"]')
        if (unOption) unOption.classList.add('active')
        
        showFeedback('Ingrediente adicionado à lista de compras.')
      } catch (error) {
        showFeedback(error.message, 'error')
      }
    })
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      currentSearch = searchInput.value
      renderList(getShoppingList(), currentFilter, currentSearch)
    })
  }

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      filterButtons.forEach(btn => btn.classList.remove('active'))
      button.classList.add('active')
      currentFilter = button.dataset.filter
      renderList(getShoppingList(), currentFilter, currentSearch)
    })
  })

  if (clearButton) {
    clearButton.addEventListener('click', async () => {
      if (!confirm('Deseja limpar toda a lista de compras?')) return
      try {
        await apiClearShoppingList()
        persistAndRender([])
        showFeedback('Lista de compras limpa.')
      } catch (error) {
        showFeedback(error.message, 'error')
      }
    })
  }

  document.getElementById('shopping-list')?.addEventListener('click', async (event) => {
    const actionButton = event.target.closest('button')
    const checkbox = event.target.closest('input[type="checkbox"][data-action="toggle-status"]')

    const itemElement = (actionButton || checkbox)?.closest('.shopping-item')
    if (!itemElement) return

    const itemId = itemElement.dataset.id
    const currentList = getShoppingList()
    const index = currentList.findIndex((item) => String(item.id) === String(itemId))
    if (index === -1) return

    const item = currentList[index]
    if (!item) return

    if (checkbox) {
      try {
        const updated = await apiUpdateShoppingItem(itemId, { status: item.status === 'bought' ? 'pending' : 'bought' })
        const newList = [...currentList]
        newList[index] = updated
        persistAndRender(newList)
      } catch (error) {
        showFeedback(error.message, 'error')
      }
      return
    }

    if (!actionButton) return
    const action = actionButton.dataset.action

    if (action === 'remove-item') {
      try {
        await apiDeleteShoppingItem(itemId)
        const newList = currentList.filter((_, i) => i !== index)
        persistAndRender(newList)
        showFeedback('Item removido da lista.')
      } catch (error) {
        showFeedback(error.message, 'error')
      }
      return
    }

    if (action === 'edit-item') {
        openEditModal(item)
    }
  })
}

  // Edit modal helpers
  let editingItemId = null
  const openEditModal = (item) => {
    const modal = document.getElementById('edit-ingredient-modal')
    if (!modal) return
    editingItemId = String(item.id)
    document.getElementById('edit-name').value = item.name || ''
    document.getElementById('edit-quantity').value = item.quantity || ''

    const unitHidden = document.getElementById('edit-unit')
    const unitValueSpan = modal.querySelector('.custom-select[data-input-name="unit"] .custom-select__value')
    const unitOptions = Array.from(modal.querySelectorAll('.custom-select[data-input-name="unit"] .custom-select__option'))
    const selectedUnit = item.unit || ''

    if (unitHidden) unitHidden.value = selectedUnit
    if (unitValueSpan) unitValueSpan.textContent = selectedUnit || 'Unidade'

    unitOptions.forEach((option) => {
      option.classList.toggle('active', option.getAttribute('data-value') === selectedUnit)
    })

    const statusHidden = document.getElementById('edit-status')
    const statusValueSpan = modal.querySelector('.custom-select[data-input-name="status"] .custom-select__value')
    const statusOptions = Array.from(modal.querySelectorAll('.custom-select[data-input-name="status"] .custom-select__option'))
    const selectedStatus = item.status || 'pending'

    if (statusHidden) statusHidden.value = selectedStatus
    if (statusValueSpan) statusValueSpan.textContent = selectedStatus === 'bought' ? 'Comprado' : 'Pendente'

    statusOptions.forEach((option) => {
      option.classList.toggle('active', option.getAttribute('data-value') === selectedStatus)
    })

    modal.classList.add('open')
    modal.setAttribute('aria-hidden', 'false')
  }

  const closeEditModal = () => {
    const modal = document.getElementById('edit-ingredient-modal')
    if (!modal) return
    modal.classList.remove('open')
    modal.setAttribute('aria-hidden', 'true')
    editingItemId = null
  }

  const initEditModalEvents = () => {
    const modal = document.getElementById('edit-ingredient-modal')
    if (!modal) return
    const overlay = modal.querySelector('.ai-modal__overlay')
    const closeBtn = document.getElementById('edit-modal-close')
    const cancelBtn = document.getElementById('edit-cancel')
    const form = document.getElementById('edit-ingredient-form')

    overlay?.addEventListener('click', () => closeEditModal())
    closeBtn?.addEventListener('click', () => closeEditModal())
    cancelBtn?.addEventListener('click', () => closeEditModal())

    form?.addEventListener('submit', async (e) => {
      e.preventDefault()
      if (!editingItemId) return
      const name = document.getElementById('edit-name').value.trim()
      const quantity = document.getElementById('edit-quantity').value.trim()
      const unit = document.getElementById('edit-unit').value.trim()
      const status = document.getElementById('edit-status').value

      if (!name || !quantity) {
        showFeedback('Nome e quantidade são obrigatórios.', 'error')
        return
      }

      try {
        const updated = await apiUpdateShoppingItem(editingItemId, { name, quantity, unit, status })
        const currentList = getShoppingList()
        const index = currentList.findIndex(i => String(i.id) === String(editingItemId))
        if (index !== -1) {
          const newList = [...currentList]
          newList[index] = updated
          persistAndRender(newList)
        }
        closeEditModal()
        showFeedback('Item atualizado com sucesso.')
      } catch (err) {
        showFeedback(err.message || 'Erro ao atualizar item.', 'error')
      }
    })
  }

const addToShoppingFromRecipe = async (ingredientsJson, recipeTitle = '') => {
  const ingredients = parseIngredients(ingredientsJson)
  if (!ingredients.length) {
    showFeedback('Receita sem ingredientes válidos.', 'error')
    return
  }

  const origin = recipeTitle ? `Receita: ${recipeTitle}` : 'Receita'
  const mapped = ingredients.map((ing) => ({
    name: ing.ingredient || ing.name || '',
    quantity: ing.quantity || ing.qty || 0,
    unit: ing.unit || '',
    origin,
    status: 'pending'
  }))

  try {
    const updated = await apiAddShoppingListFromRecipe(mapped)
    persistAndRender(updated)
    showFeedback('Ingredientes adicionados à lista de compras.')
  } catch (error) {
    showFeedback(error.message, 'error')
  }
}

const initShoppingList = async () => {
  const form = document.getElementById('shopping-form')
  const list = await apiGetShoppingList()
  setShoppingList(list)
  bindShoppingListEvents()
  initEditModalEvents()

  document.querySelectorAll('.btn-add-to-shopping').forEach((button) => {
    button.addEventListener('click', () => {
      const recipeCard = button.closest('.recipe-card-item')
      const hiddenIngredients = recipeCard?.querySelector('.recipe-ingredients-data')?.textContent
      const ingredientsJson = hiddenIngredients || button.getAttribute('data-ingredients')
      const recipeTitle = button.dataset.recipeTitle || recipeCard?.querySelector('.recipe-card-title h3')?.textContent || ''
      addToShoppingFromRecipe(ingredientsJson, recipeTitle)
    })
  })
}

if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    initShoppingList()
  })
}
