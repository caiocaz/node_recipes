import express from 'express'
import RecipeController from '../controllers/RecipeController.js'
import AiController from '../controllers/AiController.js'
import checkAuth from '../middlewares/authMiddleware.js'

const router = express.Router()

router.get('/', checkAuth, RecipeController.listRecipes)
router.get('/add', checkAuth, RecipeController.createRecipe)
router.get('/titles', checkAuth, AiController.getUserRecipeTitles)
router.get('/ai-suggestions', checkAuth, AiController.getAiRecipeSuggestions)
// Shopping list routes moved to dedicated router
// Legacy path: redirect to new shopping-list routes
router.get('/shopping-list', checkAuth, (req, res) => {
  return res.redirect('/shopping-list')
})
router.post('/import-suggestion', checkAuth, RecipeController.importSuggestion)
router.post('/add', checkAuth, (req, res, next) => {
  req.upload.single('image')(req, res, (err) => {
    if (err) {
      return res.render('recipes/create', {
        recipe: req.body,
        message: err.message
      })
    }
    next()
  })
}, RecipeController.saveRecipe)
router.get('/view/:id', checkAuth, RecipeController.showRecipe)
router.get('/edit/:id', checkAuth, RecipeController.editRecipe)
router.post('/edit', checkAuth, (req, res, next) => {
  req.upload.single('image')(req, res, (err) => {
    if (err) {
      return res.render('recipes/edit', {
        recipe: req.body,
        message: err.message
      })
    }
    next()
  })
}, RecipeController.updateRecipe)
router.post('/remove', checkAuth, RecipeController.deleteRecipe)

export default router
