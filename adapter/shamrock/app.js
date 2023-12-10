import { WebSocketServer } from 'ws'
import common from '../../model/common.js'
import addBot from './bot.js'
import message from './message.js'
import loader from '../../plugins/loader.js'
import pluginsLoader from '../../../../lib/plugins/loader.js'

class Shamrock {
  async server (bot, request) {
    /** 获取机器人uin */
    const id = request.headers['x-self-id']

    if (!id) {
      common.error('shamrock', '没有提供机器人标识')
      return bot.close()
    }

    /** 保存当前bot */
    Bot.shamrock.set(id, {
      id,
      socket: bot,
      'qq-ver': request.headers['x-qq-version'],
      'user-agent': request.headers['user-agent']
    })

    bot.on('message', async (data) => {
      data = JSON.parse(data)
      /** 带echo事件另外保存 */
      if (data?.echo) return Bot.lain.on.set(data.echo, data)

      try {
        await this.event(id, data)
      } catch (error) {
        logger.error(error)
        logger.mark('[Shamrock]事件处理错误', data)
      }
    })

    bot.on('close', async () => {
      common.error(id, '连接已关闭')
    })
  }

  /** 转换为喵崽可处理的格式，随后交给喵崽处理 */
  async message (data) {
    return await loader.deal.call(pluginsLoader, await message.msg(data))
  }

  async event (id, data) {
    const event = {
      /** 产生连接 */
      lifecycle: async () => {
        const bot = await Bot.shamrock.get(id)
        common.info(id, `建立连接成功，正在加载资源：${bot['user-agent']}`)
        return new addBot(id)
      },
      /** 心跳 */
      heartbeat: async () => {
        return await common.debug(id, `心跳：${data.status['qq.status']}`)
      },
      /** 消息事件 */
      message: async () => {
        return await Bot.emit('message', await message.msg(data))
      },
      /** 戳一戳 */
      notice: async () => {
        // Bot.emit(data.post_type, await zaiMsg.msg(data))
        data.post_type = 'notice'
        switch (data.notice_type) {
          case 'group_recall':
            data.notice_type = 'group'
            data.sub_type = 'recall'
            if (data.operator_id === data.user_id) {
              common.info(id, `群消息撤回：[${data.group_id}，${data.user_id}] ${data.message_id}`)
            } else {
              common.info(id, `群消息撤回：[${data.group_id}]${data.operator_id} 撤回 ${data.user_id}的消息 ${data.message_id} `)
            }
            return await Bot.emit('notice.group', await message.msg(data))
          case 'group_increase': {
            data.notice_type = 'group'
            let sub_type = data.sub_type
            data.sub_type = 'increase'
            data.user_id = data.target_id
            if (data.self_id === data.user_id) {
              common.info(id, `机器人加入群聊：[${data.group_id}}]`)
            } else {
              switch (sub_type) {
                case 'invite': {
                  common.info(id, `[${data.operator_id}]邀请[${data.user_id}]加入了群聊[${data.group_id}] `)
                }
                default: {
                  common.info(id, `新人${data.user_id}加入群聊[${data.group_id}] `)
                }
              }
            }
            return await this.message(data)
          }
          case 'group_decrease': {
            data.notice_type = 'group'
            data.sub_type = 'decrease'
            data.user_id = data.target_id
            if (data.self_id === data.user_id) {
              common.info(id, data.operator_id
                ? `机器人被[${data.operator_id}]踢出群聊：[${data.group_id}}]`
                : `机器人退出群聊：[${data.group_id}}]`)
            } else {
              common.info(id, data.operator_id
                ? `成员[${data.user_id}]被[${data.operator_id}]踢出群聊：[${data.group_id}}]`
                : `成员[${data.user_id}]退出群聊[${data.group_id}}]`)
            }
            return await this.message(data)
          }
          case 'group_admin': {
            data.notice_type = 'group'
            data.set = data.sub_type === 'set'
            data.sub_type = 'admin'
            data.user_id = data.target_id
            if (data.self_id === data.user_id) {
              let gml = await Bot[id].gml.get(data.group_id)
              gml[data.self_id] = { ...gml[data.self_id] }
              if (data.set) {
                gml[data.self_id].role = 'admin'
                common.info(id, `机器人[${data.self_id}]在群[${data.group_id}]被设置为管理员`)
              } else {
                gml[data.self_id].role = 'member'
                common.info(id, `机器人[${data.self_id}]在群[${data.group_id}]被取消管理员`)
              }
              Bot[id].gml.set(data.group_id, { ...gml })
            } else {
              let gml = await Bot[id].gml.get(data.group_id)
              gml[data.target_id] = { ...gml[data.target_id] }
              if (data.set) {
                gml[data.target_id].role = 'admin'
                common.info(id, `成员[${data.target_id}]在群[${data.group_id}]被设置为管理员`)
              } else {
                gml[data.target_id].role = 'member'
                common.info(id, `成员[${data.target_id}]在群[${data.group_id}]被取消管理员`)
              }
              Bot[id].gml.set(data.group_id, { ...gml })
            }
            return await this.message(data)
          }
          case 'group_ban': {
            data.notice_type = 'group'
            if (data.sub_type === 'lift_ban') {
              data.sub_type = 'ban'
              data.duration = 0
            } else {
              data.sub_type = 'ban'
            }
            if (data.self_id === data.target_id) {
              common.info(id, data.duration === 0
                ? `机器人[${data.self_id}]在群[${data.group_id}]被解除禁言`
                : `机器人[${data.self_id}]在群[${data.group_id}]被禁言${data.duration}秒`)
            } else {
              common.info(id, data.duration === 0
                ? `成员[${data.target_id}]在群[${data.group_id}]被解除禁言`
                : `成员[${data.target_id}]在群[${data.group_id}]被禁言${data.duration}秒`)
            }
            return await this.message(data)
          }
          case 'notify':
            switch (data.sub_type) {
              case 'poke': {
                let action = data.poke_detail?.action || '戳了戳'
                let suffix = data.poke_detail?.suffix || ''
                common.info(id, `[${data.operator_id}]${action}[${data.target_id}]${suffix}`)
                break
              }
              default:
            }
            return await this.message(data)
          default:
        }
      },
      /** Bot自身消息 */
      message_sent: async () => {
        data.post_type = 'message'
        /** 屏蔽由喵崽处理过后发送后的消息 */
        const { self_id, message_id } = data
        await common.sleep(1000)
        if (await redis.get(`Shamrock:${self_id}:${message_id}`)) return
        return await Bot.emit('message', await message.msg(data))
      },
      request: async () => {
        data.post_type = 'request'
        switch (data.request_type) {
          case 'group': {
            data.tips = data.comment
            if (data.sub_type === 'add') {
              common.info(id, `[${data.user_id}]申请入群[${data.group_id}]: ${data.tips}`)
            } else {
              // invite
              common.info(id, `[${data.user_id}]邀请机器人入群[${data.group_id}]: ${data.tips}`)
            }
            return await this.message(data)
          }
          case 'friend': {
            data.sub_type = 'add'
            common.info(id, `[${data.user_id}]申请加机器人[${data.self_id}]好友: ${data.comment}`)
            return await Bot.emit('request', await message.msg(data))
            // return await this.message(data)
          }
        }
      }
    }

    /** 处理事件 */
    try {
      return await event[data?.meta_event_type || data?.post_type]()
    } catch (error) {
      /** 未知事件 */
      common.debug('未知事件详情：', data)
      common.error('错误信息详情：', error)
      return common.error(id, `未知事件：${data?.meta_event_type || data?.post_type}`)
    }
  }
}

/** Shamrock的WebSocket服务器实例 */
const shamrock = new WebSocketServer({ noServer: true })

shamrock.on('connection', async (bot, request) => {
  await new Shamrock().server(bot, request)
})

/** 捕获错误 */
shamrock.on('error', async error => {
  if (error.code === 'EADDRINUSE') {
    const msg = `Shamrock：启动WS服务器失败，端口${this.port}已被占用，请自行解除端口`
    return common.error(this.id, msg)
  }
  const msg = `Shamrock - 发生错误：${error.message}`
  common.error(this.id, msg)
  return await common.debug(this.id, msg)
})

export default shamrock
