import 'dotenv/config.js'
import RecipeController from '../controllers/RecipeController.js'

// Teste simples do provedor Google Gemini
(async () => {
  console.log('🔍 Testando provedor Google Gemini...\n')
  console.log('Configurações:')
  console.log(`  AI_PROVIDER: ${process.env.AI_PROVIDER || 'openai'}`)
  console.log(`  GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? '✓ Configurada' : '✗ NÃO configurada'}`)
  console.log(`  GEMINI_API_URL: ${process.env.GEMINI_API_URL ? '✓ Configurada' : '✗ NÃO configurada'}`)

  if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_API_URL) {
    console.error('\n❌ Erro: GEMINI_API_KEY ou GEMINI_API_URL não configurados no .env')
    console.error('   Adicione as seguintes linhas ao .env:')
    console.error('   GEMINI_API_KEY=sua_chave_aqui')
    console.error('   GEMINI_API_URL=https://seu_endpoint_gemini')
    process.exit(1)
  }

  try {
    console.log('\n📝 Enviando prompt para Google Gemini...')
    const prompt = 'Crie 2 receitas brasileiras simples em JSON: { "recipes": [ { "title": "...", "category": "...", "ingredients": [], "preparation": "..." } ] }'
    
    // Mudar temporariamente para Gemini neste teste
    const oldProvider = process.env.AI_PROVIDER
    process.env.AI_PROVIDER = 'gemini'
    
    const result = await RecipeController.callAiModel(prompt, { max_tokens: 500 })
    
    process.env.AI_PROVIDER = oldProvider
    
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
    console.error('\n❌ Erro ao chamar Google Gemini:')
    console.error(error.message)
    process.exit(1)
  }
})()
