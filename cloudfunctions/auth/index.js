// 用户认证云函数
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 注册
async function register(event, context) {
  const wxContext = cloud.getWXContext()
  const { username, password } = event

  if (!username || !password) {
    throw new Error('用户名和密码不能为空')
  }

  // 检查用户名是否已存在
  const existRes = await db.collection('users').where({
    username: username
  }).get()

  if (existRes.data.length > 0) {
    throw new Error('用户名已存在')
  }

  // 使用OPENID作为文档ID，用set方法确保覆盖
  await db.collection('users').doc(wxContext.OPENID).set({
    data: {
      username: username,
      password: password,
      avatar: '',
      nickname: '',
      company: '',
      business: '',
      created_at: db.serverDate()
    }
  })

  return {
    success: true,
    userId: wxContext.OPENID,
    username: username
  }
}

// 登录
async function login(event, context) {
  const { username, password } = event

  if (!username || !password) {
    throw new Error('用户名和密码不能为空')
  }

  const res = await db.collection('users').where({
    username: username,
    password: password
  }).get()

  if (res.data.length === 0) {
    throw new Error('用户名或密码错误')
  }

  const user = res.data[0]

  return {
    success: true,
    userId: user._id,
    username: user.username
  }
}

// 验证用户名是否存在
async function checkUsername(event, context) {
  const { username } = event

  const res = await db.collection('users').where({
    username: username
  }).get()

  return {
    exists: res.data.length > 0
  }
}

exports.main = async (event, context) => {
  const { action } = event

  switch (action) {
    case 'register':
      return await register(event, context)
    case 'login':
      return await login(event, context)
    case 'checkUsername':
      return await checkUsername(event, context)
    default:
      throw new Error('未知操作')
  }
}
