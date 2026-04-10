# 更新日志

## [1.1.0] - 2026-04-09

### ✨ 新增功能

#### 视频生成模型支持
- 🎬 新增【视频生成】模型类型选项
- 🎥 集成火山引擎 Seedance 2.0 视频生成大模型
- ⚙️ 支持视频参数配置：
  - 视频时长：5秒 / 10秒 / 15秒
  - 视频分辨率：720p / 1080p
  - 输出格式：MP4 / WEBM
- 🔧 优化模型测试接口，支持视频模型连接测试（60秒超时）

#### 文档与工具
- 📖 新增 `SEEDANCE_SETUP.md` - Seedance 2.0 详细配置指南
- 🧪 新增 `test-seedance.js` - 自动化测试脚本
- 📝 更新 `README.md` - 添加视频生成功能说明

### 🔧 技术改进

#### 前端 (Models.vue)
- 添加"视频生成模型"单选选项
- 新增视频专用表单字段：
  - `videoDuration` - 视频时长选择器
  - `videoResolution` - 视频分辨率选择器
  - `outputFormat` - 视频输出格式（复用图像模型的字段）
- 完善表单数据初始化和重置逻辑

#### 后端 (models.js)
- 扩展数据库查询，包含视频相关字段
- 更新模型创建接口，支持视频参数
- 更新模型编辑接口，支持视频参数修改
- 增强模型测试接口：
  - 添加视频模型测试逻辑
  - 设置合理的超时时间（60秒）
  - 构建符合视频API的请求体

#### 数据库 (database.js)
- 已预先支持视频模型类型 (`model_type IN ('chat', 'image', 'video')`)
- 已包含视频相关字段：
  - `video_duration` - 视频时长
  - `video_resolution` - 视频分辨率

### 📋 API变更

#### 模型管理 API
- `GET /api/models` - 返回数据新增 `videoDuration` 和 `videoResolution` 字段
- `POST /api/models` - 请求体新增可选参数：
  ```json
  {
    "modelType": "video",
    "videoDuration": "5s",
    "videoResolution": "1080p",
    "outputFormat": "mp4"
  }
  ```
- `PUT /api/models/:id` - 支持更新视频相关参数
- `POST /api/models/:id/test` - 支持视频模型连接测试

### 🐛 问题修复
- 修复模型列表查询缺少视频字段的问题
- 修复模型更新时视频参数无法保存的问题

### 📚 文档更新
- README.md: 添加视频生成功能介绍和快速开始指南
- SEEDANCE_SETUP.md: 完整的Seedance 2.0配置教程
  - API密钥申请流程
  - 模型配置步骤
  - Python/cURL调用示例
  - 定价说明
  - 使用建议和最佳实践
  - 常见问题解答

### 🔜 未来计划
- [ ] 实现视频生成任务的异步处理
- [ ] 添加视频生成历史记录和预览
- [ ] 支持更多视频生成模型（如 Runway、Pika等）
- [ ] 视频生成进度实时显示
- [ ] 批量视频生成功能

---

## [1.0.0] - 2026-04-01

### 初始版本
- ✅ 用户管理系统
- ✅ 多模型支持（对话模型）
- ✅ 图像生成模型支持
- ✅ API使用监控
- ✅ 配额管理
- ✅ 对话测试界面
- ✅ 使用统计图表
