import shamrock from "./shamrock/app.js"
import ComWeChat from "./WeChat/ComWx.js"
import express from "express"
import { createServer } from "http"
import common from "../model/common.js"

export default class WebSocket {
    constructor() {
        this.port = Bot.lain.cfg.port
        this.path = "/Shamrock"
        this.path_wx = "/ComWeChat"
    }

    async server() {
        /** 存储连接的bot对象 */
        Bot.shamrock = new Map()
        /** 保存监听器返回 */
        Bot.lain.on = new Map()
        /** 创建Express应用程序 */
        const app = express()
        /** 创建HTTP服务器 */
        const httpServer = createServer(app)

        /** 将WebSocket服务器实例与HTTP服务器关联 */
        httpServer.on("upgrade", (request, socket, head) => {
            const pathname = request.url
            if (pathname === this.path) {
                shamrock.handleUpgrade(request, socket, head, (socket) => {
                    shamrock.emit("connection", socket, request)
                })
            }
            else if (pathname === this.path_wx) {
                ComWeChat.handleUpgrade(request, socket, head, (socket) => {
                    ComWeChat.emit("connection", socket, request)
                })
            }
            else {
                logger.error("", `未知连接，已拒绝连接：${request.url}`)
                socket.destroy()
            }
        })

        httpServer.listen(this.port, async () => {
            await common.log("", `本地 Shamrock 连接地址：${logger.blue(`ws://localhost:${this.port}${this.path}`)}`)
            await common.log("", `本地 ComWeChat 连接地址：${logger.blue(`ws://localhost:${this.port}${this.path_wx}`)}`)
        })
    }
}