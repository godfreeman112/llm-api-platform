const express = require('express');
const axios = require('axios');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { query, get, run } = require('../database');

const router = express.Router();

// 获取模型列表（所有用户）
router.get('/', authenticateToken, async (req, res) => {
  try {
    const models = await query(
      'SELECT id, name, provider, model_type as modelType, api_endpoint as apiEndpoint, temperature, max_tokens as maxTokens, image_size as imageSize, output_format as outputFormat, response_format as responseFormat, description, status, created_at as createdAt FROM models ORDER BY created_at DESC'
    );

    res.json(models);
  } catch (error) {
    console.error('获取模型列表错误:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

// 创建模型（仅管理员）
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, provider, modelType, apiEndpoint, apiKey, temperature, maxTokens, imageSize, outputFormat, responseFormat, description, status } = req.body;

    if (!name || !provider || !apiEndpoint || !apiKey) {
      return res.status(400).json({ message: '名称、提供商、API端点和API密钥不能为空' });
    }

    const result = await run(
      `INSERT INTO models (name, provider, model_type, api_endpoint, api_key, temperature, max_tokens, image_size, output_format, response_format, description, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, provider, modelType || 'chat', apiEndpoint, apiKey, 
       temperature || 0.7, maxTokens || 4096, imageSize || '1024x1024', 
       outputFormat || 'png', responseFormat || 'url',
       description, status || 'active']
    );

    res.status(201).json({
      id: result.lastID,
      message: '模型创建成功'
    });
  } catch (error) {
    console.error('创建模型错误:', error);
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ message: '模型名称已存在' });
    }
    res.status(500).json({ message: '服务器内部错误' });
  }
});

// 更新模型（仅管理员）
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, provider, modelType, apiEndpoint, apiKey, temperature, maxTokens, imageSize, outputFormat, responseFormat, description, status } = req.body;

    // 检查模型是否存在
    const model = await get('SELECT * FROM models WHERE id = ?', [id]);
    
    if (!model) {
      return res.status(404).json({ message: '模型不存在' });
    }

    await run(
      `UPDATE models 
       SET name = ?, provider = ?, model_type = ?, api_endpoint = ?, api_key = ?, temperature = ?, max_tokens = ?, image_size = ?, output_format = ?, response_format = ?, description = ?, status = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [
        name || model.name,
        provider || model.provider,
        modelType || model.model_type,
        apiEndpoint || model.api_endpoint,
        apiKey || model.api_key,
        temperature !== undefined ? temperature : model.temperature,
        maxTokens || model.max_tokens,
        imageSize || model.image_size,
        outputFormat || model.output_format,
        responseFormat || model.response_format,
        description !== undefined ? description : model.description,
        status || model.status,
        id
      ]
    );

    res.json({ message: '模型更新成功' });
  } catch (error) {
    console.error('更新模型错误:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

// 删除模型（仅管理员）
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // 检查模型是否存在
    const model = await get('SELECT * FROM models WHERE id = ?', [id]);
    
    if (!model) {
      return res.status(404).json({ message: '模型不存在' });
    }

    await run('DELETE FROM models WHERE id = ?', [id]);

    res.json({ message: '模型删除成功' });
  } catch (error) {
    console.error('删除模型错误:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

// 测试模型连接
router.post('/:id/test', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const model = await get('SELECT * FROM models WHERE id = ?', [id]);
    
    if (!model) {
      return res.status(404).json({ message: '模型不存在' });
    }

    // 根据模型类型发送不同的测试请求
    let requestBody;
    if (model.model_type === 'image') {
      // 图像生成模型测试
      requestBody = {
        model: model.name,
        prompt: '一只可爱的小猫'
      };
    } else {
      // 对话模型测试
      requestBody = {
        model: model.name,
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 5
      };
    }

    // 发送测试请求
    const response = await axios.post(
      model.api_endpoint,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${model.api_key}`
        },
        timeout: model.model_type === 'image' ? 30000 : 10000 // 图像生成需要更长时间
      }
    );

    res.json({
      message: '连接测试成功',
      response: response.data
    });
  } catch (error) {
    console.error('测试连接错误:', error.response?.data || error.message);
    res.status(500).json({
      message: '连接测试失败',
      error: error.response?.data?.error?.message || error.message
    });
  }
});

module.exports = router;
