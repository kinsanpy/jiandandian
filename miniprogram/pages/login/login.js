// pages/login/login.js
const app = getApp()

Page({
  data: {
    username: '',
    password: '',
    isLogin: true,
    registerUsername: '',
    registerPassword: '',
    registerConfirmPassword: ''
  },

  onLoad: function() {
    // 检查是否已登录
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      app.globalData.userInfo = userInfo
      app.globalData.openid = userInfo.userId
      wx.switchTab({
        url: '/pages/index/index'
      })
    }
  },

  onUsernameInput: function(e) {
    this.setData({ username: e.detail.value })
  },

  onPasswordInput: function(e) {
    this.setData({ password: e.detail.value })
  },

  onRegisterUsernameInput: function(e) {
    this.setData({ registerUsername: e.detail.value })
  },

  onRegisterPasswordInput: function(e) {
    this.setData({ registerPassword: e.detail.value })
  },

  onRegisterConfirmPasswordInput: function(e) {
    this.setData({ registerConfirmPassword: e.detail.value })
  },

  switchMode: function() {
    this.setData({
      isLogin: !this.data.isLogin
    })
  },

  login: function() {
    if (!this.data.username || !this.data.password) {
      wx.showToast({
        title: '请输入用户名和密码',
        icon: 'none'
      })
      return
    }

    wx.showLoading({ title: '登录中...' })

    wx.cloud.callFunction({
      name: 'auth',
      data: {
        action: 'login',
        username: this.data.username,
        password: this.data.password
      }
    }).then(res => {
      wx.hideLoading()

      if (res.result.success) {
        const userInfo = {
          userId: res.result.userId,
          username: res.result.username
        }

        wx.setStorageSync('userInfo', userInfo)
        app.globalData.userInfo = userInfo
        app.globalData.openid = res.result.userId

        wx.showToast({
          title: '登录成功',
          icon: 'success'
        })

        setTimeout(() => {
          wx.switchTab({
            url: '/pages/index/index'
          })
        }, 1000)
      }
    }).catch(err => {
      wx.hideLoading()
      wx.showToast({
        title: err.message || '登录失败',
        icon: 'none'
      })
    })
  },

  register: function() {
    if (!this.data.registerUsername || !this.data.registerPassword || !this.data.registerConfirmPassword) {
      wx.showToast({
        title: '请填写所有字段',
        icon: 'none'
      })
      return
    }

    if (this.data.registerPassword !== this.data.registerConfirmPassword) {
      wx.showToast({
        title: '两次密码输入不一致',
        icon: 'none'
      })
      return
    }

    if (this.data.registerPassword.length < 6) {
      wx.showToast({
        title: '密码至少6位',
        icon: 'none'
      })
      return
    }

    wx.showLoading({ title: '注册中...' })

    wx.cloud.callFunction({
      name: 'auth',
      data: {
        action: 'register',
        username: this.data.registerUsername,
        password: this.data.registerPassword
      }
    }).then(res => {
      wx.hideLoading()

      if (res.result.success) {
        wx.showToast({
          title: '注册成功',
          icon: 'success'
        })

        // 注册成功后自动登录
        const userInfo = {
          userId: res.result.userId,
          username: res.result.username
        }

        wx.setStorageSync('userInfo', userInfo)
        app.globalData.userInfo = userInfo
        app.globalData.openid = res.result.userId

        setTimeout(() => {
          wx.switchTab({
            url: '/pages/index/index'
          })
        }, 1000)
      }
    }).catch(err => {
      wx.hideLoading()
      wx.showToast({
        title: err.message || '注册失败',
        icon: 'none'
      })
    })
  }
})
