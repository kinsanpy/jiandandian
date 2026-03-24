// 更新用户资料云函数
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { avatar, nickname, company, business } = event
  const userId = wxContext.OPENID

  // 使用 set 方法强制写入文档
  const existRes = await db.collection('users').doc(userId).get()

  if (!existRes.data) {
    throw new Error('用户不存在')
  }

  // 构建更新数据
  const dataToSave = {
    avatar: avatar || '',
    nickname: nickname || '',
    company: company || '',
    business: business || '',
    updated_at: db.serverDate()
  }

  // 用 set 强制覆盖写入
  const res = await db.collection('users').doc(userId).set({
    data: dataToSave
  })

  return {
    success: true,
    res: res
  }
}
