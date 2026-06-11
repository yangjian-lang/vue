//连接数据库的配置
module.exports={
   db:{
    host: process.env.DB_HOST || 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
    port: process.env.DB_PORT || '4000',
    user: process.env.DB_USER || '3edPNbNBSsLR2d2.root',
    password: process.env.DB_PASSWORD || 'N0Jd6frZ13jxWDKY',
    database: process.env.DB_NAME || 'test',
    timezone: '+08:00',
    ssl: {
        rejectUnauthorized: true
    }
}

}