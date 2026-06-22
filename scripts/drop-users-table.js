import 'dotenv/config'
import Sequelize from 'sequelize'

const db = new Sequelize('noderecipes', 'root', 'root', {
  host: 'localhost',
  port: 3369,
  dialect: 'mysql'
})

try {
  console.log('Conectando ao banco...')
  await db.authenticate()
  console.log('✓ Conectado')
  
  console.log('Desabilitando verificação de chaves estrangeiras...')
  await db.query('SET FOREIGN_KEY_CHECKS=0')
  
  console.log('Dropando tabela Recipes...')
  await db.getQueryInterface().dropTable('Recipes', { force: true })
  console.log('✓ Tabela Recipes removida')
  
  console.log('Dropando tabela Users...')
  await db.getQueryInterface().dropTable('Users', { force: true })
  console.log('✓ Tabela Users removida')
  
  console.log('Reabilitando verificação de chaves estrangeiras...')
  await db.query('SET FOREIGN_KEY_CHECKS=1')
  
  console.log('Fechando conexão...')
  await db.close()
  console.log('✓ Feito')
  process.exit(0)
} catch (err) {
  console.error('✗ Erro:', err.message)
  process.exit(1)
}
