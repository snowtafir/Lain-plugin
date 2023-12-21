// 提供全局变量供外部调用
import fs from 'fs'
import sizeOf from 'image-size'
import crypto from 'crypto'
import fetch from 'node-fetch'

/**
 * 处理传入的图片文件，返回图片宽、高、转存后的url
 * 可以是http://、file://、base64://、buffer
 * @param {string|Buffer} file - 传入的图片文件
 * @returns {Object} dimensions - 图片的尺寸和转存后的url
 * @returns {number} dimensions.width - 图片的宽度
 * @returns {number} dimensions.height - 图片的高度
 * @returns {string} dimensions.url - 图片转存到本机后的公网url
 */
async function imgProc (file) {
  const time = `${Date.now()}.jpg`
  const fileNew = process.cwd() + `/plugins/Lain-plugin/resources/QQBotApi/${time}`

  let buffer
  if (Buffer.isBuffer(file)) {
    buffer = file
  } else if (file.startsWith('file://')) {
    buffer = fs.readFileSync(file.slice(7))
  } else if (file.startsWith('base64://')) {
    buffer = Buffer.from(file.slice(9), 'base64')
  } else if (/^http(s)?:\/\//.test(file)) {
    let res = await fetch(file)
    if (!res.ok) {
      throw new Error(`请求错误！状态码: ${res.status}`)
    } else {
      buffer = Buffer.from(await res.arrayBuffer())
    }
  } else {
    throw new Error('传入的文件类型不符合规则，只接受url、buffer、file://路径或者base64编码的图片')
  }

  fs.writeFileSync(fileNew, buffer)

  const dimensions = sizeOf(buffer)
  const { width, height } = dimensions
  const { port, QQBotImgIP, QQBotPort, QQBotImgToken } = Bot.lain.cfg
  let url = `http://${QQBotImgIP}:${QQBotPort || port}/api/QQBot?token=${QQBotImgToken}&name=${time}`
  let md5 = crypto.createHash('md5').update(buffer).digest('hex')
  md5 = `https://gchat.qpic.cn/gchatpic_new/0/0-0-${md5.toUpperCase()}/0?term=2`
  return { width, height, url, md5 }
}

/**
* QQ图床
* @param file 文件，支持file://,buffer,base64://
* @param uin botQQ 可选，未传入则调用Bot.uin
* @return url地址
*/
async function uploadQQ (file, uin = Bot.uin) {
  let base64
  if (Buffer.isBuffer(file)) {
    base64 = file.toString('base64')
  } else if (file.startsWith('file://')) {
    base64 = fs.readFileSync(file.slice(7)).toString('base64')
  } else if (file.startsWith('base64://')) {
    base64 = file.slice(9)
  } else {
    throw new Error('上传失败，未知格式的文件')
  }
  try {
    const { message_id } = await Bot[uin].pickUser(uin).sendMsg([segment.image(`base64://${base64}`)])
    await Bot[uin].pickUser(uin).recallMsg(message_id)
  } catch { }
  const md5 = crypto.createHash('md5').update(Buffer.from(base64, 'base64')).digest('hex')
  return `https://gchat.qpic.cn/gchatpic_new/0/0-0-${md5.toUpperCase()}/0?term=2`
}

/** 赋值给全局Bot */
Bot.imgProc = imgProc
Bot.uploadQQ = uploadQQ

export { imgProc, uploadQQ }
