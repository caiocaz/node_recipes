import express from 'express'
import ShoppingListController from '../controllers/ShoppingListController.js'
import checkAuth from '../middlewares/authMiddleware.js'

const router = express.Router()

router.get('/shopping-list', checkAuth, ShoppingListController.shoppingList)
router.get('/shopping-list/items', checkAuth, ShoppingListController.getShoppingListItems)
router.post('/shopping-list/items', checkAuth, ShoppingListController.addShoppingListItem)
router.post('/shopping-list/add-from-recipe', checkAuth, ShoppingListController.addShoppingListFromRecipe)
router.put('/shopping-list/items/:id', checkAuth, ShoppingListController.updateShoppingListItem)
router.delete('/shopping-list/items/:id', checkAuth, ShoppingListController.deleteShoppingListItem)
router.post('/shopping-list/clear', checkAuth, ShoppingListController.clearShoppingList)

export default router
