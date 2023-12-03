import { GithubClient } from './client.js'

export const SHAMROCK_OWNER = 'whitechi73'
export const SHAMROCK_REPO = 'OpenShamrock'

export class ShamrockRepoClient {
  constructor (key) {
    this.client = new GithubClient(key)
    this.cache = {
      commits: {}
    }
  }

  /**
   * 获取最近提交
   * @returns {Promise<Object[]>}
   */
  async getCommits (num = 30, deal = false) {
    let commits = []
    if (this.cache.commits?.[num]) {
      commits = this.cache.commits?.[num]
    } else {
      commits = await this.client.getCommits({ per_page: num })
      this.cache.commits[num] = commits
    }
    if (deal) {
      commits.forEach(c => {
        c.commit.message = c.commit.message.replace(/#(\d+)/g, '<span class="sharp">#$1</span>')
      })
    }
    return commits
  }

  /**
   * 根据sha获取commit信息
   * @param sha
   * @returns {Promise<Object|*>}
   */
  async getCommitBySha (sha) {
    if (this.cache[`commits-${sha}`]) {
      return this.cache[`commits-${sha}`]
    }
    let commit = await this.client.getCommitBySha(sha)
    this.cache[`commits-${sha}`] = commit
    return commit
  }

  /**
   * 获取当前版本已经落后最新多少个测试版本了
   * @param version 如 1.0.6-dev.b5a9884 或者直接b5a9884
   * @param type beta还是release，分别对应commit喝release
   * @returns {Promise<Object[]>} 比自己当前版本新的所有commits或release
   */
  async getVersionBehind (version, type = 'beta') {
    if (this.cache[`newCommits-${type}`]) {
      return this.cache[`newCommits-${type}`]
    }
    const shaMatch = version.match(/[0-9a-f]{7,40}/)
    let sha = shaMatch ? shaMatch[0] : ''
    if (!sha) {
      console.error('错误的版本号格式，无法获取sha值')
      return null
    }
    // 当前版本对应的 commit
    let commit = await this.getCommitBySha(sha)
    let time = commit.commit.committer.date
    if (type === 'beta') {
      let newCommits = await this.client.getCommits({ since: time })
      // last one commit is itself
      newCommits.pop()
      this.cache['newCommits-beta'] = newCommits
      return newCommits
    } else if (type === 'release') {
      let releases = await this.client.getReleases()
      let newReleases = releases.filter(r => r.created_at > time)
      this.cache['newCommits-release'] = newReleases
      return newReleases
    }
    throw new Error('unknown type ' + type)
  }

  /**
   * 获取当前仓库状态
   * @returns {Promise<Object>}
   */
  async getRepoStatus () {
    if (this.cache.repo) {
      return this.cache.repo
    }
    let repo = await this.client.getRepository()
    this.cache.repo = repo
    return repo
  }

  /**
   * 获取release
   * @returns {Promise<Object[]>}
   */
  async getRelease (num = 5, deal = false) {
    let releases = await this.client.getReleases({ per_page: num })
    if (deal) {
      const regex = /@(\w+)/g
      releases.forEach(r => {
        let body = r.body
        if (body) {
          body = body
            .replaceAll('\r\n', '<br>')
            .replace(regex, '<span class="strong">@$1</span>')
            .replace(/#(\d+)/g, '<span class="sharp">#$1</span>')
          r.body = body
        }
      })
    }
    return releases
  }

  /**
   * 获取action产物
   * @param num
   * @returns {Promise<{total_count: number, artifacts: Object[]}>}
   */
  async getActions (num = 3) {
    return await this.client.getActionsArtifacts({ per_page: num })
  }
}
