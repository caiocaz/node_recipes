const ingredientRowsContainer = document.getElementById('ingredient-rows')

if (ingredientRowsContainer) {
  ingredientRowsContainer.addEventListener('click', (event) => {
    const addButton = event.target.closest('.btn-add-ingredient')
    const removeButton = event.target.closest('.btn-remove-ingredient')

    if (addButton) {
      const row = addButton.closest('.ingredient-row')
      if (!row) return

      const newRow = row.cloneNode(true)
      // Reset inputs in cloned row
      const inputs = Array.from(newRow.querySelectorAll('input'))
      inputs.forEach((el) => {
        if (el.type === 'hidden' && el.name === 'unit') {
          el.value = ''
        } else if (el.name === 'quantity' || el.name === 'ingredient') {
          el.value = ''
        }
      })

      // Reset custom-select if present
      const custom = newRow.querySelector('.custom-select')
      if (custom) {
        const hidden = custom.querySelector('input[type="hidden"]')
        const valueSpan = custom.querySelector('.custom-select__value')
        hidden.value = 'un'
        valueSpan.textContent = 'UN'
        custom.querySelectorAll('.custom-select__option').forEach(opt => opt.classList.remove('active'))
        const unOption = custom.querySelector('.custom-select__option[data-value="un"]')
        if (unOption) unOption.classList.add('active')
      }

      ingredientRowsContainer.appendChild(newRow)
      // initialize any custom-select in the newly added row
      const newlyAddedCustom = newRow.querySelectorAll('.custom-select')
      newlyAddedCustom.forEach(sel => initCustomSelect(sel))
      return
    }

    if (removeButton) {
      const row = removeButton.closest('.ingredient-row')
      if (!row) return

      const rows = Array.from(ingredientRowsContainer.querySelectorAll('.ingredient-row'))
      if (rows.length <= 1) {
        const fields = Array.from(row.querySelectorAll('input'))
        fields.forEach((el) => {
          if (el.name === 'quantity' || el.name === 'ingredient') el.value = ''
        })
        const select = row.querySelector('select')
        if (select) select.selectedIndex = 0
        const custom = row.querySelector('.custom-select')
        if (custom) {
          const hidden = custom.querySelector('input[type="hidden"]')
          const valueSpan = custom.querySelector('.custom-select__value')
          hidden.value = 'un'
          valueSpan.textContent = 'UN'
          custom.querySelectorAll('.custom-select__option').forEach(opt => opt.classList.remove('active'))
          const unOption = custom.querySelector('.custom-select__option[data-value="un"]')
          if (unOption) unOption.classList.add('active')
        }
      } else {
        row.remove()
      }
    }
  })
}

const customSelects = document.querySelectorAll('.custom-select')

function initCustomSelect(select) {
  if (!select) return
  const trigger = select.querySelector('.custom-select__trigger')
  const options = select.querySelectorAll('.custom-select__option')
  const hiddenInput = select.querySelector('input[type="hidden"]')
  const valueSpan = select.querySelector('.custom-select__value')

  const closeSelect = () => {
    select.classList.remove('open')
    trigger.setAttribute('aria-expanded', 'false')
  }

  trigger.addEventListener('click', () => {
    const isOpen = select.classList.contains('open')
    document.querySelectorAll('.custom-select.open').forEach((openSelect) => {
      openSelect.classList.remove('open')
      openSelect.querySelector('.custom-select__trigger').setAttribute('aria-expanded', 'false')
    })
    if (!isOpen) {
      select.classList.add('open')
      trigger.setAttribute('aria-expanded', 'true')
    }
  })

  options.forEach((option) => {
    option.addEventListener('click', () => {
      options.forEach((opt) => opt.classList.remove('active'))
      option.classList.add('active')
      const optionValue = option.getAttribute('data-value')
      hiddenInput.value = optionValue
      valueSpan.textContent = optionValue
      closeSelect()
    })
  })
}

if (customSelects.length) {
  customSelects.forEach((select) => initCustomSelect(select))

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.custom-select')) {
      document.querySelectorAll('.custom-select.open').forEach((select) => {
        select.classList.remove('open')
        select.querySelector('.custom-select__trigger').setAttribute('aria-expanded', 'false')
      })
    }
  })
}
