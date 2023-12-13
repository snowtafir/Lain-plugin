import common from '../../model/common.js'
import SendMsg from './sendMsg.js'
import api from './api.js'
import fs from 'fs'
import path from 'path'

export default new class zaiMsg {
  /** 转换格式给云崽 */
  async msg (data) {
    const { self_id, user_id, group_id, message_type, message_id, sender } = data

    let raw_message = data.raw_message

    /** 判断是否群聊 */
    let isGroup = true

    /** 初始化e */
    let e = data

    if (data.post_type === 'message') {
      /** 处理message，引用消息 */
      const { message, source, file } = await this.message(self_id, data.message, group_id, 'e')
      e.message = message
      /** 特殊处理文件 */
      if (file) e.file = file
      /** 引用消息 */
      if (source) {
        e.source = source
        if (typeof e.source === 'string') {
          common.error(user_id, e.source)
        } else {
          e.source.message = source.raw_message
        }
      }
    } else if (e.post_type === 'notice' && e.sub_type === 'poke') {
      e.action = '戳了戳'
      raw_message = `${e.operator_id} 戳了戳 ${e.user_id}`
      /** 私聊字段 */
      if (e?.sender_id) {
        isGroup = false
        e.notice_type = 'private'
      } else {
        e.notice_type = 'group'
      }
    } else if (e.post_type === 'request') {
      switch (e.request_type) {
        case 'friend': {
          e.approve = async (approve = true) => {
            if (e.flag) {
              return await api.set_friend_add_request(self_id, e.flag, approve)
            } else {
              common.error(self_id, '处理好友申请失败：缺少flag参数')
              return false
            }
          }
          break
        }
        case 'group': {
          e.approve = async (approve = true) => {
            if (e.flag) {
              return await api.set_group_add_request(self_id, e.flag, e.sub_type, approve)
            } else {
              if (e.sub_type === 'add') {
                common.error(self_id, '处理入群申请失败：缺少flag参数')
              } else {
                // invite
                common.error(self_id, '处理邀请机器人入群失败：缺少flag参数')
              }
              return false
            }
          }
          break
        }
        default:
      }
    }
    let group_name = group_id
    /** 先打印日志 */
    if (message_type === 'private') {
      isGroup = false
      common.info(self_id, `好友消息：[${sender?.nickname || sender?.card}(${user_id})] ${raw_message}`)
    } else {
      try {
        group_name = Bot[self_id].gl.get(group_id)?.group_name
      } catch {
        group_name = group_id
      }

      common.info(self_id, `群消息：[${group_name}，${sender?.nickname || sender?.card}(${user_id})] ${raw_message}`)
    }

    /** 快速撤回 */
    e.recall = async () => {
      return await api.delete_msg(self_id, message_id)
    }
    /** 快速回复 */
    e.reply = async (msg, quote) => {
      const peer_id = isGroup ? group_id : user_id
      return await (new SendMsg(self_id, isGroup)).message(msg, peer_id, quote ? message_id : false)
    }

    /** 获取对应用户头像 */
    e.getAvatarUrl = (size = 0, id = user_id) => {
      return `https://q1.qlogo.cn/g?b=qq&s=${size}&nk=${id}`
    }

    /** 构建场景对应的方法 */
    if (isGroup) {
      try {
        e.group_name = Bot[self_id].gl.get(group_id)?.group_name || group_id
      } catch {
        e.group_name = group_id
      }

      /** 构建member */
      e.member = {
        info: {
          group_id: data?.group_id,
          user_id: data?.user_id,
          nickname: data?.sender?.card,
          last_sent_time: data?.time
        },
        card: data?.sender?.card,
        nickname: data?.sender?.nickname,
        group_id: data?.group_id,
        is_admin: data?.sender?.role === 'admin' || false,
        is_owner: data?.sender?.role === 'owner' || false,
        /** 获取头像 */
        getAvatarUrl: (size = 0) => {
          return `https://q1.qlogo.cn/g?b=qq&s=${size}&nk=${user_id}`
        },
        /** 椰奶禁言 */
        mute: async (time) => {
          return await api.set_group_ban(self_id, group_id, user_id, time)
        }
      }
      /** 获取bot是否为ow或者admin */
      let is_admin = false
      let is_owner = false
      try {
        const get_bot_info = await Bot[self_id].gml.get(group_id)
        is_admin = get_bot_info?.[self_id]?.role === 'admin' || false
        is_owner = get_bot_info?.[self_id]?.role === 'owner' || false
      } catch (err) { }
      e.group = {
        name: e.group_name,
        is_admin,
        is_owner,
        pickMember: (id, refresh = false, cb = () => {}) => {
          if (!refresh) {
            /** 取缓存！！！别问为什么，因为傻鸟同步 */
            let member = Bot[self_id].gml.get(group_id)?.[id] || {}
            member.info = { ...member }
            return {
              member,
              ...member,
              getAvatarUrl: (size = 0, userId = id) => `https://q1.qlogo.cn/g?b=qq&s=${size}&nk=${userId}`
            }
          } else {
            api.get_group_member_info(self_id, group_id, id, true).then(res => {
              if (typeof cb === 'function') {
                cb(res)
              }
            })
            return {}
          }
        },
        getChatHistory: async (msg_id, num, reply) => {
          try {
            let { messages } = await api.get_group_msg_history(self_id, group_id, num, msg_id)

            /** 获取一下消息本身 */
            if (msg_id !== 0) {
              let source = await api.get_msg(self_id, msg_id)
              messages.push(source)
            }
            messages = messages
              // 如果source获取失败，会报错
              .filter(m => Array.isArray(m?.message))
              .map(async m => {
                m.group_name = group_name
                m.atme = !!m.message.find(msg => msg.type === 'at' && msg.data?.qq == self_id)
                m.raw_message = toRaw(m.message, self_id, group_id)
                let result = await this.message(self_id, m.message, group_id, reply)
                m = Object.assign(m, result)
                return m
              })
            return Promise.all(messages)
          } catch (err) {
            // 老版本Shamrock不支持获取历史消息
            let source = await api.get_msg(self_id, msg_id)
            if (source?.message) {
              const message = []
              source.message.forEach(i => {
                if (i.type === 'at') {
                  message.push({ type: 'at', qq: Number(i.data.qq) })
                } else {
                  message.push({ type: i.type, ...i.data })
                }
              })
              source.message = message
            }
            return [source]
          }
        },
        recallMsg: async (msg_id) => {
          return await api.delete_msg(self_id, msg_id)
        },
        sendMsg: async (msg, quote) => {
          const peer_id = group_id
          return await (new SendMsg(self_id, isGroup)).message(msg, peer_id, quote ? message_id : false)
        },
        makeForwardMsg: async (forwardMsg) => {
          return await common.makeForwardMsg(forwardMsg, true)
        },
        /** 戳一戳 */
        pokeMember: async (operator_id) => {
          return await api.group_touch(self_id, group_id, operator_id)
        },
        /** 禁言 */
        muteMember: async (qq, time) => {
          return await api.set_group_ban(self_id, group_id, qq, time)
        },
        /** 全体禁言 */
        muteAll: async (type) => {
          return await api.set_group_whole_ban(self_id, group_id, type)
        },
        getMemberMap: async () => {
          let groupMember = Bot[self_id].gml.get(group_id)
          if (groupMember && Object.keys(groupMember) > 0) return groupMember
          groupMember = new Map()
          let memberList = await api.get_group_member_list(self_id, group_id)
          memberList.forEach(user => {
            groupMember.set(user.user_id, user)
          })
          return groupMember
        },
        /** 退群 */
        quit: async () => {
          return await api.set_group_leave(self_id, group_id)
        },
        /** 设置管理 */
        setAdmin: async (qq, type) => {
          return await api.set_group_admin(self_id, group_id, qq, type)
        },
        /** 踢 */
        kickMember: async (qq, reject_add_request = false) => {
          return await api.set_group_kick(self_id, group_id, qq, reject_add_request)
        },
        /** 头衔 **/
        setTitle: async (qq, title, duration) => {
          return await api.set_group_special_title(self_id, group_id, qq, title)
        },
        /** 修改群名片 **/
        setCard: async (qq, card) => {
          return await api.set_group_card(self_id, group_id, qq, card)
        },
        setEssenceMessage: async (msg_id) => {
          let res = await api.set_essence_msg(self_id, msg_id)
          if (res?.message === '成功') {
            return '加精成功'
          } else {
            return res?.message
          }
        },
        /** 移除群精华消息 **/
        removeEssenceMessage: async (msg_id) => {
          let res = await api.delete_essence_msg(self_id, msg_id)
          if (res?.message === '成功') {
            return '移除精华成功'
          } else {
            return res?.message
          }
        },
        sendFile: async (filePath) => {
          if (!fs.existsSync(filePath)) return true
          /** 先传到shamrock... */
          const base64 = 'base64://' + fs.readFileSync(filePath).toString('base64')
          const { file } = await api.download_file(self_id, base64)
          let name = path.basename(filePath)
          return await api.upload_group_file(self_id, group_id, file, name.replace(/^\./, ''))
        },
        sign: async () => {
          await api.send_group_sign(self_id, group_id)
        },
        shareMusic: async (platform, id) => {
          if (!['qq', '163'].includes(platform)) {
            return 'platform not supported yet'
          }
          let msg = new SendMsg(this.id, true)
          return await msg.message({
            type: 'music',
            data: {
              type: platform,
              id
            }
          }, group_id)
        }
      }
    } else {
      e.friend = {
        sendMsg: async (msg, quote) => {
          const peer_id = user_id
          return await (new SendMsg(self_id, isGroup)).message(msg, peer_id, quote ? message_id : false)
        },
        recallMsg: async (msg_id) => {
          return await api.delete_msg(self_id, msg_id)
        },
        makeForwardMsg: async (forwardMsg) => {
          return await common.makeForwardMsg(forwardMsg, true)
        },
        getChatHistory: async (msg_id, num, reply = true) => {
          try {
            let messages = await api.get_history_msg(self_id, 'private', user_id, null, num, msg_id)
            messages = messages.map(async m => {
              m.raw_message = toRaw(m.message, self_id, group_id)
              let result = await this.message(self_id, m.message, null, reply)
              m = Object.assign(m, result)
              return m
            })
            return Promise.all(messages)
          } catch (err) {
            // 老版本Shamrock不支持获取历史消息
            let source = await api.get_msg(self_id, msg_id)
            if (source?.message) {
              const message = []
              source.message.forEach(i => {
                if (i.type === 'at') {
                  message.push({ type: 'at', qq: Number(i.data.qq) })
                } else {
                  message.push({ type: i.type, ...i.data })
                }
              })
              source.message = message
            }
            return [source]
          }
        },
        getAvatarUrl: async (size = 0, userID = user_id) => {
          return `https://q1.qlogo.cn/g?b=qq&s=${size}&nk=${userID}`
        },
        sendFile: async (filePath) => {
          if (!fs.existsSync(filePath)) return true
          /** 先传到shamrock... */
          const base64 = 'base64://' + fs.readFileSync(filePath).toString('base64')
          const { file } = await api.download_file(self_id, base64)
          let name = path.basename(filePath)
          return await api.upload_private_file(self_id, user_id, file, name.replace(/^\./, ''))
        }
      }
    }

    /** 将收到的消息转为字符串 */
    e.toString = () => {
      return raw_message
    }

    /** 添加适配器标识 */
    e.adapter = 'shamrock'

    return e
  }

  async message (id, msg, group_id, reply = true) {
    return await message(id, msg, group_id, reply)
  }
}()

/**
 * 处理云崽的message
 * @param id
 * @param msg
 * @param group_id
 * @param reply 是否处理引用消息
 * @return {Promise<{source: (*&{user_id, raw_message: string, reply: *, seq}), message: *[]}|{source: string, message: *[]}>}
 */
export async function message (id, msg, group_id, reply = true) {
  const message = []
  let source
  let file
  for (const i of msg) {
    if (i.type === 'reply' && reply) {
      /** 引用消息的id */
      const msg_id = i.data.id
      /** id不存在滚犊子... */
      if (!msg_id) continue
      try {
        let retryCount = 0

        while (retryCount < 2) {
          source = await api.get_msg(id, msg_id)

          if (typeof source === 'string') {
            common.info(id, `获取引用消息内容失败，正在重试：第 ${retryCount} 次`)
            retryCount++
          } else {
            break
          }
        }
        if (typeof source === 'string') {
          common.error(id, '获取引用消息内容失败，重试次数上限，已终止')
          continue
        }
        common.debug('', source)
        // todo 判断引用是否追溯得到
        let source_reply = source.message.map(u => (u.type === 'at' ? { type: u.type, qq: Number(u.data.qq) } : { type: u.type, ...u.data }))

        let raw_message = toRaw(source_reply, id, group_id)

        /** 覆盖原先的message */
        source.message = source_reply
        if (reply != 'e') message.push(...source_reply)

        source = {
          ...source,
          reply: source_reply,
          seq: source.message_id,
          user_id: source.sender.user_id,
          raw_message
        }
      } catch (error) {
        logger.error(error)
      }
    } else if (i.type === 'forward') {
      /** 不理解为啥为啥不是node... */
      message.push({ type: 'node', ...i.data })
    } else if (i.type === 'file') {
      /** 文件 */
      file = i.data
    } else {
      if (i.type === 'at') {
        message.push({ type: 'at', qq: Number(i.data.qq) })
      } else {
        message.push({ type: i.type, ...i.data })
      }
    }
  }
  return { message, source, file }
}

/**
 *
 * @param msg 消息，yunzai的或shamrock格式的
 * @param self_id 机器人qq
 * @param group_id 群号
 * @return {string}
 */
export function toRaw (msg = [], self_id, group_id) {
  const raw_message = []
  for (let i of msg) {
    switch (i.type) {
      case 'image':
        raw_message.push('[图片]')
        break
      case 'text':
        i.text ? raw_message.push(i.text) : raw_message.push(i.data?.text || '')
        break
      case 'file':
        raw_message.push('[文件]')
        break
      case 'record':
        raw_message.push('[语音]')
        break
      case 'video':
        raw_message.push('[视频]')
        break
      case 'music':
        raw_message.push('[音乐]')
        break
      case 'weather':
        raw_message.push('[天气]')
        break
      case 'json':
        raw_message.push('[json]')
        break
      case 'at':
        try {
          let qq = i?.qq || i?.data?.qq
          let groupMemberList = Bot[self_id].gml.get(group_id)
          let at = groupMemberList?.[qq]
          raw_message.push(`[@${at.nickname || at.card || qq}]`)
        } catch (err) {
          raw_message.push(`[@${i?.qq || i?.data?.qq}]`)
        }
        break
      case 'reply':
        break
      default:
        raw_message.push(JSON.stringify(i))
        break
    }
  }
  return raw_message.join('').trim()
}
