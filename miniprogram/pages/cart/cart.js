// pages/cart/cart.js
const app = getApp()

Page({
  data: {
    cartItems: [],
    selectedItems: [],
    totalAmount: 0,
    hasLogin: false
  },

  onLoad: function() {
    this.checkLogin()
  },

  onShow: function() {
    if (app.globalData.openid) {
      this.loadCart()
    }
  },

  checkLogin: function() {
    if (!app.globalData.openid) {
      wx.cloud.callFunction({
        name: 'login',
        data: {}
      }).then(res => {
        app.globalData.openid = res.result.openid
        this.setData({ hasLogin: true })
        this.loadCart()
      })
    } else {
      this.setData({ hasLogin: true })
    }
  },

  loadCart: function() {
    if (!app.globalData.openid) return

    const db = wx.cloud.database()
    db.collection('cart').where({
      buyer_id: app.globalData.openid
    }).get().then(res => {
      this.setData({ cartItems: res.data })
      this.calculateTotal()
    })
  },

  onSelectItem: function(e) {
    const productId = e.currentTarget.dataset.id
    const selected = this.data.selectedItems

    if (selected.includes(productId)) {
      this.setData({
        selectedItems: selected.filter(id => id !== productId)
      })
    } else {
      this.setData({
        selectedItems: [...selected, productId]
      })
    }
    this.calculateTotal()
  },

  onSelectAll: function() {
    if (this.data.selectedItems.length === this.data.cartItems.length) {
      this.setData({ selectedItems: [] })
    } else {
      this.setData({
        selectedItems: this.data.cartItems.map(item => item._id)
      })
    }
    this.calculateTotal()
  },

  calculateTotal: function() {
    const selected = this.data.selectedItems
    let total = 0

    this.data.cartItems.forEach(item => {
      if (selected.includes(item._id)) {
        total += item.price * item.quantity
      }
    })

    this.setData({ totalAmount: total })
  },

  onQuantityChange: function(e) {
    const productId = e.currentTarget.dataset.id
    const quantity = parseInt(e.detail.value)

    const db = wx.cloud.database()
    db.collection('cart').doc(productId).update({
      data: { quantity: quantity }
    }).then(() => {
      this.loadCart()
    })
  },

  removeItem: function(e) {
    const productId = e.currentTarget.dataset.id

    wx.showModal({
      title: '确认删除',
      content: '确定要从购物车中删除这件商品吗？',
      success: (res) => {
        if (res.confirm) {
          const db = wx.cloud.database()
          db.collection('cart').doc(productId).remove().then(() => {
            this.loadCart()
          })
        }
      }
    })
  },

  checkout: function() {
    if (this.data.selectedItems.length === 0) {
      wx.showToast({
        title: '请选择商品',
        icon: 'none'
      })
      return
    }

    // 按仓库分组
    const itemsByWarehouse = {}
    this.data.cartItems.forEach(item => {
      if (this.data.selectedItems.includes(item._id)) {
        if (!itemsByWarehouse[item.warehouse_id]) {
          itemsByWarehouse[item.warehouse_id] = {
            warehouse_name: item.warehouse_name,
            warehouse_id: item.warehouse_id,
            items: []
          }
        }
        itemsByWarehouse[item.warehouse_id].items.push({
          product_id: item.product_id,
          product_name: item.product_name,
          price: item.price,
          quantity: item.quantity,
          unit: item.unit
        })
      }
    })

    // 跳转到确认订单页面
    wx.navigateTo({
      url: '/pages/order/confirm?data=' + encodeURIComponent(JSON.stringify(Object.values(itemsByWarehouse)))
    })
  },

  clearCart: function() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空购物车吗？',
      success: (res) => {
        if (res.confirm) {
          const db = wx.cloud.database()
          const batch = Math.ceil(this.data.cartItems.length / 100)

          for (let i = 0; i < batch; i++) {
            const ids = this.data.cartItems.slice(i * 100, (i + 1) * 100).map(item => item._id)
            db.collection('cart').where({
              _id: db.command.in(ids)
            }).remove()
          }

          this.setData({ cartItems: [], selectedItems: [], totalAmount: 0 })
        }
      }
    })
  }
})
