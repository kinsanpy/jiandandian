// pages/profile/profile.js
const app = getApp()

Page({
  data: {
    avatar: '',
    nickname: '',
    company: '',
    business: ''
  },

  onLoad: function() {
    this.loadProfile()
  },

  loadProfile: function() {
    // 优先使用 globalData，否则从 storage 读取
    let userId = app.globalData.userInfo ? app.globalData.userInfo.userId : app.globalData.openid
    if (!userId) {
      const stored = wx.getStorageSync('userInfo')
      if (stored) {
        userId = stored.userId
      }
    }
    if (!userId) {
      console.error('无法获取用户ID')
      return
    }

    console.log('加载名片, userId:', userId)

    const db = wx.cloud.database()
    db.collection('users').doc(userId).get().then(res => {
      console.log('用户数据:', res.data)
      if (res.data) {
        this.setData({
          avatar: res.data.avatar || '',
          nickname: res.data.nickname || '',
          company: res.data.company || '',
          business: res.data.business || ''
        })
      }
    }).catch(err => {
      console.error('加载失败:', err)
    })
  },

  onNicknameInput: function(e) {
    this.setData({ nickname: e.detail.value })
  },

  onChooseAvatar: function() {
    const userId = app.globalData.userInfo ? app.globalData.userInfo.userId : app.globalData.openid
    if (!userId) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }

    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath
        wx.showLoading({ title: '上传中...' })

        // 上传到云存储
        const cloudPath = 'avatars/' + userId + '/' + Date.now() + '.jpg'
        wx.cloud.uploadFile({
          cloudPath: cloudPath,
          filePath: tempFilePath,
          success: (uploadRes) => {
            this.setData({
              avatar: uploadRes.fileID
            })
            wx.hideLoading()
            wx.showToast({
              title: '上传成功',
              icon: 'success'
            })
          },
          fail: (err) => {
            wx.hideLoading()
            console.error('上传失败', err)
            wx.showToast({
              title: '上传失败，请重试',
              icon: 'none'
            })
          }
        })
      }
    })
  },

  onCompanyInput: function(e) {
    this.setData({ company: e.detail.value })
  },

  onBusinessInput: function(e) {
    this.setData({ business: e.detail.value })
  },

  onSave: function() {
    let userId = app.globalData.userInfo ? app.globalData.userInfo.userId : app.globalData.openid
    if (!userId) {
      const stored = wx.getStorageSync('userInfo')
      if (stored) {
        userId = stored.userId
      }
    }
    if (!userId) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }

    console.log('保存名片, userId:', userId, 'data:', this.data)

    wx.showLoading({ title: '保存中...' })

    const db = wx.cloud.database()

    // 先获取原数据，合并后用 set 写入（避免覆盖其他字段）
    db.collection('users').doc(userId).get().then((res) => {
      const existingData = res.data || {}
      const dataToSave = Object.assign({}, existingData, {
        updated_at: db.serverDate()
      })
      if (this.data.avatar) dataToSave.avatar = this.data.avatar
      if (this.data.nickname) dataToSave.nickname = this.data.nickname
      if (this.data.company) dataToSave.company = this.data.company
      if (this.data.business) dataToSave.business = this.data.business

      return db.collection('users').doc(userId).set({
        data: dataToSave
      })
    }).then((res) => {
      console.log('保存成功:', res)
      wx.hideLoading()
      wx.showToast({
        title: '保存成功',
        icon: 'success'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }).catch((err) => {
      console.error('保存失败:', err)
      wx.hideLoading()
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      })
    })
  }
})
