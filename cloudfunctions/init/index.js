// 初始化云函数
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  return {
    success: true,
    message: '初始化完成'
  }
}
