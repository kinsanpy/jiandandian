// 初始化云函数 - 创建默认用户
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const defaultUsers = [
    { username: 'qc', password: '1qaz2wsx' }
  ]

  const results = []

  for (const user of defaultUsers) {
    // 检查是否已存在
    const existRes = await db.collection('users').where({
      username: user.username
    }).get()

    if (existRes.data.length === 0) {
      // 创建用户
      const userId = 'user_' + Date.now() + '_' + user.username
      await db.collection('users').add({
        data: {
          _id: userId,
          username: user.username,
          password: user.password,
          created_at: db.serverDate(),
          is_default: true
        }
      })
      results.push(`创建用户: ${user.username}`)
    } else {
      results.push(`用户已存在: ${user.username}`)
    }
  }

  return {
    success: true,
    results: results
  }
}
