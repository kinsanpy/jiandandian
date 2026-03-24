// pages/warehouse/warehouse.js
const app = getApp()

Page({
  data: {
    warehouseId: '',
    warehouse: null,
    products: [],
    owner: null,
    isOwner: false,
    cartItems: [],
    cartTotalCount: 0
  },

  onLoad: function(options) {
    this.setData({
      warehouseId: options.id
    })
    this.loadWarehouseDetail()
    this.loadCart()
  },

  onShow: function() {
    // 每次显示页面时刷新数据
    if (this.data.warehouseId) {
      this.loadWarehouseDetail()
      this.loadCart()
    }
  },

  loadWarehouseDetail: function() {
    wx.showLoading({ title: '加载中...' })

    wx.cloud.callFunction({
      name: 'warehouse',
      data: {
        action: 'getWarehouseDetail',
        warehouseId: this.data.warehouseId
      }
    }).then(res => {
      const isOwner = app.globalData.openid === res.result.warehouse.owner_id
      this.setData({
        warehouse: res.result.warehouse,
        products: res.result.products,
        owner: res.result.owner,
        isOwner: isOwner
      })
      wx.hideLoading()
    }).catch(err => {
      console.error('加载仓库详情失败', err)
      wx.hideLoading()
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    })
  },

  loadCart: function() {
    if (!app.globalData.openid) return

    const db = wx.cloud.database()
    db.collection('cart').where({
      buyer_id: app.globalData.openid
    }).get().then(res => {
      // 合并相同商品，数量累加
      const mergedMap = {}
      let totalQuantity = 0
      res.data.forEach(item => {
        if (mergedMap[item.product_id]) {
          mergedMap[item.product_id].quantity += item.quantity
        } else {
          mergedMap[item.product_id] = { ...item }
        }
        totalQuantity += item.quantity
      })
      const cartItems = Object.values(mergedMap)
      this.setData({
        cartItems: cartItems,
        cartTotalCount: totalQuantity
      })
    })
  },

  addToCart: function(e) {
    if (!app.globalData.openid) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }

    const productId = e.currentTarget.dataset.id
    const product = this.data.products.find(p => p._id === productId)
    if (!product) return

    const db = wx.cloud.database()

    // 先检查购物车中是否已有该商品
    db.collection('cart').where({
      buyer_id: app.globalData.openid,
      product_id: productId
    }).get().then(res => {
      if (res.data.length > 0) {
        // 已存在，只增加数量
        const existingItem = res.data[0]
        db.collection('cart').doc(existingItem._id).update({
          data: {
            quantity: existingItem.quantity + 1
          }
        }).then(() => {
          wx.showToast({
            title: '已增加数量',
            icon: 'success'
          })
          this.loadCart()
        })
      } else {
        // 不存在，新增记录
        db.collection('cart').add({
          data: {
            buyer_id: app.globalData.openid,
            warehouse_id: this.data.warehouseId,
            warehouse_name: this.data.warehouse.name,
            product_id: productId,
            product_name: product.name,
            price: product.price,
            unit: product.unit,
            quantity: 1,
            created_at: db.serverDate()
          }
        }).then(res => {
          wx.showToast({
            title: '已加入购物车',
            icon: 'success'
          })
          this.loadCart()
        })
      }
    })
  },

  goToCart: function() {
    wx.switchTab({
      url: '/pages/cart/cart'
    })
  },

  // 添加商品（仅所有者）
  goToAddProduct: function() {
    wx.navigateTo({
      url: '/pages/warehouse/product?warehouseId=' + this.data.warehouseId
    })
  },

  // 编辑商品（仅所有者）
  goToEditProduct: function(e) {
    const productId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: '/pages/warehouse/product?warehouseId=' + this.data.warehouseId + '&productId=' + productId
    })
  },

  // 分享仓库
  onShareAppMessage: function() {
    return {
      title: this.data.warehouse.name,
      path: '/pages/warehouse/warehouse?id=' + this.data.warehouseId
    }
  }
})
