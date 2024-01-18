import fs from 'fs'
import Yaml from 'yaml'
import lodash from 'lodash'

/**
 * YAML 文件处理器类，提供读取、修改和保存 YAML 文件的功能。
 */
export default class YamlHandler {
  /**
   * 构造函数，接受 YAML 文件路径作为参数。
   * @param {string} _path - YAML 文件路径
   */
  constructor (_path) {
    /**
     * YAML 文件路径。
     * @type {string}
     * @private
     */
    this._path = _path
    this.parse()
  }

  /**
   * 解析 YAML 文件内容。
   * @private
   */
  parse () {
    /**
     * YAML 文件的解析文档。
     * @type {Yaml.Document}
     */
    this.document = Yaml.parseDocument(fs.readFileSync(this._path, 'utf8'))
  }

  /**
   * 获取 YAML 文件的 JSON 数据。
   * @returns {object} - YAML 文件的 JSON 数据
   */
  data () {
    return this.document.toJSON()
  }

  /**
   * 获取指定键的值。
   * @param {string} key - 指定的键
   * @returns {*} - 指定键的值
   */
  get (key) {
    return lodash.get(this.data(), key)
  }

  /**
   * 检查指定键是否存在。
   * @param {string} key - 指定的键
   * @returns {boolean} - 指定键是否存在
   */
  hasIn (key) {
    key = key.split('.')
    return this.document.hasIn(key)
  }

  /**
   * 检查指定的键是否存在对应的值。
   * @param {string} key - 需要检查的键
   * @param {string} value - 需要检查的值
   * @returns {boolean} - 指定键是否存在指定值
   */
  value (key, value) {
    const res = this.get(key)
    if (!res) return false
    if (Array.isArray(res)) {
      return !!res.includes(value)
    }
    return !!res[value]
  }

  /**
   * 设置指定键的值。
   * @param {string} key - 指定的键
   * @param {*} value - 要设置的值
   */
  set (key, value) {
    key = key.split('.')
    this.document.setIn(key, value)
    this.save()
  }

  /**
   * 在指定键的位置添加新的值，不能是不存在的键。
   * @param {string} key - 指定的键
   * @param {*} value - 要添加的值
   */
  addIn (key, value) {
    key = key.split('.')
    this.document.addIn(key, value)
    this.save()
  }

  /**
   * 在指定键的位置添加新的键值对。
   * @param {string} key - 指定的键
   * @param {*} val - 要添加的键值对
   * @param {Array|object|string} type - 用于初始值为空的时候初始化，默认数组
   */
  addVal (key, val, type = 'Array') {
    let value = this.get(key)

    /** 值为空，进行初始化 */
    if (!value) {
      if (type === 'Array') {
        value = []
      } else if (type === 'object') {
        value = {}
      } else if (type === 'string') {
        value = ''
      } else {
        value = []
      }
    }

    if (Array.isArray(value)) {
      value.push(val)
    } else if (typeof value === 'object') {
      value = { ...value, ...val }
    } else if (typeof value === 'object') {
      value = val
    }

    this.set(key, value)
  }

  /**
   * 删除指定键及其对应的值。
   * @param {string} key - 指定的键
   */
  del (key) {
    key = key.split('.')
    this.document.deleteIn(key)
    this.save()
  }

  /**
   * 删除指定键的特定值。
   * @param {string} key - 指定的键
   * @param {*} val - 要删除的值
   */
  delVal (key, val) {
    const value = this.get(key)
    if (Array.isArray(value)) {
      const index = value.indexOf(val)
      if (index !== -1) {
        value.splice(index, 1)
        this.set(key, value)
      } else {
        logger.error(`Value ${val} does not exist in the array.`)
      }
    } else if (typeof value === 'object' && value !== null) {
      delete value[val]
      this.set(key, value)
    } else {
      logger.error('Cannot delete key/value from non-object or non-array.')
    }
  }

  /**
   * 将修改后的 YAML 文件保存到磁盘。
   */
  save () {
    try {
      fs.writeFileSync(this._path, this.document.toString(), 'utf8')
    } catch (err) {
      logger.error(`Failed to update YAML: ${err?.message}`)
    }
  }
}
