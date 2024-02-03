/**
*  模板源码
*  {{.text_0}}{{.text_1}}{{.text_2}}{{.text_3}}{{.text_4}}{{.text_5}}{{.text_6}}{{.text_7}}{{.text_8}}{{.text_9}}
*  正常设置模板ID 模式设置4：#QQBotMD4
*/

import plugin from '../Lain-plugin/adapter/QQBot/plugins.js'

Bot.Markdown = async function (e, data, button = []) {
  let text = []
  const image = []
  const message = []

  for (let i of data) {
    switch (i.type) {
      case 'text':
        text.push(i.text.replace(/\n/g, '\r').trim())
        break
      case 'image':
        image.push(i)
        break
      default:
        break
    }
  }

  /** 处理二笔语法，分割为数组 */
  text = parseMD(text.join(''))

  /** 先分个组吧! */
  if (image.length > text.length) {
    for (const i in image) message.push({ text: text?.[i], image: image?.[i] })
  } else {
    for (const i in text) message.push({ text: text?.[i], image: image?.[i] })
  }

  return await combination(e, message, button)
}

/** 处理md标记 */
function parseMD (str) {
  /** 处理第一个标题 */
  str = str.replace(/^#/, '\r#')
  let msg = str.split(/(\*\*\*|\*\*|\*|__|_|~~|~)/).filter(Boolean)

  let mdSymbols = ['***', '**', '*', '__', '_', '~~', '~']
  let result = []
  let temp = ''

  for (let i = 0; i < msg.length; i++) {
    if (mdSymbols.includes(msg[i])) {
      temp += msg[i]
    } else {
      if (temp !== '') {
        result.push(temp)
        temp = ''
      }
      temp += msg[i]
    }
  }

  if (temp !== '') result.push(temp)
  return result
}

/** 按9进行分类 */
function sort (arr) {
  const Array = []
  for (let i = 0; i < arr.length; i += 9) Array.push(arr.slice(i, i + 9))
  return Array
}

/** 组合 */
async function combination (e, data, but) {
  const all = []
  /** 按9分类 */
  data = sort(data)
  for (let p of data) {
    const params = []
    const length = p.length
    /** 头要特殊处理 */
    params.push({ key: 'text_0', values: [(p[0]?.text || '') + (p[0].image ? `![图片 #${p[0].image?.width}px #${p[0].image?.height}px` : '')] })
    for (let i = 1; i < length; i++) {
      let val = []
      /** 上一个图片的后续链接 */
      if (p[i - 1]?.image) val.push(`](${p[i - 1].image.file})`)
      /** 当前对象的文字和图片的开头 */
      val.push(p[i]?.image ? `${(p[i].text || '')}![图片 #${p[i].image.width}px #${p[i].image.height}px` : (p[i].text || ''))
      params.push({ key: 'text_' + (i), values: [val.join('')] })
    }

    /** 尾巴也要! */
    if (p[length - 1]?.image) params.push({ key: `text_${length}`, values: [`](${p[length - 1].image.file})`] })

    /** 转为md */
    const markdown = {
      type: 'markdown',
      custom_template_id: e.bot.config.markdown.id,
      params
    }

    /** 按钮 */
    const button = await Button(e)
    button && button?.length ? all.push([markdown, ...button, ...but]) : all.push([markdown, ...but])
  }
  return all
}

/** 按钮添加 */
async function Button (e) {
  try {
    for (let p of plugin) {
      for (let v of p.plugin.rule) {
        const regExp = new RegExp(v.reg)
        if (regExp.test(e.msg)) {
          p.e = e
          const button = await p[v.fnc](e)
          /** 无返回不添加 */
          if (button) return [...(Array.isArray(button) ? button : [button])]
          return false
        }
      }
    }
  } catch (error) {
    logger.error('Lain-plugin', error)
    return false
  }
}
