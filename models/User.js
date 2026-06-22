import Sequelize from 'sequelize'
import db from '../db/conn.js'

const { DataTypes } = Sequelize

const User = db.define('User', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    required: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    required: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    required: true
  }
})

export default User
