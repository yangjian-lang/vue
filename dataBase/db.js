//连接数据库
//db.js

const mysql = require('mysql2/promise')
const config = require('./config').db
//创建数据库连接池
const pool = mysql.createPool({
    ...config,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
})

// 测试数据库连接
console.log('正在测试数据库连接...');
(async () => {
    try {
        const connection = await pool.getConnection()
        console.log('数据库连接成功!')
        connection.release()
    } catch (error) {
        console.error('数据库连接失败:', error)
    }
})()

//获取数据库连接
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
