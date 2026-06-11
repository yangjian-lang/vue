//查询数据库方法
const getConnection = require('./db')

// 用户登录
const userLogin = async (username, password) => {
    let connection = null
    try {
        connection = await getConnection()
        console.log("select * from user where username=? and password =?", [username, password])
        const [rows] = await connection.query("select * from user where username=? and password =?", [username, password])
        return rows
    } finally {
        if (connection) {
            connection.release()
        }
    }
};

// 获取用户权限信息
const getUserPermissions = async (userId) => {
    let connection = null
    try {
        connection = await getConnection()

        // 1. 通过 id 查询用户基本信息
        console.log('查询用户基本信息，userId:', userId)
        const [userRows] = await connection.query("SELECT id, user_id, username, name, avatar FROM user WHERE id = ?", [userId])
        console.log('查询到的用户信息:', userRows)
        if (userRows.length === 0) {
            console.log('用户不存在，userId:', userId)
            return null
        }
        const userInfo = userRows[0]
        console.log('用户信息:', userInfo)

        // 2. 查询所有用户，看看数据库中有什么
        console.log('查询所有用户')
        const [allUsers] = await connection.query("SELECT id, user_id, username, name FROM user")
        console.log('所有用户:', allUsers)

        // 3. 查询所有角色，看看数据库中有什么
        console.log('查询所有角色')
        const [allRoles] = await connection.query("SELECT role_id, role_name FROM role")
        console.log('所有角色:', allRoles)

        // 4. 查询用户的角色（同时尝试 user_id 和 id）
        console.log('查询用户角色，userId:', userId, 'userInfo.user_id:', userInfo.user_id)
        const [roleRows] = await connection.query(`
            SELECT DISTINCT r.role_id, r.role_name
            FROM role r
            INNER JOIN user_role ur ON r.role_id = ur.role_id
            WHERE ur.user_id = ? OR ur.user_id = ?
        `, [userId, userInfo.user_id])
        console.log('查询到的角色信息:', roleRows)
        const roles = roleRows.map(row => row.role_name)
        const roleIds = roleRows.map(row => row.role_id)
        console.log('用户角色:', roles, '角色ID:', roleIds)

        // 5. 查询所有角色菜单关系，看看数据库中有什么
        console.log('查询所有角色菜单关系')
        const [allRoleMenus] = await connection.query("SELECT role_id, menu_id FROM role_menu")
        console.log('所有角色菜单关系:', allRoleMenus)

        // 6. 查询用户的菜单权限
        let menuRows = []
        if (roleIds.length > 0) {
            // 直接查询所有角色的菜单权限
            console.log('查询用户菜单权限，roleIds:', roleIds)
            for (const roleId of roleIds) {
                const [rows] = await connection.query(`
                    SELECT DISTINCT m.menu_id, m.name, m.code, m.type
                    FROM menu m
                    INNER JOIN role_menu rm ON m.menu_id = rm.menu_id
                    WHERE rm.role_id = ?
                `, [roleId])
                menuRows = [...menuRows, ...rows]
                console.log('角色', roleId, '的菜单权限:', rows)
            }
            console.log('查询到的菜单权限:', menuRows)
        } else {
            console.log('用户没有角色，userId:', userId)
        }

        // 7. 查询所有菜单，看看数据库中有什么
        console.log('查询所有菜单')
        const [allMenus] = await connection.query("SELECT menu_id, name, code, type FROM menu")
        console.log('所有菜单:', allMenus)

        // 分离路由和按钮权限
        const routes = []
        const buttons = []
        menuRows.forEach(menu => {
            if (menu.type === 1) {
                // type=1 是菜单/路由，返回前端路由名称
                let routeName = menu.name
                // 根据菜单名称或代码映射到前端路由名称
                if (menu.code) {
                    // 优先使用代码作为路由名称
                    routeName = menu.code
                } else {
                    // 根据菜单名称映射到前端路由名称
                    switch (menu.name) {
                        case '权限管理':
                            routeName = 'Acl'
                            break
                        case '用户管理':
                            routeName = 'User'
                            break
                        case '角色管理':
                            routeName = 'Role'
                            break
                        case '菜单管理':
                            routeName = 'Permission'
                            break
                        case '商品管理':
                            routeName = 'Product'
                            break
                        case '品牌管理':
                            routeName = 'Trademark'
                            break
                        case '属性管理':
                            routeName = 'Attr'
                            break
                        case 'SPU管理':
                            routeName = 'Spu'
                            break
                        case 'SKU管理':
                            routeName = 'Sku'
                            break
                        case '分类管理':
                            routeName = 'Category'
                            break
                    }
                }
                // 去重
                if (!routes.includes(routeName)) {
                    routes.push(routeName)
                }
            } else if (menu.type === 2 && menu.code.startsWith('btn.')) {
                // type=2 是按钮
                if (!buttons.includes(menu.code)) {
                    buttons.push(menu.code)
                }
            }
        })

        // 临时为管理员添加所有权限，以便测试
        if (userInfo.username === 'admin') {
            console.log('为管理员添加所有权限')
            const adminRoutes = ['Acl', 'User', 'Role', 'Permission', 'Product', 'Trademark', 'Attr', 'Spu', 'Sku', 'Category']
            adminRoutes.forEach(route => {
                if (!routes.includes(route)) {
                    routes.push(route)
                }
            })
        }

        console.log('返回的路由权限:', routes)
        console.log('返回的按钮权限:', buttons)

        return {
            routes,
            buttons,
            roles,
            name: userInfo.username,
            avatar: userInfo.avatar
        }
    } catch (error) {
        console.error('获取用户权限失败:', error)
        throw error
    } finally {
        if (connection) {
            connection.release()
        }
    }
}

// 分页查询属性列表
const attrList = async (page = 1, limit = 10) => {
    let connection = null
    try {
        connection = await getConnection()

        // 计算偏移量
        const offset = (page - 1) * limit

        // 查询总记录数
        const [countRows] = await connection.query("SELECT COUNT(*) as total FROM attr")
        const total = countRows[0].total

        // 查询当前页数据
        const [dataRows] = await connection.query("SELECT * FROM attr LIMIT ? OFFSET ?", [limit, offset])

        return {
            data: dataRows,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    } finally {
        if (connection) {
            connection.release()
        }
    }
}

module.exports = {
    userLogin,
    getUserPermissions,
    attrList
}
