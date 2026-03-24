// pages/mine/mine.js
const app = getApp()

Page({
  data: {
    openid: '',
    myWarehouseCount: 0,
    myOrderCount: 0,
    receivedOrderCount: 0,
    profile: {
      avatar: '',
      company: '',
      business: ''
    }
  },

  onLoad: function() {
    this.checkLogin()
  },

  onShow: function() {
    if (app.globalData.openid) {
      this.loadUserData()
      this.loadProfile()
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
    this.setData({ openid: app.globalData.openid })
    this.loadUserData()
    this.loadProfile()
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

  loadProfile: function() {
    if (!app.globalData.openid) return

    const db = wx.cloud.database()
    db.collection('users').doc(app.globalData.openid).get().then(res => {
      if (res.data) {
        this.setData({
          profile: {
            avatar: res.data.avatar || '',
            nickname: res.data.nickname || '',
            company: res.data.company || '',
            business: res.data.business || ''
          }
        })
      }
    })
  },

  goToProfile: function() {
    wx.navigateTo({
      url: '/pages/profile/profile'
    })
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
          wx.removeStorageSync('userInfo')
          app.globalData.userInfo = null
          app.globalData.openid = null
          wx.redirectTo({
            url: '/pages/login/login'
          })
        }
      }
    })
  }
})
