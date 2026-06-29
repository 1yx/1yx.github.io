# GitHub PAT（Personal Access Token）详解

> 本文以本仓库的「Strava 每日同步」GitHub Action 为例，讲清楚 PAT 是什么、解决了什么问题、GitHub 如何实现它，以及实际怎么用。

## 一、PAT 解决了什么问题

### 1. 自动化场景没法用「账号密码」登录
2021 年 8 月起，GitHub 移除了基于密码的 Git/API 认证。脚本、CI、CLI 这些**非交互式**程序不能弹浏览器登录，也不能输密码。它们需要一个**可程序化传递的凭证**——PAT 就是这个凭证：一串代表你身份的 token，放在 HTTP 请求里即可证明「我是某某用户，我有权做某事」。

### 2. CI 自带的 `GITHUB_TOKEN` 能力受限
GitHub Actions 每次运行会自动签发一个 `GITHUB_TOKEN`（前缀 `ghs_`），免配置、按当前仓库受限。但它有两个**关键短板**，正是这两点逼得我们在 Strava 同步里不得不用 PAT：

| 想做的事 | `GITHUB_TOKEN` | PAT |
|---|:---:|:---:|
| `git push` 后**触发另一个 workflow**（如 deploy.yml） | ❌ 不会触发 | ✅ 会触发 |
| `gh secret set`（管理 Actions 密钥） | ❌ 无此权限 | ✅ 可授权 |
| 读写仓库内容 | ✅ | ✅ |

- **为什么 `GITHUB_TOKEN` 的 push 不触发 workflow？** GitHub 故意把「由 `GITHUB_TOKEN` 创建的事件」排除在触发新 workflow 之外，防止 workflow 互相触发形成**死循环**。所以 Strava action 若用 `GITHUB_TOKEN` 推 `activities.json`，`deploy.yml` 不会被触发，站点就不会更新。
- **为什么 `GITHUB_TOKEN` 不能管 secret？** 它的权限集里压根没有 `secrets` 这一档。而我们要每个同步周期把**轮转后的 Strava refresh_token 写回 `STRAVA_REFRESH_TOKEN` secret**，这必须用 PAT。

→ 于是我们新建了一个 fine-grained PAT，存进仓库 secret `STRAVA_PAT`，专门干这两件事。

## 二、PAT 是什么

PAT = Personal Access Token，个人访问令牌。本质是**代表某个用户身份的长效 bearer token**：你拿着它去调 GitHub API / 推 Git，GitHub 就当作「你本人」在操作（或在你授权范围内操作）。

GitHub 有两类 PAT：

| | Classic PAT | Fine-grained PAT |
|---|---|---|
| 前缀 | `ghp_` | `github_pat_` |
| 授权范围 | 粗粒度 scope（`repo`/`workflow`/`read:org`…），一旦授权可访问你**所有**可访问仓库 | 细粒度：选**指定仓库** + 逐项权限（Contents / Actions secrets / …），读写分别控制 |
| 最长有效期 | 可设「永不过期」（不推荐） | 最长 1 年 |
| 安全性 | 较低（泄露=你全部仓库） | 高（最小权限） |

GitHub 官方推荐**优先用 fine-grained PAT**。我们用的就是它。

> GitHub 还有一堆 `gh` 开头的 token，前缀区分用途：`ghp_`(classic PAT)、`github_pat_`(fine-grained PAT)、`gho_`(OAuth)、`ghs_`(App/GITHUB_TOKEN)、`ghu_`(App user-to-server)、`ghr_`(App refresh)。

## 三、GitHub 是如何实现 PAT 的

### 1. 传输
PAT 通过 HTTP 头携带，最常见两种：
- **API**：`Authorization: Bearer <token>`
- **Git over HTTPS**：把 token 当凭证塞进 URL：`https://x-access-token:<PAT>@github.com/owner/repo.git`（或交给 git credential helper / `gh` CLI）。

### 2. 验证
每次请求，GitHub 大致这么走：
1. 取出 token，按**前缀**判断类型；
2. 查它是否有效（存在、未撤销、未过期）；
3. 映射到**主体**（classic/fine-grained PAT → 用户；`ghs_` → App 安装）；
4. 校验**权限**是否覆盖目标资源（classic 看 scope；fine-grained 看仓库 + 权限矩阵）；
5. 通过则执行，否则 `401`/`403`。

### 3. 存储
PAT **不以明文存储**——和密码一样，GitHub 只存它的**单向哈希**。你在创建页只能看到一次完整 token，关掉就再也看不到，正是因为服务端没有明文可回显。丢了只能重建。

### 4. 权限模型
- **Classic**：基于 scope。比如 `repo` 一开，等于把该用户**所有私有+公开仓库**的读写都给了 token，粒度很粗。
- **Fine-grained**：基于 RBAC。先圈定「这些仓库」，再勾「Contents: read/write」「Actions secrets: read/write」等**逐项权限**。最小权限原则在这里能真正落地。

### 5. `GITHUB_TOKEN` vs PAT（实现层）
- `GITHUB_TOKEN` 是 Actions 运行时**动态签发**的 `ghs_` token，作用域 = 当前仓库，运行结束自动失效；权限由 workflow 的 `permissions:` 声明，但**不含 secrets 管理**，且其产生的事件**不递归触发** workflow。
- PAT 是你**预先签发**、跨运行复用的凭证，能力取决于你授予的 scope/权限。

## 四、实战：本仓库 Strava 同步怎么用 PAT

### 1. 为什么需要 PAT（回顾）
- 用 PAT 推 `activities.json` → 触发 `deploy.yml` 重建站点。
- 用 PAT 调 `gh secret set` → 把轮转后的 Strava refresh_token 写回 `STRAVA_REFRESH_TOKEN`。

### 2. 创建 fine-grained PAT（最小权限）
在 <https://github.com/settings/personal-access-tokens/new> 新建，只给**恰好够用**的权限：
- **Repository access**：仅选 `1yx/1yx.github.io`（不选 All repositories）。
- **权限**：
  - **Contents → Read and write**（推 commit）
  - **Actions secrets → Read and write**（轮转 secret）
  - **Metadata → Read**（自动必选）
- 设有效期（≤ 1 年）。

> 注意：`gh secret set` 还要求**持 token 的账户在该仓库是 admin**。你是 owner，满足。

### 3. 存进仓库 secret
把 token 值粘进 **Settings → Secrets and variables → Actions → Secrets → New repository secret**，命名 `STRAVA_PAT`。workflow 里用 `${{ secrets.STRAVA_PAT }}` 引用，**绝不写进 yml**（仓库公开，写进去 = 立刻泄露）。

### 4. workflow 里怎么用
```yaml
# 先轮转 secret（持久化刚轮转的 Strava token），再 push——顺序见下文「有效期与连锁失效」
- env:
    GH_TOKEN: ${{ secrets.STRAVA_PAT }}
  run: gh secret set STRAVA_REFRESH_TOKEN --body "$NEW_RT"

# 推送：把 PAT 塞进 remote URL
- run: |
    git remote set-url origin "https://x-access-token:${{ secrets.STRAVA_PAT }}@github.com/${GITHUB_REPOSITORY}.git"
    git push
```

### 5. 一个易混点：PAT 自己不轮转
这里「轮转」的是 **Strava 的 refresh_token**（Strava 每次刷新都换新、旧的立即失效，必须写回 secret）。PAT 本身是**固定不变**的长效凭证，直到过期或被你手动撤销。所以别忘了：**fine-grained PAT 最长 1 年会过期**，到期前要重建并更新 `STRAVA_PAT` secret，否则同步会停。

## 五、安全实践清单
1. **永远用 fine-grained + 指定仓库 + 最小权限**。能 `Contents: read` 就别给 `write`。
2. **设有效期、到期前主动续期**；别用「永不过期」。（详见下方「有效期与连锁失效」。）
3. **只放 secret，绝不进代码/日志**。CI 日志里 secret 值会被自动打码（secret masking）。
4. **公开仓库尤其小心**：任何写进仓库的 token 都视为已泄露，需立刻撤销重建。
5. **怀疑泄露立刻 revoke**（设置页一键撤销，立即生效）。
6. **给 workflow 开失败通知**（账号 Settings → Emails 勾选 Actions 失败通知），PAT 过期等问题第一时间暴露。
7. 替代方案：纯读单仓库可用 **deploy key**；高频 / 多仓库自动化可考虑 **GitHub App**（比 PAT 更适合长期运行）。

### 有效期与连锁失效（重要）

> 以本仓库为例：PAT 配的是 9 个月。fine-grained PAT 上限 1 年，9 个月合理；但「有效期」不只是「到期换个 token」——它和 Strava token 轮转**耦合**，忽略会触发连锁失效。

**PAT 过期时发生了什么**：workflow 里用到 PAT 的步骤（`gh secret set`、`git push`）会 `401`/`403` 失败；`GITHUB_TOKEN` 的步骤（checkout/setup）照常。表现是**同步静默停摆**——站点不报错，只是日历不再更新。

**连锁失效的根因（workflow 顺序）**：

```text
① Sync activities   → 刷新 Strava token（T_old → T_new），Strava 立刻作废 T_old
② 轮转 secret        → 用 PAT 把 T_new 写回 STRAVA_REFRESH_TOKEN
③ Commit & push      → 用 PAT
```

若 PAT 已过期而某次同步照常触发：① 成功（`T_old` 已作废，`T_new` 只在 runner 临时文件里）→ ② 失败（PAT 过期）→ workflow 停住 → ③ 没跑 → **secret 里仍是已失效的 `T_old`，而 `T_new` 随 runner 销毁丢失**。等你续好 PAT 再跑，① 会拿 `T_old` 去刷新被拒——**光续 PAT 不够，还得重新走一遍 Strava 授权、换新的 refresh_token 填回 secret**。

**应对（按优先级）**：
1. **到期前主动续期**：约 8 个月时续办 PAT、更新 `STRAVA_PAT` secret（GitHub 设置页能看到 PAT 到期倒计时）。
2. **开失败通知**（清单第 6 条）：PAT 一过期立刻被抓到，不致拖到把 Strava token 带崩。
3. **把轮转步骤前置**（本仓库已做，见 workflow）：让「轮转 secret」排在 push 之前——能挡住 *非 PAT 原因* 的 push 失败（如并发/冲突）把 token 弄丢；但**治不了 PAT 过期本身**（轮转也要 PAT）。
4. **彻底去掉该隐患**：长远换 **GitHub App**（installation token 不会像 PAT 那样到期）。

## 六、小结
PAT 是自动化访问 GitHub 的「钥匙」。当 CI 自带的 `GITHUB_TOKEN` 力所不及——要触发别的 workflow、要管 secret——PAT 补上这块短板。用好它的核心是**最小权限 + fine-grained + 只存 secret**：既打通自动化，又把泄露面压到最小。
