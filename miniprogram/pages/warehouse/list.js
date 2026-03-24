// pages/warehouse/list.js
const app = getApp()

Page({
  data: {
    warehouses: [],
    showCreateModal: false,
    newWarehouseName: '',
    newWarehouseDesc: '',
    newWarehousePublic: true
  },

  onLoad: function() {
    this.loadMyWarehouses()
  },

  onShow: function() {
    this.loadMyWarehouses()
  },

  loadMyWarehouses: function() {
    wx.cloud.callFunction({
      name: 'warehouse',
      data: {
        action: 'getMyWarehouses'
      }
    }).then(res => {
      this.setData({
        warehouses: res.result.data
      })
    }).catch(err => {
      console.error('加载仓库失败', err)
    })
  },

  goToWarehouse: function(e) {
    const warehouseId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: '/pages/warehouse/warehouse?id=' + warehouseId
    })
  },

  showCreateModal: function() {
    this.setData({
      showCreateModal: true,
      newWarehouseName: '',
      newWarehouseDesc: '',
      newWarehousePublic: true
    })
  },

  hideCreateModal: function() {
    this.setData({ showCreateModal: false })
  },

  onNameInput: function(e) {
    this.setData({ newWarehouseName: e.detail.value })
  },

  onDescInput: function(e) {
    this.setData({ newWarehouseDesc: e.detail.value })
  },

  onPublicChange: function(e) {
    this.setData({ newWarehousePublic: e.detail.value.length > 0 })
  },

  createWarehouse: function() {
    if (!this.data.newWarehouseName) {
      wx.showToast({
        title: '请输入仓库名称',
        icon: 'none'
      })
      return
    }

    wx.cloud.callFunction({
      name: 'warehouse',
      data: {
        action: 'createWarehouse',
        name: this.data.newWarehouseName,
        description: this.data.newWarehouseDesc,
        is_public: this.data.newWarehousePublic
      }
    }).then(res => {
      wx.showToast({
        title: '创建成功',
        icon: 'success'
      })
      this.hideCreateModal()
      this.loadMyWarehouses()
    }).catch(err => {
      wx.showToast({
        title: '创建失败',
        icon: 'none'
      })
    })
  },

  togglePublic: function(e) {
    const warehouseId = e.currentTarget.dataset.id
    const warehouse = this.data.warehouses.find(w => w._id === warehouseId)
    if (!warehouse) return

    wx.cloud.callFunction({
      name: 'warehouse',
      data: {
        action: 'updateWarehouse',
        warehouseId: warehouseId,
        is_public: !warehouse.is_public
      }
    }).then(() => {
      wx.showToast({
        title: '更新成功',
        icon: 'success'
      })
      this.loadMyWarehouses()
    })
  }
})
