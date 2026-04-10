const express = require('express');
const axios = require('axios');
const { authenticateToken } = require('../middleware/auth');
const { get, query, run } = require('../database');

const router = express.Router();

// 生成图像
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const { model: modelId, prompt, image = null } = req.body;

    if (!modelId || !prompt) {
      return res.status(400).json({ message: '模型ID和提示词不能为空' });
    }

    // 获取模型信息
    const model = await get('SELECT * FROM models WHERE id = ? AND status = ?', [modelId, 'active']);
    
    if (!model) {
      return res.status(404).json({ message: '模型不存在或已禁用' });
    }

    // 检查模型类型
    if (model.model_type !== 'image') {
      return res.status(400).json({ message: '该模型不支持图像生成' });
    }

    // 检查用户配额
    const user = await get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    
    if (user.quota > 0 && user.used_quota >= user.quota) {
      return res.status(403).json({ message: '您的配额已用完，请联系管理员' });
    }

    // 构建请求参数（火山引擎即梦API格式）
    const requestBody = {
      model: model.name,
      prompt: prompt
    };

    // 如果有参考图片，添加到请求中
    if (image) {
      requestBody.image = image;
    }

    // 添加可选参数（即梦 API 不支持 output_format）
    if (model.response_format) {
      requestBody.response_format = model.response_format;
    }
    if (model.image_size) {
      requestBody.size = model.image_size;
    }

    // 调用火山引擎API
    const startTime = Date.now();
    let responseData;
    
    try {
      const apiResponse = await axios.post(
        model.api_endpoint,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${model.api_key}`
          },
          timeout: 120000 // 图像生成通常需要更长时间
        }
      );

      responseData = apiResponse.data;
    } catch (apiError) {
      console.error('API调用失败:', apiError.response?.data || apiError.message);
      
      // 记录失败的日志
      await run(
        `INSERT INTO usage_logs (user_id, model_id, prompt_tokens, completion_tokens, total_tokens, cost, request_data, response_data, status, error_message) 
         VALUES (?, ?, 0, 0, 0, 0, ?, ?, 'failed', ?)`,
        [
          req.user.id,
          modelId,
          JSON.stringify({ prompt, image: image ? '[BASE64_OR_URL]' : null }),
          JSON.stringify(apiError.response?.data || { message: apiError.message }),
          apiError.response?.data?.error?.message || apiError.message
        ]
      );

      return res.status(502).json({ 
        message: '调用图像生成API失败',
        error: apiError.response?.data?.error?.message || apiError.message
      });
    }

    // 提取响应中的图像URL或Base64
    let imageUrl = null;
    let imageData = null;

    if (responseData.data && responseData.data.length > 0) {
      const imageDataItem = responseData.data[0];
      
      if (model.response_format === 'url' || imageDataItem.url) {
        imageUrl = imageDataItem.url;
        
        // 如果是火山引擎，临时URL可能无法直接访问，尝试代理下载为base64
        try {
          const imageResponse = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 30000
          });
          
          if (imageResponse.data && imageResponse.status === 200) {
            const base64 = Buffer.from(imageResponse.data, 'binary').toString('base64');
            const contentType = imageResponse.headers['content-type'] || 'image/png';
            imageUrl = `data:${contentType};base64,${base64}`;
            imageData = base64;
          }
        } catch (proxyError) {
          console.warn('代理下载图片失败，使用原始URL:', proxyError.message);
          // 保持原始URL，让前端尝试加载
        }
      }
      
      if (model.response_format === 'b64_json' || imageDataItem.b64_json) {
        imageData = imageDataItem.b64_json;
        // 如果是base64格式，构建data URI
        if (!imageUrl && imageData) {
          imageUrl = `data:image/png;base64,${imageData}`;
        }
      }
    }

    if (!imageUrl) {
      return res.status(500).json({ message: '未能从API响应中提取图像数据' });
    }

    // 计算费用（简化计算，图像生成按次数计费）
    const cost = 0.10; // 假设每次图像生成0.10元
    const tokens = 1000; // 图像生成使用固定token计数

    // 更新用户已使用配额
    if (user.quota > 0) {
      await run('UPDATE users SET used_quota = used_quota + ? WHERE id = ?', [tokens, req.user.id]);
    }

    // 记录使用日志
    await run(
      `INSERT INTO usage_logs (user_id, model_id, prompt_tokens, completion_tokens, total_tokens, cost, request_data, response_data, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'success')`,
      [
        req.user.id,
        modelId,
        0,
        0,
        tokens,
        cost,
        JSON.stringify({ prompt, image: image ? '[BASE64_OR_URL]' : null }),
        JSON.stringify(responseData)
      ]
    );

    res.json({
      imageUrl: imageUrl,
      imageData: imageData,
      cost: cost,
      usage: {
        cost,
        tokens
      }
    });

  } catch (error) {
    console.error('生成图像错误:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

module.exports = router;
