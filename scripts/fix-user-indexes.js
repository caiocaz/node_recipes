import conn from '../db/conn.js'

(async function() {
  try {
    const [rows] = await conn.query("SHOW INDEX FROM Users")
    const emailIndexes = rows.filter(r => r.Column_name === 'email' && r.Key_name !== 'PRIMARY')
    if (!emailIndexes.length) {
      console.log('Nenhum índice duplicado de email encontrado.')
      process.exit(0)
    }

    // Keep the first index, drop the rest
    const toKeep = emailIndexes[0].Key_name
    const toDrop = emailIndexes.slice(1).map(r => r.Key_name)

    for (const idx of toDrop) {
      console.log('Dropping index', idx)
      await conn.query(`ALTER TABLE Users DROP INDEX \`${idx}\``)
    }

    console.log('Índices duplicados removidos. Mantido:', toKeep)
    process.exit(0)
  } catch (err) {
    console.error('Erro ao ajustar índices de Users:', err)
    process.exit(1)
  }
})()
