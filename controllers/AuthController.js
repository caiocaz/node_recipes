import User from '../models/User.js'
import bcrypt from 'bcryptjs'

export default class AuthController {
  static login(req, res) {
    res.render('auth/login')
  }

  static async loginPost(req, res) {
    const { email, password } = req.body
    if (!email || !password) {
      return res.render('auth/login', { message: 'Preencha email e senha.' })
    }

    try {
      const user = await User.findOne({ where: { email } })
      if (!user) {
        return res.render('auth/login', { message: 'Usuário não encontrado.' })
      }

      const passwordMatch = bcrypt.compareSync(password, user.password)
      if (!passwordMatch) {
        return res.render('auth/login', { message: 'Senha incorreta.' })
      }

      req.session.userId = user.id
      req.session.userName = user.name
      req.session.save(() => {
        res.redirect('/recipes')
      })
    } catch (error) {
      console.error('loginPost - Erro:', error)
      res.status(500).send('Erro ao efetuar login.')
    }
  }

  static logout(req, res) {
    req.session.destroy(() => {
      res.redirect('/login')
    })
  }
}
