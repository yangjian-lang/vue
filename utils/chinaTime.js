// 在 SQL 中显式计算北京时间，不依赖 Node/数据库服务器时区
const CHINA_NOW = 'DATE_ADD(UTC_TIMESTAMP(), INTERVAL 8 HOUR)'

module.exports = { CHINA_NOW }
