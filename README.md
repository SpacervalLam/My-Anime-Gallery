# My Anime Gallery

![Banner](public/images/banner.jpg)

中文 | [English](README.en.md)

## 1. 项目概述

My Anime Gallery 是一款功能完备的动漫收藏管理桌面应用，采用现代化技术栈开发，提供精美的3D翻页效果和丰富的动漫资源管理功能。应用支持EPUB阅读、图片裁剪编辑、智能搜索以及AI辅助功能，帮助用户高效管理和欣赏动漫收藏。

## 2. 核心功能

### 2.1 动漫收藏管理
- 完整的动漫条目创建、编辑、删除功能
- 支持多字段信息管理（标题、别名、描述、标签等）
- 本地SQLite数据库存储，确保数据安全
- 支持数据导入/导出，方便数据迁移和备份

### 2.2 媒体浏览与阅读
- 3D翻页书效果展示，提供沉浸式浏览体验
- 内置EPUB阅读器，支持漫画/小说阅读
- 图片裁剪与封面编辑功能
- 支持多种图片格式导入

### 2.3 智能搜索与分类
- 强大的搜索功能，支持按标题、标签等多维度搜索
- 条目列表与详情页无缝切换
- 支持自定义标签管理

### 2.4 AI辅助功能
- 自动生成动漫描述文案
- 智能推荐相似动漫作品
- AI对话交互，提供动漫相关信息查询
- 可配置的AI API密钥管理

### 2.5 用户体验优化
- 深色/浅色主题切换
- 响应式设计，适配不同屏幕尺寸
- 直观的图形化用户界面
- 支持多语言（中文、英文、日文）

## 3. 技术架构

### 3.1 前端技术栈
- **框架**: Vue 3 + Composition API
- **构建工具**: Vite
- **样式**: Tailwind CSS
- **国际化**: Vue I18n
- **3D效果**: PageFlip.js
- **EPUB阅读**: EPUB.js

### 3.2 后端技术栈
- **运行时**: Node.js
- **桌面框架**: Electron 25
- **数据库**: SQLite + TypeORM
- **AI服务**: 集成第三方AI API

### 3.3 项目结构
```
├── database/          # 数据库相关文件
│   └── entity/        # 数据实体定义
├── docs/              # 文档资源
├── public/            # 静态资源
├── src/               # 源代码
│   ├── assets/        # 样式和字体资源
│   ├── components/    # Vue组件
│   ├── locales/       # 多语言配置
│   ├── services/      # 服务层
│   ├── App.vue        # 根组件
│   └── main.js        # 入口文件
├── electron.main.js   # Electron主进程
├── package.json       # 项目配置
└── vite.config.js     # Vite配置
```

## 4. 安装指南

### 4.1 开发环境要求
- Node.js >= 16.x
- npm >= 8.x
- Git

### 4.2 开发模式安装

```bash
# 克隆仓库
git clone https://github.com/SpacervalLam/My-Anime-Gallery.git

# 进入项目目录
cd My-Anime-Gallery

# 安装依赖
npm install

# 启动开发模式
npm run serve
```

### 4.3 生产构建

```bash
# 构建应用
npm run build

# 生成安装包
npm run dist
```

构建完成后，安装包将生成在 `dist` 目录下。

## 5. 使用说明

### 5.1 基本操作

1. **应用启动**: 运行安装包或开发模式启动后，应用将显示封面页面
2. **菜单访问**: 点击右上角菜单按钮或悬停在屏幕上方可呼出菜单栏
3. **翻页操作**: 使用页面两侧的导航按钮进行翻页
4. **条目管理**: 
   - 在条目列表页点击"添加"按钮创建新条目
   - 点击现有条目查看详情
   - 在详情页点击"编辑"按钮修改条目信息

### 5.2 高级功能

1. **数据导入/导出**:
   - 在菜单栏选择"导出数据"可导出当前收藏
   - 选择"导入数据"可从外部文件导入收藏
   - 支持选择性导出条目及媒体资源

2. **AI功能配置**:
   - 在菜单栏选择"AI配置"打开AI设置面板
   - 输入有效的AI API密钥
   - 根据需要调整AI功能参数

3. **主题切换**:
   - 在设置面板中可切换深色/浅色主题
   - 支持自动跟随系统主题

## 6. 贡献指南

### 6.1 开发流程

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

### 6.2 代码规范

- 遵循 Vue 3 最佳实践
- 使用 ESLint 进行代码检查
- 保持代码风格一致
- 为新增功能编写测试用例

### 6.3 提交规范

- 使用语义化提交信息
- 提交信息格式: `type(scope): description`
  - type: feat, fix, docs, style, refactor, test, chore
  - scope: 可选，指定修改范围
  - description: 清晰描述修改内容

## 7. 许可证

本项目采用 MIT 许可证。详情请查看 [LICENSE](LICENSE) 文件。

## 8. 联系方式

- 项目地址: [https://github.com/SpacervalLam/My-Anime-Gallery](https://github.com/SpacervalLam/My-Anime-Gallery)
- 问题反馈: [GitHub Issues](https://github.com/SpacervalLam/My-Anime-Gallery/issues)

## 9. 更新日志

详细更新记录请查看 [CHANGELOG.md](CHANGELOG.md) 文件。

---

© 2025 SpacervalLam. All rights reserved.
