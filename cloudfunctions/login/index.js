// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()

  // 获取用户信息
  const { userInfo } = event

  // 如果没有用户信息，返回openid
  if (!userInfo) {
    return {
      openid: wxContext.OPENID,
      appid: wxContext.APPID,
      unionid: wxContext.UNIONID,
    }
  }

  // 尝试获取用户记录并更新或创建
  const db = cloud.database()
  try {
    const userRes = await db.collection('users').where({
      _id: wxContext.OPENID
    }).get()

    if (userRes.data.length > 0) {
      // 更新用户信息
      await db.collection('users').doc(wxContext.OPENID).update({
        data: {
          nickname: userInfo.nickName,
          avatar: userInfo.avatarUrl,
          updated_at: db.serverDate()
        }
      })
    } else {
      // 创建新用户
      await db.collection('users').add({
        data: {
          _id: wxContext.OPENID,
          nickname: userInfo.nickName,
          avatar: userInfo.avatarUrl,
          created_at: db.serverDate()
        }
      })
    }
  } catch (e) {
    console.error('用户信息更新失败', e)
  }

  return {
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID,
    userInfo: userInfo
  }
}
