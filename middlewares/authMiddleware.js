export default function checkAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    req.flash('message', 'Faça login para acessar esta página.')
    req.session.save(() => {
      res.redirect('/login')
    })
    return
  }
  next()
}
