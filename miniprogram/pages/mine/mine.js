// pages/mine/mine.js
const app = getApp()

Page({
  data: {
    userInfo: null,
    openid: '',
    myWarehouseCount: 0,
    myOrderCount: 0,
    receivedOrderCount: 0
  },

  onLoad: function() {
    this.checkLogin()
  },

  onShow: function() {
    if (app.globalData.openid) {
      this.loadUserData()
    }
  },

  checkLogin: function() {
    if (!app.globalData.openid) {
      wx.cloud.callFunction({
        name: 'login',
        data: {}
      }).then(res => {
        app.globalData.openid = res.result.openid
        this.setData({ openid: res.result.openid })
        this.loadUserData()
      })
    } else {
      this.setData({ openid: app.globalData.openid })
    }

    if (app.globalData.userInfo) {
      this.setData({ userInfo: app.globalData.userInfo })
    }
  },

  loadUserData: function() {
    // 获取我的仓库数量
    wx.cloud.callFunction({
      name: 'warehouse',
      data: {
        action: 'getMyWarehouses'
      }
    }).then(res => {
      this.setData({ myWarehouseCount: res.result.data.length })
    })

    // 获取我的订单数量
    wx.cloud.callFunction({
      name: 'order',
      data: {
        action: 'getMyOrders'
      }
    }).then(res => {
      this.setData({ myOrderCount: res.result.data.length })
    })

    // 获取收到的订单数量
    wx.cloud.callFunction({
      name: 'order',
      data: {
        action: 'getReceivedOrders'
      }
    }).then(res => {
      this.setData({ receivedOrderCount: res.result.data.length })
    })
  },

  onGetUserInfo: function(e) {
    if (e.detail.userInfo) {
      app.globalData.userInfo = e.detail.userInfo
      this.setData({ userInfo: e.detail.userInfo })

      // 更新用户信息到云端
      wx.cloud.callFunction({
        name: 'login',
        data: {
          userInfo: e.detail.userInfo
        }
      })
    }
  },

  goToMyWarehouse: function() {
    wx.navigateTo({
      url: '/pages/warehouse/list'
    })
  },

  goToMyOrders: function() {
    wx.navigateTo({
      url: '/pages/order/order?type=my'
    })
  },

  goToReceivedOrders: function() {
    wx.navigateTo({
      url: '/pages/order/order?type=received'
    })
  },

  onLogout: function() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除本地存储的登录信息
          wx.removeStorageSync('userInfo')
          // 清除全局数据
          app.globalData.userInfo = null
          app.globalData.openid = null
          // 跳转到登录页面
          wx.redirectTo({
            url: '/pages/login/login'
          })
        }
      }
    })
  }
})
