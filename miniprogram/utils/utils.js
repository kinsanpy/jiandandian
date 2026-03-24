// 云数据库操作封装
const db = wx.cloud.database()

// 获取用户openid
function getOpenId() {
  return wx.cloud.callFunction({
    name: 'login',
    data: {}
  }).then(res => res.result.openid)
}

// 获取仓库列表
function getWarehouses() {
  return db.collection('warehouses').where({
    is_public: true
  }).get()
}

// 获取仓库详情
function getWarehouseDetail(warehouseId) {
  return db.collection('warehouses').doc(warehouseId).get()
}

// 获取商品列表
function getProducts(warehouseId) {
  return db.collection('products').where({
    warehouse_id: warehouseId
  }).get()
}

// 创建仓库
function createWarehouse(data) {
  return db.collection('warehouses').add({
    data: {
      ...data,
      created_at: db.serverDate()
    }
  })
}

// 更新仓库
function updateWarehouse(warehouseId, data) {
  return db.collection('warehouses').doc(warehouseId).update({
    data
  })
}

// 添加商品
function addProduct(data) {
  return db.collection('products').add({
    data: {
      ...data,
      created_at: db.serverDate()
    }
  })
}

// 更新商品
function updateProduct(productId, data) {
  return db.collection('products').doc(productId).update({
    data
  })
}

// 获取购物车
function getCart(openid) {
  return db.collection('cart').where({
    buyer_id: openid
  }).get()
}

// 添加到购物车
function addToCart(data) {
  return db.collection('cart').add({
    data: {
      ...data,
      created_at: db.serverDate()
    }
  })
}

// 创建订单
function createOrder(data) {
  return db.collection('orders').add({
    data: {
      ...data,
      status: 'pending',
      created_at: db.serverDate()
    }
  })
}

// 获取我的订单（买家视角）
function getMyOrders(openid) {
  return db.collection('orders').where({
    buyer_id: openid
  }).orderBy('created_at', 'desc').get()
}

// 获取收到的订单（卖家视角）
function getReceivedOrders(warehouseIds) {
  return db.collection('orders').where(
    db.command.in(warehouseIds.map(id => db.command.eq('warehouse_id', id)))
  ).orderBy('created_at', 'desc').get()
}

module.exports = {
  db,
  getOpenId,
  getWarehouses,
  getWarehouseDetail,
  getProducts,
  createWarehouse,
  updateWarehouse,
  addProduct,
  updateProduct,
  getCart,
  addToCart,
  createOrder,
  getMyOrders,
  getReceivedOrders
}
