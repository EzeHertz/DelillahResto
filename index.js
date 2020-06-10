const Sequelize = require('sequelize');

const sequelize = new Sequelize ('mysql://root:password@localhost:3306/DelillahResto');

module.exports = {sequelize: sequelize};