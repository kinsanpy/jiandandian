// pages/order/order.js
const app = getApp()

Page({
  data: {
    orderType: '', // 'confirm', 'my', 'received', 'detail'
    orderId: '',
    orderData: null,
    orders: [],
    loading: false,

    // 确认订单相关
    confirmData: [],

    // 状态映射
    statusMap: {
      'pending': '待处理',
      'producing': '生产中',
      'shipped': '已发货',
      'completed': '已完成',
      'cancelled': '已取消'
    }
  },

  onLoad: function(options) {
    this.setData({
      orderType: options.type || 'my',
      orderId: options.id || '',
      confirmData: options.data ? JSON.parse(decodeURIComponent(options.data)) : []
    })

    if (this.data.orderType === 'detail' && this.data.orderId) {
      this.loadOrderDetail()
    } else if (this.data.orderType === 'my') {
      this.loadMyOrders()
    } else if (this.data.orderType === 'received') {
      this.loadReceivedOrders()
    } else if (this.data.orderType === 'confirm') {
      this.calculateTotal()
    }
  },

  calculateTotal: function() {
    let totalAmount = 0
    let totalItems = 0

    this.data.confirmData.forEach(warehouse => {
      warehouse.items.forEach(item => {
        totalAmount += item.price * item.quantity
        totalItems += item.quantity
      })
    })

    this.setData({
      totalAmount: totalAmount,
      totalItems: totalItems
    })
  },

  loadOrderDetail: function() {
    this.setData({ loading: true })

    const db = wx.cloud.database()
    db.collection('orders').doc(this.data.orderId).get().then(res => {
      this.setData({
        orderData: res.data,
        loading: false
      })
    }).catch(err => {
      console.error('加载订单详情失败', err)
      this.setData({ loading: false })
    })
  },

  loadMyOrders: function() {
    if (!app.globalData.openid) return

    this.setData({ loading: true })

    wx.cloud.callFunction({
      name: 'order',
      data: {
        action: 'getMyOrders'
      }
    }).then(res => {
      this.setData({
        orders: res.result.data,
        loading: false
      })
    }).catch(err => {
      console.error('加载订单失败', err)
      this.setData({ loading: false })
    })
  },

  loadReceivedOrders: function() {
    if (!app.globalData.openid) return

    this.setData({ loading: true })

    wx.cloud.callFunction({
      name: 'order',
      data: {
        action: 'getReceivedOrders'
      }
    }).then(res => {
      this.setData({
        orders: res.result.data,
        loading: false
      })
    }).catch(err => {
      console.error('加载订单失败', err)
      this.setData({ loading: false })
    })
  },

  submitOrder: function() {
    if (!app.globalData.openid) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }

    wx.showLoading({ title: '提交中...' })

    // 为每个仓库创建订单
    const promises = this.data.confirmData.map(warehouse => {
      return wx.cloud.callFunction({
        name: 'order',
        data: {
          action: 'createOrder',
          warehouse_id: warehouse.warehouse_id,
          items: warehouse.items,
          remark: this.data.remark || ''
        }
      })
    })

    Promise.all(promises).then(results => {
      wx.hideLoading()

      // 清空购物车
      const db = wx.cloud.database()
      const selectedIds = []
      this.data.confirmData.forEach(w => {
        w.items.forEach(item => {
          // 这里需要根据product_name匹配购物车商品
        })
      })

      wx.showToast({
        title: '下单成功',
        icon: 'success'
      })

      // 跳转到我的订单
      setTimeout(() => {
        wx.redirectTo({
          url: '/pages/order/order?type=my'
        })
      }, 1500)
    }).catch(err => {
      wx.hideLoading()
      wx.showToast({
        title: '下单失败',
        icon: 'none'
      })
      console.error('下单失败', err)
    })
  },

  updateStatus: function(e) {
    const orderId = e.currentTarget.dataset.id
    const status = e.currentTarget.dataset.status

    wx.showModal({
      title: '确认操作',
      content: `确定要将订单状态更新为"${this.data.statusMap[status]}"吗？`,
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '处理中...' })

          wx.cloud.callFunction({
            name: 'order',
            data: {
              action: 'updateOrderStatus',
              orderId: orderId,
              status: status
            }
          }).then(() => {
            wx.hideLoading()
            wx.showToast({
              title: '更新成功',
              icon: 'success'
            })
            this.loadReceivedOrders()
          }).catch(err => {
            wx.hideLoading()
            wx.showToast({
              title: '更新失败',
              icon: 'none'
            })
          })
        }
      }
    })
  },

  cancelOrder: function(e) {
    const orderId = e.currentTarget.dataset.id

    wx.showModal({
      title: '确认取消',
      content: '确定要取消此订单吗？',
      success: (res) => {
        if (res.confirm) {
          wx.cloud.callFunction({
            name: 'order',
            data: {
              action: 'cancelOrder',
              orderId: orderId
            }
          }).then(() => {
            wx.showToast({
              title: '已取消',
              icon: 'success'
            })
            this.loadMyOrders()
          })
        }
      }
    })
  },

  goToOrderDetail: function(e) {
    const orderId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: '/pages/order/order?type=detail&id=' + orderId
    })
  }
})
