# Seedance 2.0 视频生成模型配置指南

## 概述

本平台现已支持火山引擎的 **Seedance 2.0** 视频生成大模型。Seedance 2.0 是一款生产级的多模态视频生成模型，支持文字、图片、音频、视频四种模态输入，能够实现：

- ✅ 高度一致的角色保持
- ✅ 导演级相机控制
- ✅ 真实物理模拟
- ✅ 原生声画同步生成

## 前置条件

1. **企业账号认证**
   - 需要完成火山引擎的企业实名认证
   - 准备营业执照等资质文件

2. **API密钥申请**
   - 登录 [火山引擎官网](https://www.volcengine.com/)
   - 访问火山方舟控制台
   - 找到 Seedance 2.0 API 申请页面
   - 填写使用场景和预计调用量
   - 提交申请，等待审核（3-5个工作日）

3. **获取API密钥**
   - 审核通过后，在控制台生成 API Key
   - 记录 API Endpoint 地址

## 在平台中添加 Seedance 2.0 模型

### 步骤1：进入模型管理页面

1. 使用管理员账号登录平台
2. 点击左侧菜单的"模型管理"
3. 点击右上角的"添加模型"按钮

### 步骤2：填写模型信息

#### 基本信息
- **模型名称**: `seedance-2.0-pro` (或您自定义的名称)
- **模型类型**: 选择 **视频生成模型** ⭐

#### API配置
- **API端点**: 
  ```
  https://ark.cn-beijing.volces.com/api/v3/videos/generations
  ```
  或根据您的区域选择对应的endpoint

- **API密钥**: 粘贴从火山引擎控制台获取的 API Key

#### 视频参数配置

- **视频时长**: 选择默认时长
  - 5秒 (推荐用于测试)
  - 10秒
  - 15秒

- **视频分辨率**: 选择输出质量
  - 720p (快速生成)
  - 1080p (高清质量，推荐)

- **输出格式**: 
  - MP4 (通用格式，推荐)
  - WEBM

#### 描述信息
```
火山引擎 Seedance 2.0 视频生成模型
支持文生视频、图生视频、多模态混合参考
适用于短剧制作、电商营销视频、特效模板等专业场景
```

### 步骤3：保存并测试

1. 点击"确定"保存模型配置
2. 在模型列表中找到刚添加的模型
3. 点击"测试"按钮验证连接
4. 确保状态为"active"（已启用）

## API调用示例

### Python 示例

```python
import requests

def generate_video(api_key, prompt, duration="5s", resolution="1080p"):
    url = "https://ark.cn-beijing.volces.com/api/v3/videos/generations"
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
    
    payload = {
        "model": "seedance-2.0-pro",
        "prompt": prompt,
        "duration": duration,
        "resolution": resolution
    }
    
    response = requests.post(url, json=payload, headers=headers)
    return response.json()

# 使用示例
result = generate_video(
    api_key="your-api-key",
    prompt="一只可爱的小猫在草地上玩耍",
    duration="5s",
    resolution="1080p"
)

print(result)
```

### cURL 示例

```bash
curl -X POST "https://ark.cn-beijing.volces.com/api/v3/videos/generations" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "seedance-2.0-pro",
    "prompt": "一只可爱的小猫在草地上玩耍",
    "duration": "5s",
    "resolution": "1080p"
  }'
```

## 定价说明

根据火山引擎官方定价：

- **含视频输入**: 约 28元/百万Tokens
- **不含视频输入**: 约 46元/百万Tokens
- **生成成本**: 一条15秒视频约 15元 (折合 1元/秒)

> 💡 提示：实际费用会根据具体使用情况而定，建议在火山引擎控制台查看最新定价。

## 使用建议

### 提示词优化

1. **详细描述场景**
   - ✅ 好： "一个穿着红色连衣裙的女孩在海边漫步，夕阳西下，海浪轻拍沙滩"
   - ❌ 差： "女孩在海边"

2. **指定镜头运动**
   - 添加："镜头缓慢推进"、"俯视视角"、"环绕拍摄"

3. **描述光影效果**
   - 添加："柔和的自然光"、"逆光剪影"、"温暖的金色调"

### 性能优化

1. **测试阶段**
   - 使用 5秒 + 720p 组合快速验证效果
   - 确认提示词质量后再使用高分辨率

2. **生产环境**
   - 根据实际需求选择合适的时长和分辨率
   - 考虑批量生成时的成本控制

3. **错误处理**
   - 视频生成可能需要较长时间（30-60秒）
   - 实现异步任务队列处理长时间任务
   - 添加重试机制应对网络波动

## 常见问题

### Q1: 测试连接失败怎么办？

**A:** 检查以下几点：
1. API密钥是否正确
2. API端点地址是否准确
3. 网络连接是否正常
4. 企业账号是否已通过审核

### Q2: 视频生成时间过长？

**A:** 
- 视频生成是计算密集型任务，通常需要 30-60秒
- 可以在平台中设置更长的超时时间
- 考虑使用异步任务处理

### Q3: 如何提升视频质量？

**A:**
1. 使用更详细的提示词
2. 提供高质量的参考图片
3. 选择 1080p 分辨率
4. 参考官方提示词指南优化描述

### Q4: 支持哪些输入模态？

**A:** Seedance 2.0 支持：
- 纯文本生成视频
- 图片生成视频
- 音频+文本生成视频
- 视频+文本生成视频（视频续写/编辑）

## 技术支持

- **官方文档**: [火山方舟 Seedance 2.0 教程](https://www.volcengine.com/docs/82379/2291680)
- **提示词指南**: [Seedance 2.0 提示词最佳实践](https://www.volcengine.com/docs/82379/2222480)
- **API参考**: [火山方舟 API 文档](https://www.volcengine.com/docs/82379/1330626)

## 更新日志

- **2026-04-09**: 平台新增视频生成模型支持，集成 Seedance 2.0
  - 添加视频模型类型选项
  - 支持视频时长、分辨率、格式配置
  - 优化测试接口，支持视频模型连接测试

---

**祝您使用愉快！** 🎬
