// pages/cart/cart.js
const app = getApp()

Page({
  data: {
    cartItems: [],
    selectedItems: {},  // 用对象存储，key为index，value为true/false
    totalAmount: 0,
    hasLogin: false,
    isAllSelected: false,
    selectedCount: 0
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
    const userInfo = wx.getStorageSync('userInfo')
    if (!userInfo) {
      wx.redirectTo({
        url: '/pages/login/login'
      })
      return
    }
    app.globalData.userInfo = userInfo
    app.globalData.openid = userInfo.userId
    this.setData({ hasLogin: true })
    this.loadCart()
  },

  loadCart: function() {
    if (!app.globalData.openid) return

    wx.showLoading({ title: '加载中...' })
    const db = wx.cloud.database()
    db.collection('cart').where({
      buyer_id: app.globalData.openid
    }).get().then(res => {
      // 按 product_id 合并相同商品，数量累加
      const mergedMap = {}
      res.data.forEach(item => {
        if (mergedMap[item.product_id]) {
          mergedMap[item.product_id].quantity += item.quantity
        } else {
          mergedMap[item.product_id] = { ...item }
        }
      })
      const cartItems = Object.values(mergedMap)

      this.setData({
        cartItems: cartItems,
        selectedItems: {},
        isAllSelected: false,
        selectedCount: 0,
        totalAmount: '0.00'
      })
      wx.hideLoading()
    }).catch(err => {
      console.error('加载购物车失败', err)
      wx.hideLoading()
    })
  },

  // 选择/取消选择单个商品
  onSelectItem: function(e) {
    const index = e.currentTarget.dataset.index
    const id = e.currentTarget.dataset.id
    let selectedItems = { ...this.data.selectedItems }

    if (selectedItems[index]) {
      delete selectedItems[index]
    } else {
      selectedItems[index] = true
    }

    this.setData({ selectedItems: selectedItems }, () => {
      this.calculateTotal()
    })
  },

  // 全选/取消全选
  onSelectAll: function() {
    let selectedItems = {}
    let isAllSelected = !this.data.isAllSelected

    if (isAllSelected) {
      this.data.cartItems.forEach((item, index) => {
        selectedItems[index] = true
      })
    }

    this.setData({ selectedItems: selectedItems, isAllSelected: isAllSelected }, () => {
      this.calculateTotal()
    })
  },

  // 计算总价
  calculateTotal: function() {
    let total = 0
    let count = 0

    this.data.cartItems.forEach((item, index) => {
      if (this.data.selectedItems[index]) {
        total += item.price * item.quantity
        count++
      }
    })

    const isAllSelected = this.data.cartItems.length > 0 && count === this.data.cartItems.length

    this.setData({
      totalAmount: total.toFixed(2),
      selectedCount: count,
      isAllSelected: isAllSelected
    })
  },

  // 减少数量
  onMinus: function(e) {
    const index = e.currentTarget.dataset.index
    const id = e.currentTarget.dataset.id
    const item = this.data.cartItems[index]
    if (!item || item.quantity <= 1) return

    this.updateQuantity(id, item.quantity - 1, index)
  },

  // 增加数量
  onPlus: function(e) {
    const index = e.currentTarget.dataset.index
    const id = e.currentTarget.dataset.id
    const item = this.data.cartItems[index]
    if (!item) return

    this.updateQuantity(id, item.quantity + 1, index)
  },

  // 更新数量 - 用 product_id 更新所有相关记录
  updateQuantity: function(productId, quantity, index) {
    const db = wx.cloud.database()
    // 更新所有该 product_id 的购物车记录
    db.collection('cart').where({
      buyer_id: app.globalData.openid,
      product_id: productId
    }).update({
      data: { quantity: quantity }
    }).then(() => {
      const cartItems = [...this.data.cartItems]
      cartItems[index].quantity = quantity
      this.setData({ cartItems })
      this.calculateTotal()
    })
  },

  // 删除商品
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

  // 结算
  checkout: function() {
    if (this.data.selectedCount === 0) {
      wx.showToast({
        title: '请选择商品',
        icon: 'none'
      })
      return
    }

    const itemsByWarehouse = {}
    this.data.cartItems.forEach((item, index) => {
      if (this.data.selectedItems[index]) {
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

    wx.navigateTo({
      url: '/pages/order/order?type=confirm&data=' + encodeURIComponent(JSON.stringify(Object.values(itemsByWarehouse)))
    })
  }
})
