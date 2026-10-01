# AutoDL GPU 抢卡助手

一个用于 AutoDL 实例页面的 Tampermonkey 用户脚本，可自动监控 GPU 资源状态、定时刷新实例列表，并在 GPU 可用后自动提交开机与确认。

> 项目定位：减少重复手动刷新与点击操作。请合理设置刷新频率，并遵守 AutoDL 的使用规则。

## 功能

- 指定实例 ID 进行监控
- 自动识别目标实例
- 每 60 秒点击页面内刷新按钮
- 每 100ms 检查目标实例 GPU 状态
- 检测到 `GPU充足` 后自动点击“开机”
- 自动处理开机确认弹窗
- 抢卡成功后发送系统桌面通知
- 抢卡成功后浏览器标签标题提示
- 支持拖动面板
- 支持收起 / 关闭
- 自动记忆实例 ID
- 自动记忆面板位置
- 红 / 蓝 / 绿状态配色
- 不播放提示音

## 文件结构

```text
autodl-gpu-helper/
├─ autodl-gpu-helper.user.js
├─ README.md
├─ LICENSE
├─ CHANGELOG.md
├─ .gitignore
└─ screenshots/
   └─ .gitkeep
```

## 安装

### 方式一：本地安装

1. 安装 Tampermonkey。
2. 打开 Tampermonkey 管理面板。
3. 新建脚本。
4. 删除默认内容。
5. 将 `autodl-gpu-helper.user.js` 的全部内容复制进去。
6. 保存。
7. 打开 AutoDL 页面。

### 方式二：GitHub Raw 安装

把本项目上传到 GitHub 后，打开：

```text
https://raw.githubusercontent.com/你的用户名/autodl-gpu-helper/main/autodl-gpu-helper.user.js
```

Tampermonkey 通常会识别 `.user.js` 文件并进入安装流程。

如果准备长期公开发布，建议后续在脚本头部补充：

```javascript
// @homepageURL  https://github.com/你的用户名/autodl-gpu-helper
// @supportURL   https://github.com/你的用户名/autodl-gpu-helper/issues
// @downloadURL  https://raw.githubusercontent.com/你的用户名/autodl-gpu-helper/main/autodl-gpu-helper.user.js
// @updateURL    https://raw.githubusercontent.com/你的用户名/autodl-gpu-helper/main/autodl-gpu-helper.user.js
```

## 使用

1. 打开 AutoDL 实例列表页面。
2. 找到需要监控的实例 ID。
3. 将实例 ID 输入脚本面板。
4. 点击“开始监控”。
5. 第一次使用桌面通知时，浏览器可能请求通知权限，请选择“允许”。
6. 脚本开始监控目标实例。
7. 检测到 GPU 可用后，会自动执行开机及确认操作。
8. 成功后：
   - 面板显示“抢卡成功”
   - 系统弹出桌面通知
   - 浏览器标签显示 `【抢卡成功】`

## 默认参数

| 参数 | 默认值 | 说明 |
| --- | ---: | --- |
| `REFRESH_INTERVAL` | 60000 ms | 页面内刷新间隔，默认 60 秒 |
| `CHECK_INTERVAL` | 100 ms | 页面状态检测间隔 |
| `CONFIRM_INTERVAL` | 30 ms | 开机确认按钮检测间隔 |
| `ENABLE_DESKTOP_NOTIFICATION` | `true` | 是否启用桌面通知 |
| `ENABLE_TITLE_FLASH` | `true` | 是否启用标签标题提示 |

这些参数位于 `autodl-gpu-helper.user.js` 文件顶部。

## 桌面通知

脚本不会播放提示音。

成功后使用浏览器原生 Notification API 发送系统通知。如果没有弹出通知，请检查：

- AutoDL 网站通知权限是否为“允许”
- 浏览器系统通知是否开启
- Windows / macOS 是否允许浏览器发送通知
- 勿扰模式 / 专注模式是否阻止通知

## 当前页面依赖

脚本目前依赖 AutoDL 页面中的部分 DOM 结构和文字，包括：

```text
tr.el-table__row
button.refresh-btn
开机
GPU充足
.el-message-box__btns button
确定
```

如果 AutoDL 修改页面结构或文案，脚本可能需要同步更新。

## 版本管理

建议采用语义化版本：

```text
1.0.0  首次公开版本
1.0.1  Bug 修复
1.1.0  新增兼容功能
2.0.0  存在不兼容变更
```

每次发布新版本时，同时修改用户脚本头部：

```javascript
// @version      1.0.1
```

## 发布到 GitHub

创建一个公开仓库，例如：

```text
autodl-gpu-helper
```

然后上传本目录中的所有文件。

推荐仓库简介：

> AutoDL GPU 抢卡助手：Tampermonkey 自动监控 GPU 资源、刷新实例列表、自动开机确认，并提供桌面通知。

建议添加 Topics：

```text
autodl
tampermonkey
userscript
gpu
javascript
automation
```

## Greasy Fork

如果希望普通用户更容易安装，可以同时发布到 Greasy Fork。

GitHub 负责：

- 源码
- Issues
- PR
- 版本管理

Greasy Fork 负责：

- 用户发现
- 一键安装
- 自动更新

## 安全与隐私

脚本：

- 不包含外部统计代码
- 不上传实例 ID
- 不调用第三方 API
- 实例 ID 与面板位置仅保存在浏览器 `localStorage`
- 桌面通知由浏览器原生 Notification API 提供

## 免责声明

本项目是第三方开源工具，与 AutoDL 官方无隶属或授权关系。

页面结构、资源策略、平台规则发生变化时，脚本可能失效。使用者应自行确认其使用方式符合 AutoDL 当前服务条款、资源使用规则及相关要求。因使用本项目产生的账号、任务、资源或其他影响，由使用者自行承担。

## License

MIT License
