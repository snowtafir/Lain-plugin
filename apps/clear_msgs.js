import api from '../adapter/shamrock/api.js'

export class clear_msgs extends plugin {
  constructor () {
    super({
      name: '三叶草-清理缓存',
      priority: -50,
      rule: [
        {
          reg: /^#清理缓存$/,
          fnc: 'clearFile',
          permission: 'master'
        }
      ]
    })
  }

  async clearFile () {
    await this.reply('开始清理~，请等待完成', true, { at: true })
    /** 获取群列表 */
    const gl = this.e.bot.gl
    gl.forEach(async (value, key) => {
      try {
        await this.e.bot.api.clear_msgs(this.e.self_id, 'group', Number(key))
      } catch (error) {
        this.reply(`清理群${key}发生错误：${error?.message || error}`)
      }
    })

    /** 获取群列表 */
    const fl = this.e.bot.fl
    fl.forEach(async (value, key) => {
      try {
        await api.clear_msgs(this.e.self_id, 'private', Number(key))
      } catch (error) {
        this.reply(`清理好友${key}发生错误：${error?.message || error}`)
      }
    })

    return await this.reply('清理完成~', true, { at: true })
  }
}
