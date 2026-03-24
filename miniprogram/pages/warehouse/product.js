// pages/warehouse/product.js
const app = getApp()

Page({
  data: {
    warehouseId: '',
    productId: '',
    isEdit: false,
    name: '',
    sku: '',
    stock: 0,
    unit: '个',
    price: 0,
    description: ''
  },

  onLoad: function(options) {
    this.setData({
      warehouseId: options.warehouseId,
      productId: options.productId || ''
    })

    if (this.data.productId) {
      this.setData({ isEdit: true })
      this.loadProduct()
    }
  },

  loadProduct: function() {
    wx.cloud.callFunction({
      name: 'product',
      data: {
        action: 'getProductDetail',
        productId: this.data.productId
      }
    }).then(res => {
      const product = res.result.product
      this.setData({
        name: product.name,
        sku: product.sku || '',
        stock: product.stock,
        unit: product.unit || '个',
        price: product.price || 0,
        description: product.description || ''
      })
    }).catch(err => {
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    })
  },

  onNameInput: function(e) {
    this.setData({ name: e.detail.value })
  },

  onSkuInput: function(e) {
    this.setData({ sku: e.detail.value })
  },

  onStockInput: function(e) {
    this.setData({ stock: parseInt(e.detail.value) || 0 })
  },

  onUnitInput: function(e) {
    this.setData({ unit: e.detail.value })
  },

  onPriceInput: function(e) {
    this.setData({ price: parseFloat(e.detail.value) || 0 })
  },

  onDescInput: function(e) {
    this.setData({ description: e.detail.value })
  },

  submit: function() {
    if (!this.data.name) {
      wx.showToast({
        title: '请输入商品名称',
        icon: 'none'
      })
      return
    }

    const data = {
      warehouse_id: this.data.warehouseId,
      name: this.data.name,
      sku: this.data.sku,
      stock: this.data.stock,
      unit: this.data.unit,
      price: this.data.price,
      description: this.data.description
    }

    let promise

    if (this.data.isEdit) {
      promise = wx.cloud.callFunction({
        name: 'product',
        data: {
          action: 'updateProduct',
          productId: this.data.productId,
          ...data
        }
      })
    } else {
      promise = wx.cloud.callFunction({
        name: 'product',
        data: {
          action: 'addProduct',
          ...data
        }
      })
    }

    promise.then(() => {
      wx.showToast({
        title: this.data.isEdit ? '更新成功' : '添加成功',
        icon: 'success'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }).catch(err => {
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      })
    })
  }
})
