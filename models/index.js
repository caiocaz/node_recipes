import Recipe from './Recipe.js'
import User from './User.js'
import ShoppingList from './ShoppingList.js'

User.hasMany(Recipe)
Recipe.belongsTo(User)

User.hasMany(ShoppingList)
ShoppingList.belongsTo(User)

export { Recipe, User, ShoppingList }
