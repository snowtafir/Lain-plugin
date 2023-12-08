import fs from "fs"
import chalk from "chalk"
import crypto from "crypto"
import fetch, { FormData, Blob } from "node-fetch"
import puppeteer from "../../../lib/puppeteer/puppeteer.js"
import path from "path"

/**
 * 休眠函数
 * @param ms 毫秒
 */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 打印基本日志
 * @param id 开发者id(appID)
 * @param log 日志内容
 * @param err 可选参数，日志类型
 */
function log(id, log, type = "info") {
    id = chalk.hex("#868ECC")(Bot?.[id]?.nickname ? `[${Bot?.[id]?.nickname}(${id})] ` : (id ? `[${id}] ` : ""))
    const list = {
        info: function () { logger.info(id ? id + log : log) },
        error: function () { logger.error(id ? id + log : log) },
        mark: function () { logger.mark(id ? id + log : log) },
        debug: function () { logger.debug(id ? id + log : log) },
        warn: function () { logger.warn(id ? id + log : log) },
    }
    return list[type]()
}

/** 适配器重启发送消息 */
async function init(key = "Lain:restart") {
    let restart = await redis.get(key)
    if (restart) {
        restart = JSON.parse(restart)
        const uin = restart?.uin || Bot.uin
        let time = restart.time || new Date().getTime()
        const msg_id = restart?.msg_id || false
        time = (new Date().getTime() - time) / 1000
        console.log(typeof uin)
        let msg = `重启成功：耗时${time.toFixed(2)}秒`
        try {
            if (restart.isGroup) {
                Bot[uin].pickGroup(restart.id, msg_id).sendMsg(msg)
            } else {
                Bot[uin].pickUser(restart.id).sendMsg(msg)
            }
        } catch (error) {
            /** 发送失败后等待5s重试一次，适配器可能没连接bot */
            await new Promise((resolve) => setTimeout(resolve, 5000))
            msg = `重启成功：耗时${(time + 5).toFixed(2)}秒`
            if (restart.isGroup) {
                Bot[uin].pickGroup(restart.id, msg_id).sendMsg(msg)
            } else {
                Bot[uin].pickUser(restart.id, msg_id).sendMsg(msg)
            }
        }
        redis.del(key)
    }
}

/** 将云崽过来的消息全部统一格式存放到数组里面 */
function array(data) {
    let msg = []
    /** 将格式统一为对象 随后进行转换成api格式 */
    if (data?.[0]?.data?.type === "test" || data?.[1]?.data?.type === "test") {
        msg.push(...(data?.[0].msg || data?.[1].msg))
    }
    else if (data?.data?.type === "test") {
        msg.push(...data.msg)
    }
    else if (Array.isArray(data)) {
        msg = [].concat(...data.map(i => (typeof i === "string" ? [{ type: "text", text: i }] :
            Array.isArray(i) ? [].concat(...i.map(format => (typeof format === "string" ? [{ type: "text", text: format }]
                : typeof format === "object" && format !== null ? [format] : []))) : typeof i === "object" && i !== null ? [i] : []
        )))
    }
    else if (data instanceof fs.ReadStream) {
        msg.push({ type: "image", file: `file://./${data.file.path}` })
    }
    else if (data instanceof Uint8Array) {
        msg.push({ type: "image", file: data })
    }
    else if (typeof data === "object") {
        msg.push(data)
    }
    else {
        msg.push({ type: "text", text: data })
    }
    return msg
}

/**
 * 制作转发消息
 * @param data 转发内容
 * @param node 开启后将转为shamrock格式的转发
 * @param e 特殊处理日志
 */
async function makeForwardMsg(data, node = false, e = {}) {
    const message = {}
    let allMsg = []
    /** 防止报错 */
    if (!Array.isArray(data)) data = [data]

    /** 把无限套娃拆出来 */
    for (let i = 0; i < data.length; i++) {
        let msg = data[i].message
        if (typeof msg === "object" && (msg?.data?.type === "test" || msg?.type === "xml")) {
            /** 拆出来 */
            data.splice(i, 1, ...msg.msg)
            i--
        }
    }

    for (let msg in data) {
        msg = data[msg]?.message || data[msg]
        if (!msg && msg?.type) continue
        /** 兼容喵崽更新抽卡记录 */
        if (Array.isArray(msg)) {
            msg.forEach(i => {
                if (typeof i === "string") {
                    allMsg.push({ type: "forward", text: i.trim().replace(/^\\n{1,3}|\\n{1,3}$/g, "") })
                } else {
                    allMsg.push(i)
                }
            })
        }
        /** 优先处理日志 */
        else if (typeof msg === "object" && /^#.*日志$/.test(e?.msg?.content)) {
            const splitMsg = msg.split("\n").map(i => {
                if (!i || i.trim() === "") return
                if (Bot.lain.cfg.forwar) {
                    return { type: "forward", text: i.substring(0, 1000).trim().replace(/^\\n{1,3}|\\n{1,3}$/g, "") }
                } else {
                    return { type: "forward", text: i.substring(0, 100).trim().replace(/^\\n{1,3}|\\n{1,3}$/g, "") }
                }
            })
            allMsg.push(...splitMsg.slice(0, 50))
        }
        /** AT 表情包 */
        else if (typeof msg === "object") {
            allMsg.push(msg)
        }
        /** 普通文本 */
        else if (typeof msg === "string") {
            /** 正常文本 */
            allMsg.push({ type: "forward", text: msg.replace(/^\\n{1,3}|\\n{1,3}$/g, "") })
        }
        else {
            await log("未兼容的字段：", msg)
        }
    }

    if (node) allMsg.forEach(i => { i.node = true })

    /** 对一些重复元素进行去重 */
    message.msg = Array.from(new Set(allMsg.map(JSON.stringify))).map(JSON.parse)
    /** 添加字段，用于兼容chatgpt-plugin的转发 */
    message.data = { type: "test", text: "forward", app: "com.tencent.multimsg", meta: { detail: { news: [{ text: "1" }] }, resid: "", uniseq: "", summary: "" } }
    return message
}

/** 传入路径 返回字符串格式的base64 */
async function base64(path) {
    let file = path
    try {
        if (!fs.existsSync(file)) {
            // 尝试去掉file://
            file = file.replace(/^file:\/\//, "")
            // 再次检查文件是否存在
            if (!fs.existsSync(file)) {
                file = path.replace(/^file:\/\/\//, "")
                if (!fs.existsSync(file)) return
            }
        }
        return fs.readFileSync(file, { encoding: "base64" })
    } catch (err) {
        return
    }
}

/**
 * 三方图床
 * @param file 文件路径地址
 * @param url 上传接口
 * @return url地址
 */
async function uploadFile(file, url) {
    const formData = new FormData()
    formData.append("imgfile", new Blob([fs.readFileSync(file)], { type: "image/jpeg" }), "image.jpg")
    return await fetch(url, {
        method: "POST",
        body: formData,
    })
}

/**
 * QQ图床
 * @param file 文件路径地址
 * @param uin botQQ
 * @return url地址
 */
async function uploadQQ(file, uin) {
    const base64 = fs.readFileSync(file).toString("base64")
    const { message_id } = await Bot[uin].pickUser(uin).sendMsg([segment.image(`base64://${base64}`)])
    await Bot[uin].pickUser(uin).recallMsg(message_id)
    const md5 = crypto.createHash("md5").update(Buffer.from(base64, "base64")).digest("hex")
    await sleep(1000)
    return `https://gchat.qpic.cn/gchatpic_new/0/0-0-${md5.toUpperCase()}/0?term=2&is_origin=0`
}

/**
 * 传入字符串 提取url 返回数组
 * @param url
 */
async function getUrls(url) {
    let urls = []
    /** 中文不符合url规范 */
    url = url.replace(/[\u4e00-\u9fa5]/g, "|")
    const get_urls = (await import("get-urls")).default
    try {
        urls = [...get_urls(url, { normalizeProtocol: false, stripWWW: false, removeQueryParameters: false })]
    } catch {
        log("Lain-plugin", "没有安装 get-urls 模块，建议执行pnpm install -P 进行安装使用更精准的替换url")
        const urlRegex = /(https?:\/\/)?(([0-9a-z.-]+\.[a-z]+)|(([0-9]{1,3}\.){3}[0-9]{1,3}))(:[0-9]+)?(\/[0-9a-z%/.\-_#]*)?(\?[0-9a-z=&%_\-.]*)?(\#[0-9a-z=&%_\-]*)?/ig
        urls = str.match(urlRegex)
        if (!urls) urls = []
        return urls
    }
    return urls
}

/** 渲染图片 */
async function rendering(content, error) {
    const data = {
        Yz: Bot.lain,
        error: error,
        guild: Bot.lain.version,
        msg: content,
        saveId: 'Lain-plugin',
        _plugin: 'Lain-plugin',
        tplFile: './plugins/Lain-plugin/resources/index.html',
    }
    const msg = await puppeteer.screenshot(`Lain-plugin/Lain-plugin`, data)
    return msg.file
}

/**
 * 生成message_id
 */
function message_id() {
    return Buffer.from(Date.now().toString()).toString('base64')
}

/**
 * 创建文件夹
 * @param dirname
 */
function mkdirs(dirname) {
    if (fs.existsSync(dirname)) {
        return true
    } else {
        if (mkdirs(path.dirname(dirname))) {
            fs.mkdirSync(dirname)
            return true
        }
    }
}

/**
 *
 * @param url 要下载的文件链接
 * @param destPath 目标路径，如received/abc.pdf. 目前如果文件名重复会覆盖。
 * @param headers
 * @param absolute 是否是绝对路径，默认为false，此时拼接在data/lain下
 * @returns {Promise<string>} 最终下载文件的存储位置
 */
async function downloadFile(url, destPath, headers = {}, absolute = false) {
    let response = await fetch(url, { headers })
    if (!response.ok) {
        throw new Error(`download file http error: status: ${response.status}`)
    }
    let dest = destPath
    if (!absolute) {
        const _path = process.cwd()
        dest = path.join(_path, 'data', 'lain', dest)
        const lastLevelDirPath = path.dirname(dest)
        mkdirs(lastLevelDirPath)
    }
    const fileStream = fs.createWriteStream(dest)
    await new Promise((resolve, reject) => {
        response.body.pipe(fileStream)
        response.body.on('error', err => {
            reject(err)
        })
        fileStream.on('finish', function () {
            resolve()
        })
    })
    logger.info(`File downloaded successfully! URL: ${url}, Destination: ${dest}`)
    return dest
}

/**
 * 处理segment中的图片、语音、文件
 * @param i 需要处理的对象
 * 传入类似于 {type:"image", file:"file://...", url:"http://"}
 *
 * 返回 {type:<file|buffer|base64|http|error>, file=:<file://|buffer|base64://|http://|i.file>}
 *
 * error为无法判断类型，直接返回i.file
 */

function getFile(i) {
    if (i?.url) {
        if (i.url.includes("gchat.qpic.cn") && !i.url.startsWith("https://")) {
            i = "https://" + i.url
        } else {
            i = i.url
        }
    } else {
        i = i.file
    }

    let file
    let type = "file"

    // 检查是否是Buffer类型
    if (i?.type === "Buffer" || i instanceof Uint8Array) {
        type = "buffer"
        file = i?.data || i
    }
    // 检查是否是ReadStream类型
    else if (i instanceof fs.ReadStream || i?.path) {
        if (fs.existsSync(i.path)) {
            file = `file://${i.path}`
        } else {
            file = `file://./${i.path}`
        }
    }
    // 检查是否是字符串类型
    else if (typeof i === "string") {
        if (fs.existsSync(i.replace(/^file:\/\//, ""))) {
            file = i
        }
        else if (fs.existsSync(i.replace(/^file:\/\/\//, ""))) {
            file = i.replace(/^file:\/\/\//, "file://")
        }
        else if (fs.existsSync(i)) {
            file = i
        }
        // 检查是否是base64格式的字符串
        else if (/^base64:\/\//.test(i)) {
            type = "base64"
            file = i
        }
        // 如果是url，则直接返回url
        else if (/^http(s)?:\/\//.test(i)) {
            type = "http"
            file = i
        }
        else {
            log("Lain-plugin", "未知格式，无法处理：" + i, "error")
            type = "error"
            file = i
        }
    }
    // 留个容错
    else {
        log("Lain-plugin", "未知格式，无法处理：" + i, "error")
        type = "error"
        file = i
    }

    return { type, file }
}


export default {
    sleep,
    log,
    array,
    makeForwardMsg,
    base64,
    uploadFile,
    uploadQQ,
    getUrls,
    rendering,
    init,
    message_id,
    downloadFile,
    mkdirs,
    getFile
}
