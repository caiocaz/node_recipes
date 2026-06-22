import ShoppingList from '../models/ShoppingList.js'

export default class ShoppingListController {
  static normalizeShoppingItem(item) {
    return {
      name: String(item.name || '').trim(),
      quantity: String(item.quantity || '').trim() || '1',
      unit: String(item.unit || '').trim(),
      origin: String(item.origin || 'Receita').trim(),
      status: item.status === 'bought' ? 'bought' : 'pending'
    }
  }

  static async findShoppingListItems(userId) {
    return ShoppingList.findAll({
      where: { UserId: userId },
      order: [['id', 'ASC']]
    })
  }

  static async upsertShoppingListItem(userId, rawItem) {
    const item = ShoppingListController.normalizeShoppingItem(rawItem)
    if (!item.name) {
      throw new Error('Nome do ingrediente é obrigatório.')
    }

    const existing = await ShoppingList.findOne({
      where: {
        UserId: userId,
        name: item.name,
        unit: item.unit
      }
    })

    if (existing) {
      const existingQuantity = Number(existing.quantity)
      const newQuantity = Number(item.quantity)
      existing.quantity = Number.isFinite(existingQuantity) && Number.isFinite(newQuantity)
        ? String(existingQuantity + newQuantity)
        : item.quantity
      if (!existing.origin.includes(item.origin)) {
        existing.origin = `${existing.origin}, ${item.origin}`
      }
      await existing.save()
      return existing
    }

    return ShoppingList.create({
      ...item,
      UserId: userId
    })
  }

  static async shoppingList(req, res) {
    try {
      const userId = req.session.userId
      const items = await ShoppingListController.findShoppingListItems(userId)
      const shoppingListItems = items.map(item => item.get({ plain: true }))

      res.render('recipes/shopping-list', {
        shoppingListItems,
        shoppingListItemsRaw: JSON.stringify(shoppingListItems)
      })
    } catch (error) {
      console.error('Erro em shoppingList:', error)
      res.status(500).render('error', { message: 'Erro ao abrir a lista de compras' })
    }
  }

  static async addShoppingListItem(req, res) {
    try {
      const userId = req.session.userId
      const item = req.body
      const created = await ShoppingListController.upsertShoppingListItem(userId, item)
      return res.json(created)
    } catch (error) {
      console.error('Erro em addShoppingListItem:', error)
      return res.status(500).json({ message: error.message || 'Erro ao adicionar item à lista de compras.' })
    }
  }

  static async addShoppingListFromRecipe(req, res) {
    try {
      const userId = req.session.userId
      const items = Array.isArray(req.body) ? req.body : req.body.ingredients || []
      const normalizedItems = items
        .map(ShoppingListController.normalizeShoppingItem)
        .filter(item => item.name)

      if (!normalizedItems.length) {
        return res.status(400).json({ message: 'Receita sem ingredientes válidos.' })
      }

      for (const item of normalizedItems) {
        await ShoppingListController.upsertShoppingListItem(userId, item)
      }

      const updatedItems = await ShoppingListController.findShoppingListItems(userId)
      return res.json(updatedItems.map(item => item.get({ plain: true })))
    } catch (error) {
      console.error('Erro em addShoppingListFromRecipe:', error)
      return res.status(500).json({ message: 'Erro ao adicionar ingredientes da receita.' })
    }
  }

  static async getShoppingListItems(req, res) {
    try {
      const userId = req.session.userId
      const items = await ShoppingListController.findShoppingListItems(userId)
      return res.json(items.map(item => item.get({ plain: true })))
    } catch (error) {
      console.error('Erro em getShoppingListItems:', error)
      return res.status(500).json({ message: 'Erro ao buscar itens da lista de compras.' })
    }
  }

  static async updateShoppingListItem(req, res) {
    try {
      const userId = req.session.userId
      const { id } = req.params
      const item = await ShoppingList.findOne({ where: { id, UserId: userId } })

      if (!item) {
        return res.status(404).json({ message: 'Item não encontrado.' })
      }

      const updated = ShoppingListController.normalizeShoppingItem({
        ...item.get({ plain: true }),
        ...req.body
      })

      item.name = updated.name
      item.quantity = updated.quantity
      item.unit = updated.unit
      item.origin = updated.origin
      item.status = updated.status
      await item.save()

      return res.json(item)
    } catch (error) {
      console.error('Erro em updateShoppingListItem:', error)
      return res.status(500).json({ message: 'Erro ao atualizar item da lista de compras.' })
    }
  }

  static async deleteShoppingListItem(req, res) {
    try {
      const userId = req.session.userId
      const { id } = req.params
      const deleted = await ShoppingList.destroy({ where: { id, UserId: userId } })
      if (!deleted) {
        return res.status(404).json({ message: 'Item não encontrado.' })
      }
      return res.json({ success: true })
    } catch (error) {
      console.error('Erro em deleteShoppingListItem:', error)
      return res.status(500).json({ message: 'Erro ao remover item da lista de compras.' })
    }
  }

  static async clearShoppingList(req, res) {
    try {
      const userId = req.session.userId
      await ShoppingList.destroy({ where: { UserId: userId } })
      return res.json({ success: true })
    } catch (error) {
      console.error('Erro em clearShoppingList:', error)
      return res.status(500).json({ message: 'Erro ao limpar lista de compras.' })
    }
  }
}
