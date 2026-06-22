import Sequelize from 'sequelize'

const conn = new Sequelize('noderecipes', 'root', 'root', {
  host: 'localhost',
  port: 3369,
  dialect: 'mysql'
})

conn.authenticate()
  .then(() => {
    console.log('Conexão com banco de dados de receitas estabelecida com sucesso.')
  })
  .catch(err => {
    console.error('Erro ao conectar ao banco de dados de receitas:', err)
  })

export default conn
