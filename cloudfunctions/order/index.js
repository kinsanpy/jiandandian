// 订单云函数
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 创建订单（支持库存为0下单）
async function createOrder(event, context) {
  const wxContext = cloud.getWXContext()
  const { warehouse_id, items, remark } = event

  if (!warehouse_id || !items || items.length === 0) {
    throw new Error('仓库ID和订单商品不能为空')
  }

  // 验证仓库存在
  const warehouseRes = await db.collection('warehouses').doc(warehouse_id).get()
  if (!warehouseRes.data) {
    throw new Error('仓库不存在')
  }

  // 构建订单商品详情（快照）并扣减库存
  const orderItems = []
  let totalAmount = 0

  for (const item of items) {
    const productRes = await db.collection('products').doc(item.product_id).get()
    if (!productRes.data) {
      throw new Error('商品不存在: ' + item.product_id)
    }

    const product = productRes.data
    const quantity = item.quantity || 1
    const price = product.price || 0

    orderItems.push({
      product_id: product._id,
      product_name: product.name,
      sku: product.sku,
      quantity: quantity,
      price: price,
      unit: product.unit
    })

    totalAmount += price * quantity

    // 下单时立即扣减库存，确保不会变成负数
    const newStock = Math.max(0, product.stock - quantity)
    await db.collection('products').doc(item.product_id).update({
      data: {
        stock: newStock
      }
    })
  }

  const orderId = 'ORD_' + Date.now() + '_' + wxContext.OPENID.slice(-6)

  const res = await db.collection('orders').add({
    data: {
      _id: orderId,
      warehouse_id,
      buyer_id: wxContext.OPENID,
      warehouse_owner: warehouseRes.data.owner_id,
      items: orderItems,
      total_amount: totalAmount,
      remark: remark || '',
      status: 'pending', // pending -> producing -> shipped -> completed
      created_at: db.serverDate()
    }
  })

  return {
    success: true,
    order_id: res._id,
    orderId: orderId
  }
}

// 获取我的订单（买家视角）
async function getMyOrders(event, context) {
  const wxContext = cloud.getWXContext()
  const { status, start = 0, limit = 20 } = event

  let query = db.collection('orders').where({
    buyer_id: wxContext.OPENID
  })

  if (status) {
    query = query.where({
      buyer_id: wxContext.OPENID,
      status: status
    })
  }

  const res = await query
    .orderBy('created_at', 'desc')
    .skip(start)
    .limit(limit)
    .get()

  // 补充仓库信息
  for (const order of res.data) {
    const warehouseRes = await db.collection('warehouses').doc(order.warehouse_id).get()
    if (warehouseRes.data) {
      order.warehouse_name = warehouseRes.data.name
    }
  }

  return res
}

// 获取收到的订单（卖家视角）
async function getReceivedOrders(event, context) {
  const wxContext = cloud.getWXContext()
  const { status, start = 0, limit = 20 } = event

  // 先获取卖家的所有仓库
  const warehousesRes = await db.collection('warehouses').where({
    owner_id: wxContext.OPENID
  }).get()

  if (warehousesRes.data.length === 0) {
    return { data: [] }
  }

  const warehouseIds = warehousesRes.data.map(w => w._id)

  let query = db.collection('orders').where(
    db.command.or(
      warehouseIds.map(id => ({ warehouse_id: id }))
    )
  )

  if (status) {
    query = db.collection('orders').where(
      db.command.and([
        db.command.or(warehouseIds.map(id => ({ warehouse_id: id }))),
        { status: status }
      ])
    )
  }

  const res = await query
    .orderBy('created_at', 'desc')
    .skip(start)
    .limit(limit)
    .get()

  // 补充买家信息
  for (const order of res.data) {
    const buyerRes = await db.collection('users').doc(order.buyer_id).get()
    if (buyerRes.data) {
      order.buyer_nickname = buyerRes.data.nickname
      order.buyer_avatar = buyerRes.data.avatar
    }

    const warehouseRes = await db.collection('warehouses').doc(order.warehouse_id).get()
    if (warehouseRes.data) {
      order.warehouse_name = warehouseRes.data.name
    }
  }

  return res
}

// 更新订单状态
async function updateOrderStatus(event, context) {
  const wxContext = cloud.getWXContext()
  const { orderId, status, logistics_company, logistics_no } = event

  // 获取订单
  const orderRes = await db.collection('orders').doc(orderId).get()
  if (!orderRes.data) {
    throw new Error('订单不存在')
  }

  const order = orderRes.data

  // 验证权限：买家可以确认收货，卖家可以更新其他状态
  const isBuyer = order.buyer_id === wxContext.OPENID
  const warehouseRes = await db.collection('warehouses').doc(order.warehouse_id).get()
  const isOwner = warehouseRes.data && warehouseRes.data.owner_id === wxContext.OPENID

  if (!isBuyer && !isOwner) {
    throw new Error('无权操作此订单')
  }

  // 状态流转验证
  const validTransitions = {
    'pending': ['producing', 'cancelled'],
    'producing': ['shipped'],
    'shipped': ['completed'],
    'completed': [],
    'cancelled': []
  }

  if (!validTransitions[order.status].includes(status)) {
    throw new Error('无效的状态流转')
  }

  const updateData = { status: status }

  if (logistics_company) updateData.logistics_company = logistics_company
  if (logistics_no) updateData.logistics_no = logistics_no
  updateData.updated_at = db.serverDate()

  await db.collection('orders').doc(orderId).update({
    data: updateData
  })

  return { success: true }
}

// 取消订单
async function cancelOrder(event, context) {
  const wxContext = cloud.getWXContext()
  const { orderId } = event

  const orderRes = await db.collection('orders').doc(orderId).get()
  if (!orderRes.data) {
    throw new Error('订单不存在')
  }

  const order = orderRes.data

  // 只有买家可以取消，且订单状态为pending
  if (order.buyer_id !== wxContext.OPENID) {
    throw new Error('无权取消此订单')
  }

  if (order.status !== 'pending') {
    throw new Error('只能取消待处理的订单')
  }

  // 取消订单时返还库存
  for (const item of order.items) {
    try {
      const productRes = await db.collection('products').doc(item.product_id).get()
      if (productRes.data) {
        await db.collection('products').doc(item.product_id).update({
          data: {
            stock: productRes.data.stock + item.quantity
          }
        })
      }
    } catch (e) {
      console.error('库存返还失败', e)
    }
  }

  await db.collection('orders').doc(orderId).update({
    data: {
      status: 'cancelled',
      updated_at: db.serverDate()
    }
  })

  return { success: true }
}

// 云函数入口
exports.main = async (event, context) => {
  const { action } = event

  switch (action) {
    case 'createOrder':
      return await createOrder(event, context)
    case 'getMyOrders':
      return await getMyOrders(event, context)
    case 'getReceivedOrders':
      return await getReceivedOrders(event, context)
    case 'updateOrderStatus':
      return await updateOrderStatus(event, context)
    case 'cancelOrder':
      return await cancelOrder(event, context)
    default:
      throw new Error('未知操作')
  }
}
