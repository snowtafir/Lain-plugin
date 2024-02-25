import fs from 'node:fs'
import chalk from 'chalk'
import { exec } from 'child_process'
import { Restart } from '../../other/restart.js'
import { AdapterRestart } from '../apps/restart.js'

const _path = process.cwd() + '/plugins/Lain-plugin'

/** 全局变量lain */
global.lain = {
  _path,
  _pathCfg: _path + '/config/config',
  /**
  * 休眠函数
  * @param ms 毫秒
  */
  sleep: function (ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  },
  nickname: function (id) {
    return chalk.hex('#868ECC')(Bot?.[id]?.nickname ? `<${Bot?.[id]?.nickname}:${id}>` : (id ? `<Bot:${id}>` : ''))
  },
  info: function (id, ...log) {
    logger.info(this.nickname(id) || '', ...log)
  },
  mark: function (id, ...log) {
    logger.mark(this.nickname(id) || '', ...log)
  },
  error: function (id, ...log) {
    logger.error(this.nickname(id) || '', ...log)
  },
  warn: function (id, ...log) {
    logger.warn(this.nickname(id) || '', ...log)
  },
  debug: function (id, ...log) {
    logger.debug(this.nickname(id) || '', ...log)
  },
  trace: function (id, ...log) {
    logger.trace(this.nickname(id) || '', ...log)
  },
  fatal: function (id, ...log) {
    logger.fatal(this.nickname(id) || '', ...log)
  }
}

/** 还是修改一下，不然cvs这边没法用...  */
if (!fs.existsSync('./plugins/ws-plugin/model/dlc/index.js') &&
  !fs.existsSync('./plugins/ws-plugin/model/red/index.js')) {
  const getGroupMemberInfo = Bot.getGroupMemberInfo
  Bot.getGroupMemberInfo = async function (group_id, user_id) {
    try {
      return await getGroupMemberInfo.call(this, group_id, user_id)
    } catch (error) {
      let nickname
      error?.stack?.includes('ws-plugin') ? nickname = 'chronocat' : nickname = 'Yunzai-Bot'
      return {
        group_id,
        user_id,
        nickname,
        card: nickname,
        sex: 'female',
        age: 6,
        join_time: '',
        last_sent_time: '',
        level: 1,
        role: 'member',
        title: '',
        title_expire_time: '',
        shutup_time: 0,
        update_time: '',
        area: '南极洲',
        rank: '潜水'
      }
    }
  }
}

Restart.prototype.restart = async function () {
  if (this.e?.adapter) {
    let adapter = new AdapterRestart()
    adapter.restart.call(this)
  } else {
    await this.e.reply('开始执行重启，请稍等...')
    logger.mark(`${this.e.logFnc} 开始执行重启，请稍等...`)

    let data = JSON.stringify({
      uin: this.e?.self_id || this.e.bot.uin,
      isGroup: !!this.e.isGroup,
      id: this.e.isGroup ? this.e.group_id : this.e.user_id,
      time: new Date().getTime()
    })

    let npm = await this.checkPnpm()

    try {
      await redis.set(this.key, data, { EX: 120 })
      let cm = `${npm} start`
      if (process.argv[1].includes('pm2')) {
        cm = `${npm} run restart`
      }

      exec(cm, { windowsHide: true }, (error, stdout, stderr) => {
        if (error) {
          redis.del(this.key)
          this.e.reply(`操作失败！\n${error.stack}`)
          logger.error(`重启失败\n${error.stack}`)
        } else if (stdout) {
          logger.mark('重启成功，运行已由前台转为后台')
          logger.mark(`查看日志请用命令：${npm} run log`)
          logger.mark(`停止后台运行命令：${npm} stop`)
          process.exit()
        }
      })
    } catch (error) {
      redis.del(this.key)
      let e = error.stack ?? error
      this.e.reply(`操作失败！\n${e}`)
    }

    return true
  }
}
