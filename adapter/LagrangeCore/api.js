import { randomUUID } from 'crypto'
import { core } from 'icqq'
import fetch, { fileFromSync, FormData } from 'node-fetch'
import Cfg from '../../lib/config/config.js'

let api = {
  /**
   * 获取消息
   * @param {string} id - 机器人QQ 通过e.bot、Bot调用无需传入
   * @param {string} message_id - 消息id
   */
  async get_msg (id, message_id) {
    const params = { message_id }
    return await this.SendApi(id, 'get_msg', params)
  },

  /**
  * 撤回消息
  * @param {string} id - 机器人QQ 通过e.bot、Bot调用无需传入
  * @param {string} message_id - 消息id
  */
  async delete_msg (id, message_id) {
    const params = { message_id }
    return await this.SendApi(id, 'delete_msg', params)
  },

  /**
  * 获取登录号信息
  * @param {string} id - 机器人QQ 通过e.bot、Bot调用无需传入
  */
  async get_login_info (id) {
    const params = {}
    return await this.SendApi(id, 'get_login_info', params)
  },

  /**
  * 设置 QQ 个人资料
  * @param {string} id - 机器人QQ 通过e.bot、Bot调用无需传入
  * @param {string} nickname - 昵称
  * @param {string} company - 公司
  * @param {string} email - 邮箱
  * @param {string} college - 大学
  * @param {string} personal_note - 个人备注
  * @param {number} [age] - 年龄 (可选)
  * @param {string} [birthday] - 生日 (格式：YYYY-MM-DD) (可选)
  */
  async set_qq_profile (id, nickname, company, email, college, personal_note, age, birthday) {
    const params = { nickname, company, email, college, personal_note, age, birthday }
    return await this.SendApi(id, 'set_qq_profile', params)
  },

  /**
  * 获取陌生人信息
  * @param {string} id - 机器人QQ 通过e.bot、Bot调用无需传入
  * @param {string} user_id - 陌生人QQ
  */
  async get_stranger_info (id, user_id, no_cache = false) {
    const params = { user_id, no_cache }
    return await this.SendApi(id, 'get_stranger_info', params)
  },

  /**
  * 获取好友列表
  * @param {string} id - 机器人QQ 通过e.bot、Bot调用无需传入
  */
  async get_friend_list (id) {
    const params = {}
    return await this.SendApi(id, 'get_friend_list', params)
  },

  /**
  * 获取单向好友列表 (未实现)
  * @param {string} id - 机器人QQ 通过e.bot、Bot调用无需传入
  */
  async get_unidirectional_friend_list (id) {
    const params = {}
    return await this.SendApi(id, 'get_unidirectional_friend_list', params)
  },

  /**
  * 获取群信息
  * @param {string} id - 机器人QQ 通过e.bot、Bot调用无需传入
  * @param {number} group_id - 群号
  * @param refresh 是否刷新
  */
  async get_group_info (id, group_id, refresh = false) {
    const params = { group_id, refresh }
    return await this.SendApi(id, 'get_group_info', params)
  },

  /**
  * 获取群列表
  * @param {string} id - 机器人QQ 通过e.bot、Bot调用无需传入
  */
  async get_group_list (id) {
    const params = {}
    return await this.SendApi(id, 'get_group_list', params)
  },

  /**
  * 获取群成员信息
  * @param {string} id - 机器人QQ 通过e.bot、Bot调用无需传入
  * @param {number} group_id - 群号
  * @param {number} user_id - 群成员QQ号
  * @param {boolean} refresh - 是否强制刷新，会获取age, area和level字段
  */
  async get_group_member_info (id, group_id, user_id, refresh = false) {
    const params = { group_id, user_id, refresh }
    return await this.SendApi(id, 'get_group_member_info', params)
  },

  /**
  * 获取群成员列表
  * @param {string} id - 机器人QQ 通过e.bot、Bot调用无需传入
  * @param {number} group_id - 群号
  */
  async get_group_member_list (id, group_id) {
    const params = { group_id }
    return await this.SendApi(id, 'get_group_member_list', params)
  },

  /**
  * 获取群荣誉信息
  * @param {string} id - 机器人QQ 通过e.bot、Bot调用无需传入
  * @param {number} group_id - 群号
  */
  async get_group_honor_info (id, group_id) {
    const params = { group_id }
    return await this.SendApi(id, 'get_group_honor_info', params)
  },

  /**
  * 获取群系统消息
  * @param {string} id - 机器人QQ 通过e.bot、Bot调用无需传入
  */
  async get_group_system_msg (id) {
    const params = {}
    return await this.SendApi(id, 'get_group_system_msg', params)
  },

  /**
  * 获取精华消息列表
  * @param {string} id - 机器人QQ 通过e.bot、Bot调用无需传入
  * @param {number} group_id - 群号
  */
  async get_essence_msg_list (id, group_id) {
    const params = { group_id }
    return await this.SendApi(id, 'get_essence_msg_list', params)
  },

  /**
  * QQ是否在黑名单内
  * @param {string} id - 机器人QQ 通过e.bot、Bot调用无需传入
  * @param {number} user_id - QQ账号
  */
  async is_blacklist_uin (id, user_id) {
    const params = { user_id }
    return await this.SendApi(id, 'is_blacklist_uin', params)
  },

  /**
  * 删除好友 (未实现)
  * @param {string} id - 机器人QQ 通过e.bot、Bot调用无需传入
  * @param {number} user_id - 好友 QQ 号
  */
  async delete_friend (id, user_id) {
    const params = { user_id }
    return await this.SendApi(id, 'delete_friend', params)
  },
  /**
  * 删除单向好友 (未实现)
  * @param {string} id - 机器人QQ 通过e.bot、Bot调用无需传入
  * @param {number} user_id - 单向好友QQ号
  */
  async delete_unidirectional_friend (id, user_id) {
    const params = { user_id }
    return await this.SendApi(id, 'delete_unidirectional_friend', params)
  },

  /**
  * 设置群名
  * @param {string} id - 机器人QQ 通过e.bot、Bot调用无需传入
  * @param {number} group_id - 群号
  * @param {string} group_name - 新群名
  */
  async set_group_name (id, group_id, group_name) {
    const params = { group_id, group_name }
    return await this.SendApi(id, 'set_group_name', params)
  },

  /**
  * 设置群头像
  * @param {string} id - 机器人QQ 通过e.bot、Bot调用无需传入
  * @param {number} group_id - 群号
  * @param {number} file - 图片文件
  * @param {number} cache - 是否使用已缓存的文件 通过网络URL发送时有效, 1表示使用缓存, 0关闭关闭缓存
  */
  async set_group_portrait (id, group_id, file, cache = 1) {
    const params = { group_id, file, cache }
    return await this.SendApi(id, 'set_group_portrait', params)
  },

  /**
  * 设置群管理员
  * @param {string} id - 机器人QQ 通过e.bot、Bot调用无需传入
  * @param {number} group_id - 群号
  * @param {number} user_id - QQ账号
  * @param {bool} enable - 是否设置
  */
  async set_group_admin (id, group_id, user_id, enable) {
    const params = { group_id, user_id, enable }
    return await this.SendApi(id, 'set_group_admin', params)
  },

  /**
  * 设置群备注
  * @param {string} id - 机器人QQ 通过e.bot、Bot调用无需传入
  * @param {number} group_id - 群号
  * @param {number} user_id - QQ账号
  * @param {string} card - 群名片内容, 不填或空字符串表示删除群名片
  */
  async set_group_card (id, group_id, user_id, card) {
    const params = { group_id, user_id, card }
    return await this.SendApi(id, 'set_group_card', params)
  },

  /**
  * 设置群组专属头衔
  * @param {string} id - 机器人QQ 通过e.bot、Bot调用无需传入
  * @param {number} group_id - 群号
  * @param {number} user_id - QQ号
  * @param {string} special_title - 头衔
  */
  async set_group_special_title (id, group_id, user_id, special_title) {
    const params = { group_id, user_id, special_title }
    return await this.SendApi(id, 'set_group_special_title', params)
  },

  /**
  * 群单人禁言
  * @param {string} id - 机器人QQ 通过e.bot、Bot调用无需传入
  * @param {number} group_id - 群号
  * @param {number} user_id - QQ号
  * @param {number} duration - 禁言时长，为 0 时，将解除禁言。
  */
  async set_group_ban (id, group_id, user_id, duration) {
    const params = { group_id, user_id, duration }
    return await this.SendApi(id, 'set_group_ban', params)
  },

  /**
  * 群全员禁言
  * @param {string} id - 机器人QQ 通过e.bot、Bot调用无需传入
  * @param {number} group_id - 群号
  * @param {boolean} enable - 是否禁言
  */
  async set_group_whole_ban (id, group_id, enable) {
    const params = { group_id, enable }
    return await this.SendApi(id, 'set_group_whole_ban', params)
  },

  /**
  * 设置精华消息
  * @param {string} id - 机器人QQ 通过e.bot、Bot调用无需传入
  * @param {number} message_id - 消息ID
  */
  async set_essence_msg (id, message_id) {
    const params = { message_id }
    return await this.SendApi(id, 'set_essence_msg', params)
  },

  /**
  * 移出精华消息
  * @param {string} id - 机器人QQ 通过e.bot、Bot调用无需传入
  * @param {number} message_id - 消息ID
  */
  async delete_essence_msg (id, message_id) {
    const params = { message_id }
    return await this.SendApi(id, 'delete_essence_msg', params)
  },

  /**
  * 群打卡
  * @param {string} id - 机器人QQ 通过e.bot、Bot调用无需传入
  * @param {number} group_id - 群号
  */
  async send_group_sign (id, group_id) {
    const params = { group_id }
    return await this.SendApi(id, 'send_group_sign', params)
  },

  /**
  * 发送群公告
  * @param {string} id - 机器人QQ 通过e.bot、Bot调用无需传入
  * @param {number} group_id - 群号
  * @param {string} content - 公告内容
  * @param {string} image - 图片路径（可选）
  */
  async send_group_notice (id, group_id, content, image) {
    const params = { group_id, content, image }
    return await this.SendApi(id, '_send_group_notice', params)
  },

  /**
  * 获取群公告
  * @param {string} id - 机器人QQ 通过e.bot、Bot调用无需传入
  * @param {number} group_id - 群号
  */
  async get_group_notice (id, group_id) {
    const params = { group_id }
    return await this.SendApi(id, '_get_group_notice', params)
  },

  /**
  * 群组踢人
  * @param {string} id - 机器人QQ 通过e.bot、Bot调用无需传入
  * @param {number} group_id - 群号
  * @param {number} user_id - QQ号
  * @param {boolean} reject_add_request - 是否拒绝再次加群
  */
  async set_group_kick (id, group_id, user_id, reject_add_request) {
    const params = { group_id, user_id, reject_add_request }
    return await this.SendApi(id, 'set_group_kick', params)
  },

  /**
  * 退出群组
  * @param {string} id - 机器人QQ 通过e.bot、Bot调用无需传入
  * @param {number} group_id - 群号
  */
  async set_group_leave (id, group_id) {
    const params = { group_id }
    return await this.SendApi(id, 'set_group_leave', params)
  },

  /**
  * 戳一戳
  * @param {string} id - 机器人QQ 通过e.bot、Bot调用无需传入
  * @param {number} user_id - QQ号
  * @param {number|null} group_id - 群号
  */
  async poke (id, user_id, group_id = null) {
    const params = {
      group_id,
      user_id
    }
    return await this.SendApi(id, 'send_poke', params)
  },

  /**
  * 上传私聊文件
  * @param {string} id - 机器人QQ 通过e.bot、Bot调用无需传入
  * @param {number} user_id - 对方QQ号
  * @param {string} file - 本地文件路径
  * @param {string} name - 文件名称
  */
  async upload_private_file (id, user_id, file, name) {
    const params = { user_id, file, name }
    return await this.SendApi(id, 'upload_private_file', params)
  },

  /**
  * 上传群文件
  * @param {string} id - 机器人QQ 通过e.bot、Bot调用无需传入
  * @param {number} group_id - 群号
  * @param {string} file - 本地文件路径
  * @param {string} name - 储存名称
  */
  async upload_group_file (id, group_id, file, name) {
    const params = { group_id, file, name }
    return await this.SendApi(id, 'upload_group_file', params)
  },

  /**
  * 删除群文件
  * @param {string} id - 机器人QQ 通过e.bot、Bot调用无需传入
  * @param {number} group_id - 群号
  * @param {string} file_id - 文件ID 参考 File 对象
  * @param {number} busid - 文件类型 参考 File 对象
  */
  async delete_group_file (id, group_id, file_id, busid) {
    const params = { group_id, file_id, busid }
    return await this.SendApi(id, 'delete_group_file', params)
  },

  /**
  * 创建群文件文件夹
  * @param {string} id - 机器人QQ 通过e.bot、Bot调用无需传入
  * @param {number} group_id - 群号
  */
  async create_group_file_folder (id, group_id) {
    const params = { group_id }
    return await this.SendApi(id, 'create_group_file_folder', params)
  },

  /**
  * 删除群文件文件夹
  * @param {string} id - 机器人QQ 通过e.bot、Bot调用无需传入
  * @param {number} group_id - 群号
  * @param {string} folder_id - 文件夹ID 参考 Folder 对象
  */
  async delete_group_folder (id, group_id, folder_id) {
    const params = { group_id, folder_id }
    return await this.SendApi(id, 'delete_group_folder', params)
  },

  /**
  * 获取群文件系统信息
  * @param {string} id - 机器人QQ 通过e.bot、Bot调用无需传入
  * @param {number} group_id - 群号
  */
  async get_group_file_system_info (id, group_id) {
    const params = { group_id }
    return await this.SendApi(id, 'get_group_file_system_info', params)
  },

  /**
  * 获取群根目录文件列表
  * @param {string} id - 机器人QQ 通过e.bot、Bot调用无需传入
  * @param {number} group_id - 群号
  */
  async get_group_root_files (id, group_id) {
    const params = { group_id }
    return await this.SendApi(id, 'get_group_root_files', params)
  },

  /**
  * 获取群子目录文件列表
  * @param {string} id - 机器人QQ 通过e.bot、Bot调用无需传入
  * @param {number} group_id - 群号
  * @param {string} folder_id - 文件夹ID 参考 Folder 对象
  */
  async get_group_files_by_folder (id, group_id, folder_id) {
    const params = { group_id, folder_id }
    return await this.SendApi(id, 'get_group_files_by_folder', params)
  },

  /**
  * 获取群文件资源链接
  * @param {string} id - 机器人QQ 通过e.bot、Bot调用无需传入
  * @param {number} group_id - 群号
  * @param {string} file_id - 文件ID 参考 File 对象
  * @param {number} busid - 文件类型 参考 File 对象
  */
  async get_group_file_url (id, group_id, file_id, busid) {
    const params = { group_id, file_id, busid }
    return await this.SendApi(id, 'get_group_file_url', params)
  },

  /**
  * 点赞
  * @param {string} id - 机器人QQ 通过e.bot、Bot调用无需传入
  * @param {number} user_id - 对方 QQ 号
  * @param {number} times - 点赞次数
  */
  async send_like (id, user_id, times) {
    times = Number(times)
    times = times > 20 || times > 10 ? times = 20 : times = 10
    const params = { user_id, times }
    return await this.SendApi(id, 'send_like', params)
  },

  /**
  * 获取历史消息
  * @param {string} id - 机器人QQ 通过e.bot、Bot调用无需传入
  * @param {string} message_type - 消息 类型 必填 （private或group）
  * @param {number} user_id - 私聊QQ
  * @param {number} group_id - 群号
  * @param {number} count - 获取的消息数量（默认为20）
  * @param {number} message_id - 起始消息的message_id（默认为0，表示从最后一条发言往前）
  */
  async get_history_msg (id, message_type, user_id, group_id, count, message_id) {
    const params = { message_type, user_id, group_id, count, message_id }
    return await this.SendApi(id, 'get_history_msg', params)
  },

  /**
  * 获取群聊历史消息
  * @param {string} id - 机器人QQ 通过e.bot、Bot调用无需传入
  * @param {number} group_id - 群号
  * @param {number} count - 获取的消息数量（默认为20）
  * @param {number} message_id - 起始消息的message_id（默认为0，表示从最后一条发言往前）
  */
  async get_group_msg_history (id, group_id, count, message_id) {
    const params = { group_id, message_id, count }
    return await this.SendApi(id, 'get_group_msg_history', params)
  },

  /**
  * 获取好友历史消息
  * @param {string} id - 机器人QQ 通过e.bot、Bot调用无需传入
  * @param {number} user_id - 好友qq号
  * @param {number} count - 获取的消息数量（默认为20）
  * @param {number} message_id - 起始消息的message_id（默认为0，表示从最后一条发言往前）
  */
  async get_friend_msg_history (id, user_id, count, message_id) {
    const params = { user_id, message_id, count }
    return await this.SendApi(id, 'get_friend_msg_history', params)
  },

  /**
  * 清除本地缓存消息
  * @param {string} id - 机器人QQ 通过e.bot、Bot调用无需传入
  * @param {string} message_type - 消息 类型 必填 private 或 group
  * @param {number} TargetID - 目标群或者目标好友
  */
  async clear_msgs (id, message_type, TargetID) {
    let type = 'user_id'
    if (message_type == 'group') type = 'group_id'
    const params = { message_type, [type]: TargetID }
    return await this.SendApi(id, 'clear_msgs', params)
  },

  /**
  * 获取token
  * @param id
  * @param domain
  * @return {Promise<*|string>}
  */
  async get_cookies (id, domain = '') {
    const params = { domain }
    return await this.SendApi(id, 'get_cookies', params)
  },

  /**
  * 获取csrf_token
  * @param id
  * @param domain
  * @return {Promise<*|string>}
  */
  async get_csrf_token (id, domain = '') {
    const params = { domain }
    return await this.SendApi(id, 'get_csrf_token', params)
  },

  /**
  * 处理加好友请求
  * @param id
  * @param flag 加好友请求的 flag（需从上报的数据中获得）
  * @param approve 是否同意请求
  * @param remark 添加后的好友备注（仅在同意时有效）
  * @return {Promise<*|string>}
  */
  async set_friend_add_request (id, flag, approve, remark = '') {
    const params = { flag, approve, remark }
    return await this.SendApi(id, 'set_friend_add_request', params)
  },

  /**
  * 处理加群请求／邀请
  * @param id
  * @param flag 加好友请求的 flag（需从上报的数据中获得）
  * @param sub_type add 或 invite, 请求类型（需要和上报消息中的 sub_type 字段相符）
  * @param approve 是否同意请求／邀请
  * @param reason 拒绝理由（仅在拒绝时有效）
  * @return {Promise<*|string>}
  */
  async set_group_add_request (id, flag, sub_type, approve, reason = '') {
    const params = { flag, sub_type, approve, reason }
    return await this.SendApi(id, 'set_group_add_request', params)
  },

  /**
  * 获取城市ADCode
  * @param id
  * @param city 城市
  * @return {Promise<*|string>}
  */
  async get_weather_city_code (id, city) {
    const params = { city }
    return await this.SendApi(id, 'get_weather_city_code', params)
  },

  /**
  * 上传文件到缓存目录
  * @param {string} id - 机器人QQ 通过e.bot、Bot调用无需传入
  * @param {string} file - 文件本地地址
  * @return {Promise<{file, md5}>} file为文件在shamrock端的本地路径，可用于发送文件、语音、视频等
  */
  async upload_file (id, file) {
    let formData = new FormData()
    formData.append('file', fileFromSync(file))
    let data = await this.httpApi(id, 'upload_file', {}, formData)
    return data
  },

  async httpApi (id, action, headers, data, query = '') {
    if (!Cfg.Shamrock.baseUrl || !Cfg.Shamrock.baseUrl.startsWith('http')) {
      return lain.warn(id, '未配置Shamrock主动http端口')
    }
    if (!headers) {
      headers = {}
    }
    headers['User-Agent'] = 'Lain-Plugin/1.3.3'
    let baseUrl = Cfg.Shamrock.baseUrl
    let token = Cfg.Shamrock.token
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
    const bot = Bot[id]
    if (!bot) return lain.error(id, '不存在此Bot')
    let res = await fetch(baseUrl + '/' + action + query, {
      headers,
      body: data,
      method: 'post'
    })
    if (res.ok) {
      let result = await res.json()
      return result.data
    } else {
      let result = await res.json()
      lain.error(id, result)
      return {}
    }
  },

  /**
  * 下载文件到缓存目录
  * @param {string} id - 机器人QQ 通过e.bot、Bot调用无需传入
  * @param {string} file - 可传入url或base64，请注意必须为 http(s)?:// 或 base64:// 开头
  * @param {number} thread_cnt - (可选)下载的线程数量
  * @param {string | array} headers - (可选)请求头
  */
  async download_file (id, file, thread_cnt, headers) {
    if (typeof file !== 'string') return
    let type
    if (/https?:\/\//.test(file)) {
      type = 'url'
    } else if (/base64:\/\//.test(file)) {
      type = 'base64'
      file = file.replace('base64://', '')
    } else {
      return lain.error(id, `下载文件到缓存目录Api：未适配的格式，${file}`)
    }
    let params = { [type]: file }
    if (headers) {
      params.headers = headers
    }
    if (thread_cnt) {
      params.thread_cnt = thread_cnt
    }
    return await this.SendApi(id, 'download_file', params)
  },

  /**
  * 获取合并转发消息内容
  * @param {string} id - 机器人QQ 通过e.bot、Bot调用无需传入
  * @param {string} msg_id - 消息资源ID（卡片消息里面的resId）
  */
  async get_forward_msg (id, msg_id) {
    const params = { msg_id }
    return await this.SendApi(id, 'get_forward_msg', params)
  },

  /**
  * 发送群聊合并转发
  * @param {string} id - 机器人QQ 通过e.bot、Bot调用无需传入
  * @param {number} group_id - 发送到的目标群号
  * @param {foward message[]} messages  - 合并转发消息集
  */
  async send_group_forward_msg (id, group_id, messages) {
    const params = { group_id, messages }
    return await this.SendApi(id, 'send_group_forward_msg', params)
  },

  /**
  * 发送私聊合并转发
  * @param {string} id - 机器人QQ 通过e.bot、Bot调用无需传入
  * @param {number} user_id - 发送到的目标群号
  * @param {foward message[]} messages  - 合并转发消息集
  */
  async send_private_forward_msg (id, user_id, messages) {
    const params = { user_id, messages }
    return await this.SendApi(id, 'send_private_forward_msg', params)
  },

  /**
  * 获取被禁言的群成员列表
  * @param {string} id - 机器人QQ 通过e.bot、Bot调用无需传入
  * @param {number} group_id - 发送到的目标群号
  */
  async get_prohibited_member_list (id, group_id) {
    const params = { group_id }
    return await this.SendApi(id, 'get_prohibited_member_list', params)
  },

  /**
  * 发送好友消息
  * @param {string} uin - 机器人QQ 通过e.bot、Bot调用无需传入
  * @param {number} user_id - 目标QQ
  * @param {object} message - 发送内容
  * @param {string} raw_message - 发送内容日志
  */
  async send_private_msg (uin, user_id, message, raw_message, node) {
    let user_name
    try {
      user_name = Bot[uin].fl.get(user_id)?.user_name
      user_name = user_name ? `${user_name}(${user_id})` : user_id
    } catch {
      user_name = user_id
    }
    /** 打印日志 */
    lain.info(uin, `<发好友:${user_name}> => ${raw_message}`)

    let res
    if (node) {
      const id = await this.SendApi(uin, 'send_private_forward_msg', { user_id, messages: message.map(i => i.data) })
      res = await this.SendApi(uin, 'send_private_msg', { user_id, message: { type: 'forward', data: { id } } })
    } else {
      const params = { user_id, message }
      res = await this.SendApi(uin, 'send_private_msg', params)
    }

    return {
      ...res,
      seq: res.message_id,
      rand: 1
    }
  },

  /**
  * 发送群聊消息
  * @param {string} uin - 机器人QQ 通过e.bot、Bot调用无需传入
  * @param {number} group_id - 目标群号
  * @param {object} message - 发送内容
  * @param {string} raw_message - 发送内容日志
  */
  async send_group_msg (uin, group_id, message, raw_message, node) {
    let group_name
    try {
      group_name = Bot[uin].gl.get(group_id)?.group_name
      group_name = group_name ? `${group_name}(${group_id})` : group_id
    } catch {
      group_name = group_id
    }
    /** 打印日志 */
    lain.info(uin, `<发送群聊:${group_name}> => ${raw_message}`)

    let res
    if (node) {
      const id = await this.SendApi(uin, 'send_group_forward_msg', { group_id, messages: message.map(i => i.data) })
      res = await this.SendApi(uin, 'send_group_msg', { group_id, message: { type: 'forward', data: { id } } })
    } else {
      const params = { group_id, message }
      res = await this.SendApi(uin, 'send_group_msg', params)
    }

    return {
      ...res,
      time: res.message_id,
      seq: res.message_id,
      rand: 1
    }
  },

  /**
  * 发送Uni包
  * @param {string} id - 机器人QQ 通过e.bot、Bot调用无需传入
  * @param {number} command - 包名
  * @param {object} body - 数据包
  * @param {string} timeout - 超时时间
  */
  async sendUni (id, command, body, timeout = 10) {
    let res = await this.SendApi(id, '.send_packet', {
      command,
      data: Buffer.from(body).toString('hex')
    }, timeout)

    if (res?.result) {
      return Buffer.from(res.result, 'hex')
    }
    return Buffer.alloc(0)
  },

  /**
  * 发送Uni包
  * @param {string} id - 机器人QQ 通过e.bot、Bot调用无需传入
  * @param {number} cmd - 包名
  * @param {object} body - 数据包
  * @param {string} timeout - 超时时间
  */
  async sendOidb (id, cmd, body, timeout = 5) {
    const sp = cmd // OidbSvc.0x568_22
      .replace('OidbSvc.', '')
      .replace('oidb_', '')
      .split('_')
    const type1 = parseInt(sp[0], 16)
    const type2 = parseInt(sp[1])
    body = core.pb.encode({
      1: type1,
      2: isNaN(type2) ? 1 : type2,
      3: 0,
      4: body,
      6: 'Linux ' + Bot[id].apk.ver
    })
    return await this.sendUni(id, cmd, body, timeout)
  },

  /**
  * 另一种发送Uni包
  * @param {string} id - 机器人QQ 通过e.bot、Bot调用无需传入
  * @param {string} type - 包类型
  * @param {string} cmd - 包名
  * @param {object} body - 数据包
  */
  async sendPacket (id, type, cmd, body) {
    if (type === 'Uni') {
      return await this.sendUni(id, cmd, body)
    } else {
      return await this.sendOidb(id, cmd, body)
    }
  },

  /**
  * 发送Uni包
  * @param {string} id - 机器人QQ 通过e.bot、Bot调用无需传入
  * @param {string} cmd - 包名
  * @param {object} body - 数据包
  * @param {boolean} isUid - 是否是UID
  * @param {string} timeout - 超时时间
  */
  async sendOidbSvcTrpcTcp (id, cmd, body, isUid = false, timeout = 5) {
    const sp = cmd // OidbSvcTrpcTcp.0xf5b_1
      .replace('OidbSvcTrpcTcp.', '')
      .split('_')
    const type1 = parseInt(sp[0], 16)
    const type2 = parseInt(sp[1])
    const _body = core.pb.encode({
      1: type1,
      2: type2,
      4: body,
      6: 'Linux ' + Bot[id].apk.ver,
      12: isUid ? 1 : 0
    })
    const payload = await this.sendUni(id, cmd, _body, timeout)
    // log(payload)
    const rsp = core.pb.decode(payload)
    if (rsp[3] === 0) {
      return rsp[4]
    }
    throw new Error(`${rsp[5]?.toString() || 'unknown error'} (${rsp[3]})`)
  },

  async getNTPicRkey (id) {
    const params = {}
    let ret = await this.SendApi(id, 'get_rkeys', params)
    const res = {}
    // eslint-disable-next-line array-callback-return
    ret.rkeys.map(i => {
      if (i.type === 'group') res.groupNTPicRkey = i.rkey
      else res.offNTPicRkey = i.rkey
    })
    return res
  },

  async thumbUp (id, user_id, times = 20) {
    times = Number(times)
    if (times > 20 || times < 0) {
      times = 20
    }
    const params = {
      user_id,
      times
    }
    let res = await this.SendApi(id, 'send_like', params)
    if (!res) return true
    else return { ...res, code: res.retcode, msg: res.data }
  },

  /**
  * 发送 WebSocket 请求
  * @param {string} id - 机器人QQ 通过e.bot、Bot调用无需传入
  * @param {string} action - 请求 API 端点
  * @param {string} params - 请求参数
  * @param {number} timeout - 超时时间
  */
  async SendApi (id, action, params, timeout = 30) {
    timeout = Math.abs(timeout)
    const echo = randomUUID()
    /** 序列化 */
    const log = JSON.stringify({ echo, action, params })

    lain.debug(id, '[ws] send -> ' + log.replace(/base64:\/\/.*?(,|]|")/g, 'base64://...$1'))
    Bot[id].ws.send(log)

    /** 等待响应 */
    for (let i = 0; i < timeout * 10; i++) {
      const data = lain.echo[echo]
      if (data) {
        delete lain.echo[echo]
        if (data.status === 'ok') {
          if (data.data?.sequence) Bot[id].sig.seq = data.data.sequence
          return data.data
        } else lain.debug(id, data); throw data
      } else {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }
    // eslint-disable-next-line no-throw-literal
    throw { status: 'error', message: '请求超时' }
  }
}

export default api
