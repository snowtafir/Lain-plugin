import fs from "fs"
import lodash from "lodash"
import qrcode from "qrcode"
import fetch from "node-fetch"
import { FormData, Blob } from "node-fetch"
import common from "../../model/common.js"

export default class SendMsg {
    /** 传入基本配置 */
    constructor(id, group_id, eventType, msg_id = false, group_name) {
        /** 开发者id */
        this.id = id
        /** 频道id */
        this.guild_id = group_id.guild_id
        /** 子频道id */
        this.channel_id = group_id.channel_id
        /** 消息类型 */
        this.eventType = eventType
        /** 触发消息id */
        this.msg_id = msg_id
        /** 群名称 */
        this.group_name = group_name
    }

    /** 处理消息 */
    async message(msg, quote) {
        /** 引用消息 */
        this.quote = quote
        /** 将云崽过来的消息统一为数组 */
        msg = common.array(msg)
        /** 转为api格式、打印日志、发送 */
        return await this.qg_msg(msg)
    }



    /** 转为频道格式的消息 */
    async qg_msg(msg) {
        let image = {}
        let content = []
        /** 单独存储多图片，严格按照图片顺序进行发送 */
        const ArrImg = []

        /** chatgpt-plugin */
        if (msg?.[0].type === "xml") msg = msg?.[0].msg

        for (const i of msg) {
            /** 加个延迟防止过快 */
            await common.sleep(200)
            switch (i.type) {
                case "at":
                    if (i.text === Bot[this.id]?.nickname) content.push(`<@${Bot[this.id]?.guild_id}>`)
                    else content.push(`<@${String(i.qq == 0 ? i.id : i.qq).replace("qg_", "")}>`)
                    break
                case "face":
                    content.push(`<emoji:${i.text}>`)
                    break
                case "text":
                    content.push(await this.HandleURL(i.text))
                    break
                case "image":
                    const img = await this.Base64(i)
                    if (Object.keys(image).length > 0) ArrImg.push(img)
                    /** 分片处理图片 */
                    else image = img
                    break
                case "forward":
                    /** 转发消息 */
                    if (Bot.lain.cfg.forwar) {
                        /** 构建请求参数、打印日志 */
                        const SendMsg = await this.Construct_data({
                            ...image || null,
                            content: await this.HandleURL(i.text)
                        }, false)
                        await this.SendMsg(SendMsg)
                    } else {
                        content.push(await this.HandleURL(`${i.text}\n\n`))
                    }
                    break
                default:
                    content.push(JSON.stringify(i))
                    break
            }
        }

        content = content.join("").replace(/\n{1,2}$/g, '').replace(/\n{3,4}/g, '\n')
        const Api_msg = { content: content, ...image }
        if (!content && content === "" && Object.keys(image).length === 0) return
        const res = await this.SendMsg(await this.Construct_data(Api_msg))

        /** 处理分片 */
        if (ArrImg.length > 0) {
            for (const i of ArrImg) {
                /** 延迟下... */
                await common.sleep(200)
                /** 构建请求参数、打印日志 */
                await this.SendMsg(await this.Construct_data(i, false))
            }
        }
        return res
    }

    /** 处理URL */
    async HandleURL(msg) {
        if (typeof msg !== "string") return msg
        /** 白名单url */
        const whitelist_Url = Bot.lain.cfg.whitelist_Url

        /** 需要处理的url */
        let urls = await common.getUrls(msg) || []

        if (urls.length > 0) {
            /** 检查url是否包含在白名单中的任何一个url */
            urls = urls.filter(url => {
                return !whitelist_Url.some(whitelistUrl => url.includes(whitelistUrl))
            })

            let promises = urls.map(i => {
                return new Promise((resolve, reject) => {
                    common.log("QQ频道", `url替换：${i}`, "mark")
                    qrcode.toBuffer(i, {
                        errorCorrectionLevel: "H",
                        type: "png",
                        margin: 4,
                        text: i
                    }, async (err, buffer) => {
                        if (err) reject(err)
                        const base64 = "base64://" + buffer.toString("base64")
                        const Uint8Array = await common.rendering(base64, i)
                        const Api_msg = { content: "", type: "file_image", image: Uint8Array, log: "{image：base64://...}" }
                        /** 转换的二维码连接是否撤回 */
                        const qr = Number(Bot.lain.cfg.recallQR) || 0
                        /** 构建请求参数、打印日志 */
                        const SendMsg = await this.Construct_data(Api_msg, false)
                        await this.SendMsg(SendMsg, qr)
                        msg = msg.replace(i, "[链接(请扫码查看)]")
                        msg = msg.replace(i.replace(/^http:\/\//g, ""), "[链接(请扫码查看)]")
                        msg = msg.replace(i.replace(/^https:\/\//g, ""), "[链接(请扫码查看)]")
                        resolve()
                    })
                })
            })
            await Promise.all(promises)
            return msg
        }
        return msg
    }

    /** 处理各种牛马格式的图片 返回二进制base64 { type, image: base64, log } TMD */
    async Base64(msg) {
        let log = `{image：base64://...}`
        let type = "file_image"
        let base64
        /** 米游社公告类 */
        let file = msg.file

        /** 特殊处理本地文件 */
        if (typeof file === "string") {
            if (fs.existsSync(file.replace(/^file:[/]{0,2}/, ""))) {
                base64 = fs.readFileSync(file.replace(/^file:[/]{0,2}/, ""))
                return { type, image: base64, log }

            } else if (fs.existsSync(file.replace(/^file:[/]{0,3}/, ""))) {
                base64 = fs.readFileSync(file.replace(/^file:[/]{0,3}/, ""))
                return { type, image: base64, log }
            }
        }

        /** 套娃的二进制base64 */
        if (msg.file.type === "Buffer") {
            if (!(msg.file.data instanceof Uint8Array)) {
                base64 = new Uint8Array(msg.file.data)
            } else {
                base64 = msg.file.data
            }
        }
        /** 天知道从哪里蹦出来的... */
        else if (file instanceof fs.ReadStream) {
            base64 = fs.readFileSync(`./${msg.file.path}`)
        }
        /** Uint8Array */
        else if (file instanceof Uint8Array) {
            base64 = file
        }

        /** 检测是否为频道下发图片 复读表情包用... */
        else if (typeof file === "string" && msg.url) {
            base64 = new Uint8Array(await (await fetch(msg.url)).arrayBuffer())
        }
        /** 判断url是否为白名单，否则缓存图片转为二进制 */
        else if (typeof file === "string" && /^(https|http):\/\//.test(file)) {
            const urls = Bot.lain.cfg.whitelist_Url
            const whiteRegex = new RegExp(`\\b(${urls.map(url =>
                url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g')
            if (!file.match(whiteRegex)) {
                /** 下载图片转为base64 */
                base64 = new Uint8Array(await (await fetch(file)).arrayBuffer())
            } else {
                log = `{image：${file}}`
                type = "url"
                base64 = file
            }
        }
        /** 字符串格式的base64 */
        else if (typeof file === "string") base64 = Buffer.from(file.replace(/^base64:\/\//, ""), "base64")
        else logger.error("未适配字段，请反馈:", msg)
        return { type, image: base64, log }
    }

    /** 构建请求参数并打印日志 */
    async Construct_data(Api_msg) {
        let logs = ""
        let msg = {}
        let { content, type, image, log } = Api_msg
        switch (type) {
            case "file_image":
                logs += log
                msg = new FormData()
                if (this.msg_id) msg.set("msg_id", this.msg_id)
                try {
                    /** 检测大小 */
                    let sizeInMB = image?.byteLength / (1024 * 1024)
                    /** 动态导入 */
                    const sharp = (await import("sharp")).default
                    if (sharp && sizeInMB > Number(Bot.lain.cfg.ImageSize)) {
                        await sharp(image)
                            /** 宽度像素 */
                            .resize({ width: Bot.lain.cfg.width })
                            /** 质量 */
                            .jpeg({ quality: Bot.lain.cfg.quality })
                            .toBuffer()
                            .then(data => {
                                msg.set("file_image", new Blob([data]))
                            })
                    } else {
                        if (!sharp) logger.error("[Lain-plugin] 缺少 sharp 依赖，无法进行图片压缩，请运行 pnpm install -P 或 pnpm i 进行安装依赖~")
                        /** 如果图片大小不超过2.5MB，那么直接存入SendMsg */
                        msg.set("file_image", new Blob([image]))
                    }
                } catch (err) {
                    /** 产生错误直接存入即可 */
                    msg.set("file_image", new Blob([image]))
                }
                break
            case "url":
                logs += Api_msg.log
                /** 引用消息 */
                if (this.quote) {
                    msg.message_quote = {
                        message_id: this.msg_id,
                        ignore_get_message_error: true
                    }
                }
                msg.image = image
                if (this.msg_id) msg.msg_id = this.msg_id
                break
            default:
                /** 引用消息 */
                if (this.quote) {
                    msg.message_quote = {
                        message_id: this.msg_id,
                        ignore_get_message_error: true
                    }
                }
                if (this.msg_id) msg.msg_id = this.msg_id
                break
        }
        /** 文本 */
        if (content) {
            if (msg instanceof FormData) msg.set("content", content)
            else msg.content = content
            logs += content
        }
        await common.log(this.id, `发送消息：[${this.group_name}] ${logs}`)
        return msg
    }

    /** 向API发送消息 */
    async SendMsg(msg, qr = 0) {
        /** 随机延迟 */
        await common.sleep(lodash.random(100, 300))

        /** 发送消息并储存res */
        let res
        try {
            /** 判断频道还是私聊 */
            this.eventType !== "DIRECT_MESSAGE_CREATE"
                ? res = await Bot[this.id].client.messageApi.postMessage(this.channel_id, msg)
                : res = await Bot[this.id].client.directMessageApi.postDirectMessage(this.guild_id, msg)
        } catch (error) {
            logger.error(`${Bot[this.id].nickname} 发送消息错误，正在转成图片重新发送...\n错误信息：`, error)
            /** 转换为图片发送 */
            let image = new FormData()
            if (this.msg_id) image.set("msg_id", this.msg_id)

            const content = typeof msg === "string" ? msg : "啊咧，图片发不出来"
            image.set("file_image", new Blob([await common.rendering(content, error)]))

            /** 判断频道还是私聊 */
            this.eventType !== "DIRECT_MESSAGE_CREATE"
                ? res = await Bot[this.id].client.messageApi.postMessage(this.channel_id, msg)
                : res = await Bot[this.id].client.directMessageApi.postDirectMessage(this.guild_id, msg)
        }

        /** 连接转二维码撤回 */
        if (res.data.id && qr && qr > 0) this.recallQR(this.id, res, qr)

        /** 返回消息id给撤回用？ */
        return {
            seq: res.data.seq_in_channel,
            rand: 1,
            time: parseInt(Date.parse(res.data.timestamp) / 1000),
            message_id: res.data.id
        }
    }

    /** 撤回消息 */
    async recallQR(id, res, qr) {
        setTimeout(async function () {
            await Bot[id].client.messageApi.deleteMessage(res.data.channel_id, res.data.id, false)
        }, qr * 1000)
    }
}