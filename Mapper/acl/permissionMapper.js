const getConnection = require('../../dataBase/db')
const { DB_NOW } = require('../../utils/chinaTime')

// 查询所有菜单（树形结构）
const getMenuList = async () => {
    let connection = null
    try {
        connection = await getConnection()
        const [rows] = await connection.query(
            `SELECT menu_id, name, pid, code, to_code, type, status, level,
                    DATE_FORMAT(create_time, '%Y-%m-%d %H:%i:%s') as createTime,
                    DATE_FORMAT(update_time, '%Y-%m-%d %H:%i:%s') as updateTime
             FROM menu`
        )

        // 转换字段名为驼峰命名
        const menuList = rows.map(row => ({
            id: row.menu_id,
            name: row.name,
            pid: row.pid,
            code: row.code,
            toCode: row.to_code,
            type: row.type,
            status: row.status || '',
            level: row.level,
            createTime: row.createTime,
            updateTime: row.updateTime,
            select: false,
            children: null
        }))

        // 构建树形结构
        const map = {}
        const tree = []

        // 创建映射
        menuList.forEach(item => {
            map[item.id] = item
        })

        // 构建树
        menuList.forEach(item => {
            if (item.pid === 0) {
                tree.push(item)
            } else if (map[item.pid]) {
                if (!map[item.pid].children) {
                    map[item.pid].children = []
                }
                map[item.pid].children.push(item)
            }
        })

        return tree
    } finally {
        if (connection) {
            connection.release()
        }
    }
}
// 新增子菜单
const permissionSave = async (params) => {
    let connection = null
    try {
        connection = await getConnection()
        const { name, pid, code, type, level } = params
        const menuId = Date.now()

        // 1. 检查菜单名称是否已存在
        const [countRows] = await connection.query(
            `SELECT COUNT(1) as count FROM menu WHERE name = ?`,
            [name]
        )

        if (countRows[0].count > 0) {
            throw new Error('菜单名称已存在')
        }

        // 2. 插入新菜单/权限
        await connection.query(
            `INSERT INTO menu(menu_id, name, pid, code, to_code, type, status, level, create_time, update_time)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ${DB_NOW}, ${DB_NOW})`,
            [menuId, name, pid, code, '', type, '0', level]
        )
    } finally {
        if (connection) {
            connection.release()
        }
    }
}
// 更新菜单
const permissionUpdate = async (params) => {
    let connection = null
    try {
        connection = await getConnection()
        const { id, name, pid, code, level } = params

        await connection.query(
            `UPDATE menu SET name = ?, pid = ?, code = ?, level = ?, update_time = ${DB_NOW} WHERE menu_id = ?`,
            [name, pid, code, level, id]
        )
    } finally {
        if (connection) {
            connection.release()
        }
    }
}
// 删除菜单
const permissionDelete = async (id) => {
    let connection = null
    try {
        connection = await getConnection()
        // 1. 检查是否有子菜单
        const [countRows] = await connection.query(
            `SELECT COUNT(1) as count FROM menu WHERE pid = ?`,
            [id]
        )

        if (countRows[0].count > 0) {
            throw new Error('该菜单下存在子菜单，不能删除')
        }

        // 2. 删除菜单
        await connection.query(
            `DELETE FROM menu WHERE menu_id = ?`,
            [id]
        )
    } finally {
        if (connection) {
            connection.release()
        }
    }
}

module.exports = {
    getMenuList,
    permissionSave,
    permissionUpdate,
    permissionDelete
}
