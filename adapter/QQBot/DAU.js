import moment from "moment"


/** 查询消息DAU */
const DAU = {}

async function getDAU(uin) {
  let time = moment().format('YYYY-MM-DD')
  const msg_count = (await redis.get(`QQBotDAU:${time}:msg_count:${uin}`)) || 0
  const send_count = (await redis.get(`QQBotDAU:${time}:send_count:${uin}`)) || 0
  let data = await redis.get(`QQBotDAU:${time}:${uin}`)
  if (data) {
    data = JSON.parse(data)
    data.msg_count = msg_count
    data.send_count = send_count
    return data
  } else {
    return {
      user_count: 0,            // 上行消息人数
      group_count: 0,          // 上行消息群数
      msg_count: msg_count,  // 上行消息量
      send_count: send_count, // 下行消息量
      user_cache: {},
      group_cache: {}
    }
  }
}


export {
  DAU,
  getDAU
}
