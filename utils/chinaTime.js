// 生成北京时间字符串，写入数据库时使用参数绑定，避免 SQL 表达式与时区叠加
function getChinaTimeString() {
    return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai' })
}

module.exports = { getChinaTimeString }
