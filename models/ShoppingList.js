import Sequelize from 'sequelize'
import db from '../db/conn.js'
import User from './User.js'

const { DataTypes } = Sequelize

const ShoppingList = db.define('ShoppingList', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    required: true
  },
  quantity: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '1'
  },
  unit: {
    type: DataTypes.STRING,
    allowNull: true
  },
  origin: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Receita'
  },
  status: {
    type: DataTypes.ENUM('pending', 'bought'),
    allowNull: false,
    defaultValue: 'pending'
  }
})

ShoppingList.belongsTo(User)
User.hasMany(ShoppingList)

export default ShoppingList
