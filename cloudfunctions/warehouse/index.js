// 仓库云函数
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 获取公开仓库列表
async function getWarehouses(event, context) {
  const { keyword, start = 0, limit = 20 } = event

  let query = db.collection('warehouses').where({
    is_public: true
  })

  if (keyword) {
    query = query.where({
      is_public: true,
      name: db.RegExp({
        regexp: keyword,
        options: 'i'
      })
    })
  }

  const res = await query
    .orderBy('created_at', 'desc')
    .skip(start)
    .limit(limit)
    .get()

  return res
}

// 获取仓库详情
async function getWarehouseDetail(event, context) {
  const { warehouseId } = event

  const warehouseRes = await db.collection('warehouses').doc(warehouseId).get()

  if (!warehouseRes.data) {
    throw new Error('仓库不存在')
  }

  const warehouse = warehouseRes.data

  // 获取商品列表
  const productsRes = await db.collection('products').where({
    warehouse_id: warehouseId
  }).orderBy('created_at', 'desc').get()

  // 获取所有者信息
  let owner = null
  if (warehouse.owner_id) {
    const ownerRes = await db.collection('users').doc(warehouse.owner_id).get()
    owner = ownerRes.data
  }

  return {
    warehouse,
    products: productsRes.data,
    owner: owner ? {
      nickname: owner.nickname,
      avatar: owner.avatar
    } : null
  }
}

// 创建仓库
async function createWarehouse(event, context) {
  const wxContext = cloud.getWXContext()
  const { name, description, is_public } = event

  if (!name) {
    throw new Error('仓库名称不能为空')
  }

  const res = await db.collection('warehouses').add({
    data: {
      _id: wxContext.OPENID + '_' + Date.now(),
      owner_id: wxContext.OPENID,
      name,
      description: description || '',
      is_public: is_public !== undefined ? is_public : false,
      created_at: db.serverDate()
    }
  })

  return res
}

// 更新仓库
async function updateWarehouse(event, context) {
  const wxContext = cloud.getWXContext()
  const { warehouseId, name, description, is_public } = event

  // 验证仓库所有权
  const warehouseRes = await db.collection('warehouses').doc(warehouseId).get()
  if (!warehouseRes.data) {
    throw new Error('仓库不存在')
  }
  if (warehouseRes.data.owner_id !== wxContext.OPENID) {
    throw new Error('无权操作此仓库')
  }

  const updateData = {}
  if (name !== undefined) updateData.name = name
  if (description !== undefined) updateData.description = description
  if (is_public !== undefined) updateData.is_public = is_public
  updateData.updated_at = db.serverDate()

  await db.collection('warehouses').doc(warehouseId).update({
    data: updateData
  })

  return { success: true }
}

// 获取我的仓库
async function getMyWarehouses(event, context) {
  const wxContext = cloud.getWXContext()

  const res = await db.collection('warehouses').where({
    owner_id: wxContext.OPENID
  }).orderBy('created_at', 'desc').get()

  return res
}

// 云函数入口
exports.main = async (event, context) => {
  const { action } = event

  switch (action) {
    case 'getWarehouses':
      return await getWarehouses(event, context)
    case 'getWarehouseDetail':
      return await getWarehouseDetail(event, context)
    case 'createWarehouse':
      return await createWarehouse(event, context)
    case 'updateWarehouse':
      return await updateWarehouse(event, context)
    case 'getMyWarehouses':
      return await getMyWarehouses(event, context)
    default:
      throw new Error('未知操作')
  }
}
