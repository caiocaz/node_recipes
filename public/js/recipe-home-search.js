document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('recipe-search-input')
  if (!searchInput) return

  const sections = Array.from(document.querySelectorAll('.recipe-category-section'))
  const emptyMessage = document.querySelector('.recipe-search-empty')

  const normalizeText = text => text.toLowerCase().trim()

  const updateVisibility = () => {
    const query = normalizeText(searchInput.value)
    const activeSearch = query.length >= 3

    let anyVisible = false

    sections.forEach(section => {
      const sectionCards = Array.from(section.querySelectorAll('.recipe-card-item'))
      let sectionVisible = false

      sectionCards.forEach(card => {
        const title = normalizeText(card.querySelector('h3')?.textContent || '')
        const category = normalizeText(section.querySelector('.recipe-category-header h3')?.textContent || '')
        const match = title.includes(query) || category.includes(query)

        if (!activeSearch || match) {
          card.hidden = false
          card.style.display = ''
          sectionVisible = true
        } else {
          card.hidden = true
          card.style.display = 'none'
        }
      })

      section.hidden = !sectionVisible
      if (sectionVisible) anyVisible = true
    })

    // Filtrar sugestões da IA também
    const aiSection = document.querySelector('.ai-home-suggestions')
    if (aiSection) {
      const aiCards = Array.from(aiSection.querySelectorAll('.ai-suggestion-card'))
      let anyAiVisible = false

      // por padrão, esconda tudo quando estiver em busca ativa, e mostre os matches
      aiCards.forEach(card => {
        const title = normalizeText(card.dataset.title || card.querySelector('h4')?.textContent || '')
        const category = normalizeText(card.dataset.category || card.querySelector('.suggestion-category')?.textContent || '')
        const preview = normalizeText(card.dataset.preview || card.querySelector('.suggestion-preview')?.textContent || '')
        const ingredients = normalizeText(card.dataset.ingredients || Array.from(card.querySelectorAll('.suggestion-ingredients li')).map(li => li.textContent).join(' '))
        const match = title.includes(query) || category.includes(query) || preview.includes(query) || ingredients.includes(query)

        if (!activeSearch) {
          card.hidden = false
          card.style.display = ''
          anyAiVisible = true
        } else if (match) {
          card.hidden = false
          card.style.display = ''
          anyAiVisible = true
        } else {
          card.hidden = true
          card.style.display = 'none'
        }
      })

      // esconder a seção inteira se nenhum cartão visível
      // Use style.display as fallback for visibility (mais resistente a CSS overrides)
      aiSection.hidden = !anyAiVisible
      aiSection.style.display = anyAiVisible ? '' : 'none'
      if (anyAiVisible) anyVisible = true
    }

    emptyMessage.hidden = anyVisible || !activeSearch
  }

  searchInput.addEventListener('input', updateVisibility)
})
