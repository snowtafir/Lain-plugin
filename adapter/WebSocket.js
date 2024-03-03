import express from 'express'
import fs from 'fs'
import { createServer } from 'http'
import Cfg from '../lib/config/config.js'
import LagrangeCore from './LagrangeCore/index.js'
import ComWeChat from './WeChat/index.js'
import shamrock from './shamrock/index.js'

class WebSocket {
  constructor () {
    this.port = Cfg.port
    this.path = {
      '/Shamrock': shamrock,
      '/ComWeChat': ComWeChat,
      '/LagrangeCore': LagrangeCore
    }
  }

  /** run! */
  start () {
    this.server()
  }

  async server () {
    /** 保存监听器返回 */
    lain.echo = new Map()
    /** 微信登录 */
    Bot.lain.loginMap = new Map()
    /** 临时文件 */
    lain.Files = new Map()
    /** 创建Express应用程序 */
    const app = express()
    /** 创建HTTP服务器 */
    this.Server = createServer(app)

    /** 设置静态文件服务 */
    app.use('/api/File', express.static(process.cwd() + '/temp/FileToUrl'))

    /** QQBotApi */
    app.get('/api/File/:token', async (req, res) => {
      const { ip } = req
      const token = req.params.token
      const filePath = process.cwd() + '/temp/FileToUrl/' + req.params.token
      /** 收到日志 */
      logger.mark('[GET请求] ' + logger.blue(`[${token}] ->[${req.get('host')}] ->[${ip}]`))

      try {
        /** 读 */
        const File = lain.Files.get(filePath)

        /** 缓存有 */
        if (File) {
          // res.setHeader('Content-Type', File.mime)
          res.setHeader('Content-Type', 'application/octet-stream')
          res.setHeader('Content-Disposition', 'inline')
          logger.mark('[发送文件] ' + logger.blue(`[${token}] => [${File.md5}] => [${ip}]`))
          fs.createReadStream(filePath).pipe(res)
        } else {
          res.status(410).json({ status: 'failed', message: '资源过期' })
          logger.mark('[请求返回] ' + logger.blue(`[${token}] => [文件已过期] => [${ip}]`))
        }
      } catch (error) {
        res.status(500).json({ status: 'failed', message: '哎呀，报错了捏' })
        logger.mark('[请求返回] ' + logger.blue(`[${token}] => [服务器内部错误] => [${ip}]`))
        logger.error(error)
      }
    })

    /** 将WebSocket服务器实例与HTTP服务器关联 */
    this.Server.on('upgrade', (request, socket, head) => {
      const pathname = request.url
      if (!this.path[pathname]) {
        logger.error(`未知连接，已拒绝连接：${request.url}`)
        return socket.destroy()
      }

      this.path[pathname].handleUpgrade(request, socket, head, (socket) => {
        this.path[pathname].emit('connection', socket, request)
      })
    })

    this.Server.listen(this.port, async () => this.log())

    /** 捕获错误 */
    this.Server.on('error', async (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`[Lain-plugin] 端口${this.port}已被占用请自行解除`)
      } else {
        logger.error(error)
      }
    })
  }

  /** 打印启动日志 */
  log () {
    logger.info('Lain-plugin', `HTTP服务器：${logger.blue(`http://localhost:${this.port}`)}`)
    /** 转为数组对象，循环打印 */
    Object.entries(this.path).forEach(([key, value]) => {
      logger.info('Lain-plugin', `本地 ${key.replace('/', '')} 连接地址：${logger.blue(`ws://localhost:${this.port}${key}`)}`)
    })
  }
}

export default new WebSocket()
