import User from '../models/User.js'
import bcrypt from 'bcryptjs'

export default class UserController {
  static register(req, res) {
    res.render('auth/register')
  }

  static async save(req, res) {
    const { name, email, password, confirmPassword } = req.body
    if (!name || !email || !password || !confirmPassword) {
      return res.render('auth/register', { message: 'Preencha todos os campos.', user: { name, email } })
    }
    if (password !== confirmPassword) {
      return res.render('auth/register', { message: 'Senhas não conferem.', user: { name, email } })
    }
    const strongPasswordError = UserController.validatePassword(password)
    if (strongPasswordError) {
      return res.render('auth/register', { message: strongPasswordError, user: { name, email } })
    }

    try {
      const existing = await User.findOne({ where: { email } })
      if (existing) {
        return res.render('auth/register', { message: 'Email já cadastrado.', user: { name, email } })
      }

      const salt = bcrypt.genSaltSync(10)
      const hashed = bcrypt.hashSync(password, salt)

      const newUser = {
        name,
        email,
        password: hashed
      }

      const created = await User.create(newUser)
      req.session.userId = created.id
      req.session.userName = created.name
      req.session.save(() => res.redirect('/recipes'))
    } catch (error) {
      console.error('save user - Erro:', error)
      res.status(500).send('Erro ao cadastrar usuário.')
    }
  }

  static async profile(req, res) {
    const id = req.session.userId
    try {
      const userData = await User.findOne({ where: { id }, raw: true })
      res.render('user/profile', { user: userData })
    } catch (error) {
      console.error('profile - Erro:', error)
      res.status(500).send('Erro ao carregar perfil.')
    }
  }

  static async edit(req, res) {
    const id = req.session.userId
    try {
      const userData = await User.findOne({ where: { id }, raw: true })
      res.render('user/edit', { user: userData })
    } catch (error) {
      console.error('edit - Erro:', error)
      res.status(500).send('Erro ao carregar edição de perfil.')
    }
  }

  static async update(req, res) {
    const id = req.session.userId
    const { name, email, password, confirmPassword } = req.body
    if (!name || !email) {
      req.flash('message', 'Nome e email são obrigatórios.')
      req.session.save(() => res.redirect('/profile/edit'))
      return
    }

    if (password || confirmPassword) {
      if (password !== confirmPassword) {
        req.flash('message', 'Senhas não conferem.')
        req.session.save(() => res.redirect('/profile/edit'))
        return
      }
      const strongPasswordError = UserController.validatePassword(password)
      if (strongPasswordError) {
        req.flash('message', strongPasswordError)
        req.session.save(() => res.redirect('/profile/edit'))
        return
      }
    }

    try {
      const updateData = { name, email }
      if (password) {
        const salt = bcrypt.genSaltSync(10)
        updateData.password = bcrypt.hashSync(password, salt)
      }

      await User.update(updateData, { where: { id } })
      req.session.userName = name
      req.flash('message', 'Perfil atualizado com sucesso!')
      req.session.save(() => res.redirect('/profile'))
    } catch (error) {
      console.error('update profile - Erro:', error)
      res.status(500).send('Erro ao atualizar perfil.')
    }
  }

  static validatePassword(password) {
    const minLength = 8
    const hasLower = /[a-z]/.test(password)
    const hasUpper = /[A-Z]/.test(password)
    const hasNumber = /[0-9]/.test(password)
    const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password)

    if (password.length < minLength) {
      return 'Senha deve ter pelo menos 8 caracteres.'
    }
    if (!hasLower || !hasUpper || !hasNumber || !hasSymbol) {
      return 'Senha forte deve incluir letras maiúsculas, minúsculas, números e símbolos.'
    }

    return null
  }

  static async delete(req, res) {
    const id = req.session.userId
    try {
      await User.destroy({ where: { id } })
      req.session.destroy(() => res.redirect('/'))
    } catch (error) {
      console.error('delete user - Erro:', error)
      res.status(500).send('Erro ao deletar usuário.')
    }
  }
}
