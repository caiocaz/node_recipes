import Sequelize from 'sequelize'
import db from '../db/conn.js'
import User from './User.js'

const { DataTypes } = Sequelize

const Recipe = db.define('Recipe', {
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    required: true
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false,
    required: true
  },
  ingredients: {
    type: DataTypes.TEXT,
    allowNull: false,
    required: true
  },
  preparation: {
    type: DataTypes.TEXT,
    allowNull: false,
    required: true
  },
  image: {
    type: DataTypes.STRING,
    allowNull: true
  },
  link: {
    type: DataTypes.STRING,
    allowNull: true
  }
})

Recipe.belongsTo(User)
User.hasMany(Recipe)

export default Recipe
