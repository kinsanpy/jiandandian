// 商品云函数
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 添加商品
async function addProduct(event, context) {
  const wxContext = cloud.getWXContext()
  const { warehouse_id, name, sku, stock, unit, price, description } = event

  if (!warehouse_id || !name) {
    throw new Error('仓库ID和商品名称不能为空')
  }

  // 验证仓库所有权
  const warehouseRes = await db.collection('warehouses').doc(warehouse_id).get()
  if (!warehouseRes.data) {
    throw new Error('仓库不存在')
  }
  if (warehouseRes.data.owner_id !== wxContext.OPENID) {
    throw new Error('无权在此仓库添加商品')
  }

  const res = await db.collection('products').add({
    data: {
      _id: warehouse_id + '_' + Date.now(),
      warehouse_id,
      name,
      sku: sku || '',
      stock: stock !== undefined ? stock : 0,
      unit: unit || '个',
      price: price !== undefined ? price : 0,
      description: description || '',
      created_at: db.serverDate()
    }
  })

  return res
}

// 更新商品
async function updateProduct(event, context) {
  const wxContext = cloud.getWXContext()
  const { productId, name, sku, stock, unit, price, description } = event

  // 验证商品存在和所有权
  const productRes = await db.collection('products').doc(productId).get()
  if (!productRes.data) {
    throw new Error('商品不存在')
  }

  // 验证仓库所有权
  const warehouseRes = await db.collection('warehouses').doc(productRes.data.warehouse_id).get()
  if (!warehouseRes.data || warehouseRes.data.owner_id !== wxContext.OPENID) {
    throw new Error('无权操作此商品')
  }

  const updateData = {}
  if (name !== undefined) updateData.name = name
  if (sku !== undefined) updateData.sku = sku
  if (stock !== undefined) updateData.stock = stock
  if (unit !== undefined) updateData.unit = unit
  if (price !== undefined) updateData.price = price
  if (description !== undefined) updateData.description = description
  updateData.updated_at = db.serverDate()

  await db.collection('products').doc(productId).update({
    data: updateData
  })

  return { success: true }
}

// 删除商品
async function deleteProduct(event, context) {
  const wxContext = cloud.getWXContext()
  const { productId } = event

  // 验证商品存在和所有权
  const productRes = await db.collection('products').doc(productId).get()
  if (!productRes.data) {
    throw new Error('商品不存在')
  }

  // 验证仓库所有权
  const warehouseRes = await db.collection('warehouses').doc(productRes.data.warehouse_id).get()
  if (!warehouseRes.data || warehouseRes.data.owner_id !== wxContext.OPENID) {
    throw new Error('无权删除此商品')
  }

  await db.collection('products').doc(productId).remove()

  return { success: true }
}

// 获取商品详情
async function getProductDetail(event, context) {
  const { productId } = event

  const productRes = await db.collection('products').doc(productId).get()
  if (!productRes.data) {
    throw new Error('商品不存在')
  }

  // 获取仓库信息
  const warehouseRes = await db.collection('warehouses').doc(productRes.data.warehouse_id).get()

  return {
    product: productRes.data,
    warehouse: warehouseRes.data
  }
}

// 云函数入口
exports.main = async (event, context) => {
  const { action } = event

  switch (action) {
    case 'addProduct':
      return await addProduct(event, context)
    case 'updateProduct':
      return await updateProduct(event, context)
    case 'deleteProduct':
      return await deleteProduct(event, context)
    case 'getProductDetail':
      return await getProductDetail(event, context)
    default:
      throw new Error('未知操作')
  }
}
