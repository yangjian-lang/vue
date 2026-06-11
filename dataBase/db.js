//连接数据库
//db.js

const mysql = require('mysql2/promise')
const { timezone, ...dbConfig } = require('./config').db

const pool = mysql.createPool({
    ...dbConfig,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
})

// 连接池里每条连接创建时就设为东八区（Render 服务器本身是 UTC，必须在这里设）
pool.on('connection', (connection) => {
    connection.query("SET time_zone = '+08:00'")
})

console.log('正在测试数据库连接...')
;(async () => {
    try {
        const connection = await pool.getConnection()
        console.log('数据库连接成功!')
        connection.release()
    } catch (error) {
        console.error('数据库连接失败:', error)
    }
})()

module.exports = async () => {
    try {
        const connection = await pool.getConnection()
        await connection.query("SET time_zone = '+08:00'")
        return connection
    } catch (error) {
        console.error('获取数据库连接失败:', error)
        throw error
    }
}
