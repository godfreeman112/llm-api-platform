const express = require('express');
const axios = require('axios');
const { authenticateToken } = require('../middleware/auth');
const { get, query, run } = require('../database');

const router = express.Router();

// 发送消息
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { model: modelId, message, history = [] } = req.body;

    if (!modelId || !message) {
      return res.status(400).json({ message: '模型ID和消息内容不能为空' });
    }

    // 获取模型信息
    const model = await get('SELECT * FROM models WHERE id = ? AND status = ?', [modelId, 'active']);
    
    if (!model) {
      return res.status(404).json({ message: '模型不存在或已禁用' });
    }

    // 检查用户配额
    const user = await get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    
    if (user.quota > 0 && user.used_quota >= user.quota) {
      return res.status(403).json({ message: '您的配额已用完，请联系管理员' });
    }

    // 构建请求历史
    const messages = history.map(h => ({
      role: h.role,
      content: h.content
    }));
    
    messages.push({ role: 'user', content: message });

    // 调用大模型API
    const startTime = Date.now();
    let responseData;
    
    try {
      const apiResponse = await axios.post(
        model.api_endpoint,
        {
          model: model.name,
          messages: messages,
          temperature: model.temperature,
          max_tokens: model.max_tokens
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${model.api_key}`
          },
          timeout: 60000
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
          JSON.stringify({ message }),
          JSON.stringify(apiError.response?.data || { message: apiError.message }),
          apiError.response?.data?.error?.message || apiError.message
        ]
      );

      return res.status(502).json({ 
        message: '调用模型API失败',
        error: apiError.response?.data?.error?.message || apiError.message
      });
    }

    // 提取响应内容
    const assistantMessage = responseData.choices?.[0]?.message?.content || '';
    const promptTokens = responseData.usage?.prompt_tokens || 0;
    const completionTokens = responseData.usage?.completion_tokens || 0;
    const totalTokens = responseData.usage?.total_tokens || 0;

    // 计算费用（简化计算，实际应根据不同模型的定价）
    const cost = (totalTokens / 1000) * 0.01; // 假设每1000 token 0.01元

    // 更新用户已使用配额
    if (user.quota > 0) {
      await run('UPDATE users SET used_quota = used_quota + ? WHERE id = ?', [totalTokens, req.user.id]);
    }

    // 记录使用日志
    await run(
      `INSERT INTO usage_logs (user_id, model_id, prompt_tokens, completion_tokens, total_tokens, cost, request_data, response_data, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'success')`,
      [
        req.user.id,
        modelId,
        promptTokens,
        completionTokens,
        totalTokens,
        cost,
        JSON.stringify({ message }),
        JSON.stringify(responseData)
      ]
    );

    // 保存或更新对话历史
    const chatHistory = [...history, { role: 'user', content: message }, { role: 'assistant', content: assistantMessage }];
    
    // 这里简化处理，实际应该有更复杂的会话管理逻辑
    const title = message.substring(0, 50);
    await run(
      `INSERT INTO chat_history (user_id, model_id, title, messages) VALUES (?, ?, ?, ?)`,
      [req.user.id, modelId, title, JSON.stringify(chatHistory)]
    );

    res.json({
      content: assistantMessage,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens,
        cost
      }
    });

  } catch (error) {
    console.error('发送消息错误:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

// 获取对话历史
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const histories = await query(
      `SELECT ch.*, m.name as model_name 
       FROM chat_history ch 
       LEFT JOIN models m ON ch.model_id = m.id 
       WHERE ch.user_id = ? 
       ORDER BY ch.updated_at DESC 
       LIMIT 50`,
      [req.user.id]
    );

    res.json(histories.map(h => ({
      id: h.id,
      title: h.title,
      modelName: h.model_name,
      updatedAt: h.updated_at
    })));
  } catch (error) {
    console.error('获取历史错误:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

// 清空对话历史
router.delete('/history', authenticateToken, async (req, res) => {
  try {
    await run('DELETE FROM chat_history WHERE user_id = ?', [req.user.id]);
    res.json({ message: '历史已清空' });
  } catch (error) {
    console.error('清空历史错误:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

module.exports = router;
