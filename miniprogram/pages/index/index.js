// pages/index/index.js
const app = getApp()
const db = wx.cloud.database()

Page({
  data: {
    warehouses: [],
    searchKeyword: '',
    loading: false
  },

  onLoad: function() {
    this.loadWarehouses()
  },

  onShow: function() {
    this.checkLogin()
  },

  onPullDownRefresh: function() {
    this.loadWarehouses()
  },

  checkLogin: function() {
    // 检查本地存储的登录信息
    const userInfo = wx.getStorageSync('userInfo')
    if (!userInfo) {
      wx.redirectTo({
        url: '/pages/login/login'
      })
      return
    }
    app.globalData.userInfo = userInfo
    app.globalData.openid = userInfo.userId
  },

  loadWarehouses: function() {
    this.setData({ loading: true })

    wx.cloud.callFunction({
      name: 'warehouse',
      data: {
        action: 'getWarehouses',
        keyword: this.data.searchKeyword
      }
    }).then(res => {
      this.setData({
        warehouses: res.result.data,
        loading: false
      })
      wx.stopPullDownRefresh()
    }).catch(err => {
      console.error('加载仓库失败', err)
      this.setData({ loading: false })
      wx.stopPullDownRefresh()
    })
  },

  onSearch: function(e) {
    this.setData({
      searchKeyword: e.detail.value
    })
    this.loadWarehouses()
  },

  goToWarehouse: function(e) {
    const warehouseId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: '/pages/warehouse/warehouse?id=' + warehouseId
    })
  }
})
