import cfg from '../../../../lib/config/config.js'
import { HttpsProxyAgent } from 'https-proxy-agent'
import { SHAMROCK_OWNER, SHAMROCK_REPO } from './shamrock.js'
import fetch from 'node-fetch'

export class GithubClient {
  constructor (key) {
    this.key = key
    let proxy = cfg.bot.proxyAddress
    this.client = {
      request: (url, options = {}) => {
        const defaultOptions = proxy
          ? {
              agent: new HttpsProxyAgent(proxy)
            }
          : {}
        const mergedOptions = {
          ...defaultOptions,
          ...options
        }

        return fetch(url, mergedOptions)
      }
    }
    this.commonHeaders = {
      'X-GitHub-Api-Version': '2022-11-28',
      Accept: 'application/vnd.github+json'
    }
    if (this.key) {
      this.commonHeaders.Authorization = `Bearer ${this.key}`
    }
  }

  /**
   * 获取仓库详情
   * @param owner
   * @param repo
   * @returns {Promise<Object>}
   */
  async getRepository (owner = SHAMROCK_OWNER, repo = SHAMROCK_REPO) {
    let res = await this.client.request(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: this.commonHeaders
    })
    return await this.toJson(res)
  }

  /**
   * 获取仓库commits信息
   * @see https://docs.github.com/en/rest/commits/commits?apiVersion=2022-11-28
   * @param owner
   * @param repo
   * @param options 可选参数：since, until, per_page, page, sha等
   * @returns {Promise<Object[]>}
   */
  async getCommits (options = {}, owner = SHAMROCK_OWNER, repo = SHAMROCK_REPO) {
    let res = await this.client.request(`https://api.github.com/repos/${owner}/${repo}/commits${this.query(options)}`, {
      headers: this.commonHeaders
    })
    return await this.toJson(res)
  }

  /**
   * 获取仓库某个commit信息
   * @see https://docs.github.com/en/rest/commits/commits?apiVersion=2022-11-28#get-a-commit
   * @param owner
   * @param repo
   * @param sha commit sha
   * @returns {Promise<Object>}
   */
  async getCommitBySha (sha, owner = SHAMROCK_OWNER, repo = SHAMROCK_REPO) {
    if (!sha) {
      throw new Error('sha cannot be empty')
    }
    let res = await this.client.request(`https://api.github.com/repos/${owner}/${repo}/commits/${sha}`, {
      headers: this.commonHeaders
    })
    return await this.toJson(res)
  }

  /**
   * 获取仓库releases信息
   * @see https://docs.github.com/en/rest/releases/releases?apiVersion=2022-11-28
   * @param owner
   * @param repo
   * @param options 可选参数：per_page, page
   * @returns {Promise<Object[]>}
   */
  async getReleases (options = {}, owner = SHAMROCK_OWNER, repo = SHAMROCK_REPO) {
    let res = await this.client.request(`https://api.github.com/repos/${owner}/${repo}/releases${this.query(options)}`, {
      headers: this.commonHeaders
    })
    return await this.toJson(res)
  }

  /**
   * 获取仓库action artifacts信息
   * @see https://docs.github.com/en/rest/actions/artifacts?apiVersion=2022-11-28
   * @param owner
   * @param repo
   * @param options 可选参数：per_page, page, name
   * @returns {Promise<Object[]>}
   */
  async getActionsArtifacts (options = {}, owner = SHAMROCK_OWNER, repo = SHAMROCK_REPO) {
    let res = await this.client.request(`https://api.github.com/repos/${owner}/${repo}/actions/artifacts${this.query(options)}`, {
      headers: this.commonHeaders
    })
    return await this.toJson(res)
  }

  /**
   * params to query string
   * @param params
   * @param containsQuestionMark 结果前面是否包含?
   * @returns {string}
   */
  query (params, containsQuestionMark = true) {
    if (!params || typeof params !== 'object') {
      return ''
    }
    let q = ''
    Object.keys(params).forEach(k => {
      if (q) {
        q += '&'
      }
      q += `${k}=${params[k]}`
    })
    if (containsQuestionMark) {
      return q ? `?${q}` : ''
    }
    return q
  }

  /**
   *
   * @param {Response} res
   * @returns {Promise<Object | Object[]>}
   */
  async toJson (res) {
    if (res.status === 200) {
      return await res.json()
    } else if (res.status === 429 || (await res.text())?.includes('limited')) {
      throw new Error('Github API 访问速率超限，您可以配置免费的Github personal access token以将访问速率从60/小时提升至5,000/小时')
    }
  }
}
