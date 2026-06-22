import 'dotenv/config.js'
import RecipeController from '../controllers/RecipeController.js'

// Teste simples do provedor OpenAI
(async () => {
  console.log('🔍 Testando provedor OpenAI...\n')
  console.log('Configurações:')
  console.log(`  AI_PROVIDER: ${process.env.AI_PROVIDER || 'openai'}`)
  console.log(`  OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✓ Configurada' : '✗ NÃO configurada'}`)
  console.log(`  OPENAI_MODEL: ${process.env.OPENAI_MODEL || 'gpt-3.5-turbo'}`)

  if (!process.env.OPENAI_API_KEY) {
    console.error('\n❌ Erro: OPENAI_API_KEY não configurada no .env')
    process.exit(1)
  }

  try {
    console.log('\n📝 Enviando prompt para OpenAI...')
    const prompt = 'Crie 2 receitas brasileiras simples em JSON: { "recipes": [ { "title": "...", "category": "...", "ingredients": [], "preparation": "..." } ] }'
    
    const result = await RecipeController.callAiModel(prompt, { max_tokens: 500 })
    
    console.log('\n✅ Resposta recebida com sucesso!\n')
    console.log('Conteúdo (primeiros 500 caracteres):')
    console.log(result.substring(0, 500))
    
    // Tentar fazer parse JSON
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        if (parsed.recipes) {
          console.log(`\n✅ JSON válido encontrado com ${parsed.recipes.length} receita(s)`)
          parsed.recipes.forEach((r, i) => {
            console.log(`   ${i + 1}. ${r.title} (${r.category})`)
          })
        }
      }
    } catch (e) {
      console.warn('⚠️  Não foi possível fazer parse do JSON da resposta')
    }

    process.exit(0)
  } catch (error) {
    console.error('\n❌ Erro ao chamar OpenAI:')
    console.error(error.message)
    process.exit(1)
  }
})()
