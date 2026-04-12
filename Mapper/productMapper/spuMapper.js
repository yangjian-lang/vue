const getConnection = require('../../dataBase/db')
const getAdminProduct= async (page,limit,category3Id)=>{
    let connection = null
    try {
        connection = await getConnection()
        const size=parseInt(limit)
        //计算偏移量
        const offset =parseInt((page-1)*limit)
        let countQuery = "select COUNT(*) as total from spu"
        let dataQuery = "select spu_id as id,spu_name as spuName,description,category3_id as category3Id,tm_id as tmId from spu"
        let params = []
        
        if (category3Id) {
            countQuery += " where category3_id = ?"
            dataQuery += " where category3_id = ?"
            params.push(category3Id)
        }
        
        dataQuery += " limit ? offset ?"
        params.push(size, offset)
        
        const [countRows] =await connection.query(countQuery, category3Id ? [category3Id] : [])
        const total=countRows[0].total
        const [row]=await connection.query(dataQuery, params)
        const result={}
        result.records=row
        result.total=total
        return result
    } finally {
        if (connection) {
            connection.release()
        }
    }
}
// 获取全部品牌的数据
const getTrademarkList= async ()=>{
    let connection = null
    try {
        connection = await getConnection()
        const [row]=await connection.query("select tm_id as id,tm_name as tmName,logo_url as logoUrl from trademark")
        return row
    } finally {
        if (connection) {
            connection.release()
        }
    }
}
//获取某个SPU下的全部的售卖商品的图片数据
const getSpuImageList= async (spuId)=>{
    let connection = null
    try {
        connection = await getConnection()
        const [row]=await connection.query("select image_id as id, image_name as imgName,image_url as imgUrl, spu_id as spuId from spu_image_list where spu_id=?",[spuId])
        return row
        // console.log(row)
    } finally {
        if (connection) {
            connection.release()
        }
    }
}
//
const getSpuSaleAttrList=async (spuId)=>{
    let connection = null
    try {
        connection = await getConnection()
        const [row]=await connection.query("select spu_sale_attr_id as id,base_sale_attr_id as baseSaleAttrId,sale_attr_name as saleAttrName, spu_id as spuId from spu_sale_attr where spu_id=?",[spuId])
        const result=[]
        // const spuSaleAttrValueList=[]
        for(let item of row){
            const [row1]=await connection.query("select sale_attr_value_id as id,sale_attr_value_name as saleAttrValueName,sale_attr_id as baseSaleAttrId, spu_id as spuId from sale_attr_value where spu_id=? and sale_attr_id=?",[item.spuId,item.baseSaleAttrId])
            console.log(item)
            item.spuSaleAttrValueList=row1
            result.push(item)
        }
        return result
        // console.log( result)
    } finally {
        if (connection) {
            connection.release()
        }
    }
}
const getBaseAttrList=async ()=>{
    let connection = null
    try {
        connection = await getConnection()
        const [row]= await connection.query("select sale_attr_id as id,sale_attr_name as name from sale_attr")
        return row
    } finally {
        if (connection) {
            connection.release()
        }
    }
}
// 完善后的删除SPU方法（带事务）
const deleteSpuBySpuId = async (spuId) => {
    let connection = null
    try {
        connection = await getConnection()
        // 1. 开启事务
        await connection.beginTransaction();

        // 2. 定义需要执行的四个删除SQL（注意执行顺序，先删子表再删主表）
        const deleteSqls = [
            'DELETE FROM spu_image_list WHERE spu_id = ?',
            'DELETE FROM spu_sale_attr WHERE spu_id = ?',
            'DELETE FROM sale_attr_value WHERE spu_id = ?',
            'DELETE FROM spu WHERE spu_id = ?'
        ];

        // 3. 依次执行每个删除操作
        for (const sql of deleteSqls) {
            const [result] = await connection.query(sql, [spuId]);
            console.log(`执行SQL: ${sql}，影响行数:`, result.affectedRows);
        }
        // 4. 所有操作成功，提交事务
        await connection.commit();
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error(`删除SPU ${spuId} 失败，事务已回滚:`, error);
    } finally {
        if (connection) {
            connection.release()
        }
    }
};
// 查看某一个已有的SPU下全部售卖的商品
const finBySpuId=async (spuId)=>{
    let connection = null
    try {
        connection = await getConnection()
        const [row]= await connection.query("select sku_id as id,spu_id as spuID,category_3_id,tm_id as tmId,sku_name as skuName,weight,price,sku_desc as skuDesc,sku_default_img as skuDefaultImg,is_sale as isSale from sku where spu_id=?",[spuId])
        return row
    } finally {
        if (connection) {
            connection.release()
        }
    }
}
//追加一个新的SPU
const saveSpuInfo = async (params) => {
    let connection = null
    try {
        connection = await getConnection()
        const { spuName, description, category3Id, tmId, spuImageList, spuSaleAttrList } = params;

        // 参数验证（移除id验证）
        if (!spuName || !category3Id || !tmId) {
            throw new Error('缺少必要参数');
        }

        // 开始事务
        await connection.beginTransaction();

        //生成唯一的 SPU ID（使用时间戳+随机数）
        const spuId = Date.now() + Math.floor(Math.random() * 1000);

        // 保存 SPU 主数据
        await connection.query(
            "INSERT INTO spu (spu_id, spu_name, description, category3_id, tm_id) VALUES (?, ?, ?, ?, ?)",
                [spuId, spuName, description, category3Id, tmId]
        );

        // 保存图片列表
        for (let item of spuImageList) {
            if (item.imgUrl && item.imgName) {
                const imageId = Date.now() + Math.floor(Math.random() * 1000); // 增加随机数避免冲突
                await connection.query(
                    "INSERT INTO spu_image_list (image_id, image_name, image_url, spu_id) VALUES (?, ?, ?, ?)",
                    [imageId, item.imgName, item.imgUrl, spuId]
                );
            }
        }

        // 保存销售属性和属性值
        for (let attrItem of spuSaleAttrList) {
            if (attrItem.baseSaleAttrId && attrItem.saleAttrName) {
                const spuSaleAttrId = Date.now() + Math.floor(Math.random() * 1000);
                // 保存销售属性
                await connection.query(
                    "INSERT INTO spu_sale_attr (spu_sale_attr_id, base_sale_attr_id, sale_attr_name, spu_id) VALUES (?, ?, ?, ?)",
                    [spuSaleAttrId, attrItem.baseSaleAttrId, attrItem.saleAttrName, spuId]
                );

                // 保存销售属性值
                if (attrItem.spuSaleAttrValueList && attrItem.spuSaleAttrValueList.length > 0) {
                    for (let valueItem of attrItem.spuSaleAttrValueList) {
                        if (valueItem.saleAttrValueName) {
                            const saleAttrValueId = Date.now() + Math.floor(Math.random() * 1000);
                            await connection.query(
                                "INSERT INTO sale_attr_value (sale_attr_value_id, sale_attr_value_name, sale_attr_id, spu_id) VALUES (?, ?, ?, ?)",
                                [saleAttrValueId, valueItem.saleAttrValueName, attrItem.baseSaleAttrId, spuId]
                            );
                        }
                    }
                }
            }
        }

        // 提交事务
        await connection.commit();
        console.log('SPU 信息保存成功，生成的 SPU ID:', spuId);
        return { success: true, message: '保存成功', spuId: spuId };
    } catch (error) {
        if (connection) {
            // 回滚事务
            await connection.rollback();
        }
        console.error('保存失败:', error);
        throw new Error('保存失败: ' + error.message);
    } finally {
        if (connection) {
            connection.release()
        }
    }
};
const updateSpuInfo = async (params) => {
    let connection = null
    try {
        connection = await getConnection()
        const { id, spuName, description, category3Id, tmId, spuImageList, spuSaleAttrList } = params;

        if (!id || !spuName || !category3Id || !tmId) {
            throw new Error('缺少必要参数');
        }

        console.log('更新SPU，ID：', id);
        console.log('图片列表：', spuImageList);

        await connection.beginTransaction();

        await connection.query(
            "UPDATE spu SET spu_name = ?, description = ?, category3_id = ?, tm_id = ? WHERE spu_id = ?",
                [spuName, description, category3Id, tmId, id]
        );

        await connection.query("DELETE FROM spu_image_list WHERE spu_id = ?", [id]);
        console.log('已删除旧图片');

        if (spuImageList && spuImageList.length > 0) {
            for (let item of spuImageList) {
                if (item.imgUrl && item.imgName) {
                    const imageId = Date.now() + Math.floor(Math.random() * 1000);
                    await connection.query(
                        "INSERT INTO spu_image_list (image_id, image_name, image_url, spu_id) VALUES (?, ?, ?, ?)",
                        [imageId, item.imgName, item.imgUrl, id]
                    );
                    console.log('已保存图片：', item.imgName, item.imgUrl);
                } else {
                    console.log('跳过无效图片：', item);
                }
            }
        } else {
            console.log('无图片需要保存');
        }

        // 处理销售属性和属性值
        for (let attrItem of spuSaleAttrList) {
            if (attrItem.baseSaleAttrId && attrItem.saleAttrName) {
                let spuSaleAttrId;
                if (attrItem.id) {
                    // 数据库查出来的，更新
                    spuSaleAttrId = attrItem.id;
                    await connection.query(
                        "UPDATE spu_sale_attr SET base_sale_attr_id = ?, sale_attr_name = ? WHERE spu_sale_attr_id = ?",
                        [attrItem.baseSaleAttrId, attrItem.saleAttrName, attrItem.id]
                    );
                    console.log('已更新销售属性：', attrItem.id);
                } else {
                    // 手动添加的，插入
                    spuSaleAttrId = Date.now() + Math.floor(Math.random() * 1000);
                    await connection.query(
                        "INSERT INTO spu_sale_attr (spu_sale_attr_id, base_sale_attr_id, sale_attr_name, spu_id) VALUES (?, ?, ?, ?)",
                        [spuSaleAttrId, attrItem.baseSaleAttrId, attrItem.saleAttrName, id]
                    );
                    console.log('已插入新销售属性：', spuSaleAttrId);
                }

                if (attrItem.spuSaleAttrValueList && attrItem.spuSaleAttrValueList.length > 0) {
                    // 对前端发送的属性值列表进行去重，以saleAttrValueName为key
                    const valueMap = new Map();
                    attrItem.spuSaleAttrValueList.forEach((value) => {
                        valueMap.set(value.saleAttrValueName, value);
                    });
                    const uniqueSpuSaleAttrValueList = Array.from(valueMap.values());
                    console.log('去重后的销售属性值列表：', uniqueSpuSaleAttrValueList);

                    // 先删除当前销售属性的所有属性值
                    const saleAttrId = attrItem.id || attrItem.baseSaleAttrId;
                    await connection.query(
                        "DELETE FROM sale_attr_value WHERE spu_id = ? AND sale_attr_id = ?",
                        [id, saleAttrId]
                    );
                    console.log('已删除当前销售属性的所有属性值，saleAttrId：', saleAttrId);

                    // 重新插入去重后的属性值
                    for (let valueItem of uniqueSpuSaleAttrValueList) {
                        if (valueItem.saleAttrValueName) {
                            // 插入新属性值
                            const saleAttrValueId = Date.now() + Math.floor(Math.random() * 1000);
                            await connection.query(
                                "INSERT INTO sale_attr_value (sale_attr_value_id, sale_attr_value_name, sale_attr_id, spu_id) VALUES (?, ?, ?, ?)",
                                [saleAttrValueId, valueItem.saleAttrValueName, saleAttrId, id]
                            );
                            console.log('已插入新销售属性值：', saleAttrValueId, 'saleAttrId：', saleAttrId);
                        }
                    }
                }
            }
        }

        // 删除被用户删除的销售属性
        // 首先获取前端发送的所有销售属性的baseSaleAttrId
        const sentBaseSaleAttrIds = spuSaleAttrList.map((item) => item.baseSaleAttrId).filter((id) => id);
        console.log('前端发送的销售属性baseSaleAttrId：', sentBaseSaleAttrIds);
        // 获取数据库中当前SPU的所有销售属性
        const [existingAttrs] = await connection.query(
            "SELECT spu_sale_attr_id as id, base_sale_attr_id FROM spu_sale_attr WHERE spu_id = ?",
            [id]
        );
        console.log('数据库中的销售属性：', existingAttrs);
        // 找出被删除的销售属性ID
        const deletedAttrs = existingAttrs.filter((item) => !sentBaseSaleAttrIds.includes(item.base_sale_attr_id));
        console.log('被删除的销售属性：', deletedAttrs);
        // 删除被删除的销售属性及其对应的属性值
        for (let attr of deletedAttrs) {
            // 删除对应的属性值
            await connection.query(
                "DELETE FROM sale_attr_value WHERE spu_id = ? AND sale_attr_id = ?",
                [id, attr.base_sale_attr_id]
            );
            // 删除销售属性
            await connection.query(
                "DELETE FROM spu_sale_attr WHERE spu_sale_attr_id = ?",
                [attr.id]
            );
            console.log('已删除销售属性及其值：', attr.id);
        }

        await connection.commit();
        console.log('SPU 信息更新成功，SPU ID:', id);
        return { success: true, message: '更新成功', spuId: id };
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error('更新失败:', error);
        throw new Error('更新失败: ' + error.message);
    } finally {
        if (connection) {
            connection.release()
        }
    }
};
const saveSkuInfo=async (params)=>{
    let connection = null
    try {
        connection = await getConnection()
        const { skuName, price, weight, skuDesc, skuAttrValueList, skuSaleAttrValueList, skuDefaultImg, spuId, tmId, category3Id } = params;

        if (!skuName || !price || !weight || !spuId || !tmId || !category3Id) {
            throw new Error('缺少必要参数');
        }

        await connection.beginTransaction();

        const skuId = Date.now() + Math.floor(Math.random() * 1000);

        await connection.query(
            "INSERT INTO sku (sku_id, spu_id, category_3_id, tm_id, sku_name, weight, price, sku_desc, sku_default_img, is_sale) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [skuId, spuId, category3Id, tmId, skuName, weight, price, skuDesc, skuDefaultImg, 1]
        );

        if (skuAttrValueList && skuAttrValueList.length > 0) {
            for (let item of skuAttrValueList) {
                if (item.attrId && item.valueId) {
                    const [attrNameResult] = await connection.query("SELECT attr_name FROM attr WHERE attr_id = ?", [item.attrId]);
                    const [valueNameResult] = await connection.query("SELECT value_name FROM attr_value WHERE attr_value_id = ?", [item.valueId]);
                    
                    if (attrNameResult.length > 0 && valueNameResult.length > 0) {
                        const skuAttrValueId = Date.now() + Math.floor(Math.random() * 1000);
                        await connection.query(
                            "INSERT INTO sku_attr_value (sku_attr_value_id, attr_id, value_id, value_name, attr_name, sku_id) VALUES (?, ?, ?, ?, ?, ?)",
                            [skuAttrValueId, item.attrId, item.valueId, valueNameResult[0].value_name, attrNameResult[0].attr_name, skuId]
                        );
                    }
                }
            }
        }

        if (skuSaleAttrValueList && skuSaleAttrValueList.length > 0) {
            for (let item of skuSaleAttrValueList) {
                if (item.saleAttrId && item.saleAttrValueId) {
                    const [saleAttrNameResult] = await connection.query("SELECT sale_attr_name FROM spu_sale_attr WHERE spu_sale_attr_id = ?", [item.saleAttrId]);
                    const [saleAttrValueNameResult] = await connection.query("SELECT sale_attr_value_name FROM sale_attr_value WHERE sale_attr_value_id = ?", [item.saleAttrValueId]);
                    
                    if (saleAttrNameResult.length > 0 && saleAttrValueNameResult.length > 0) {
                        const skuSaleAttrValueId = Date.now() + Math.floor(Math.random() * 1000);
                        await connection.query(
                            "INSERT INTO sku_sale_attr_value (sku_sale_attr_value_id, sale_attr_id, sale_attr_value_id, sale_attr_name, sale_attr_value_name, sku_id) VALUES (?, ?, ?, ?, ?, ?)",
                            [skuSaleAttrValueId, item.saleAttrId, item.saleAttrValueId, saleAttrNameResult[0].sale_attr_name, saleAttrValueNameResult[0].sale_attr_value_name, skuId]
                        );
                    }
                }
            }
        }

        await connection.commit();
        console.log('SKU 信息保存成功，生成的 SKU ID:', skuId);
        return { success: true, message: '保存成功', skuId: skuId };
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error('保存 SKU 失败:', error);
        throw new Error('保存失败: ' + error.message);
    } finally {
        if (connection) {
            connection.release()
        }
    }
}
module.exports={
    getAdminProduct,
    getTrademarkList,
    getSpuImageList,
    getSpuSaleAttrList,
    getBaseAttrList,
    deleteSpuBySpuId,
    finBySpuId,
    saveSpuInfo,
    updateSpuInfo,
    saveSkuInfo
}