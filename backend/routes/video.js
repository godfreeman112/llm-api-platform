const express = require('express');
const axios = require('axios');
const { authenticateToken } = require('../middleware/auth');
const { get, run } = require('../database');

const router = express.Router();

// Seedance 2.0 视频生成 API 端点
const SEEDANCE_API_BASE = 'https://ark.cn-beijing.volces.com/api/v3';

// 提交视频生成任务
router.post('/submit-task', authenticateToken, async (req, res) => {
  try {
    const { model: modelId, prompt, images = [], videos = [], audios = [], duration = '5s', resolution = '1080p' } = req.body;

    if (!modelId || !prompt) {
      return res.status(400).json({ message: '模型ID和提示词不能为空' });
    }

    // 验证文件数量限制
    if (images.length > 9) {
      return res.status(400).json({ message: '参考图片最多9张' });
    }
    if (videos.length > 3) {
      return res.status(400).json({ message: '参考视频最多3段' });
    }
    if (audios.length > 3) {
      return res.status(400).json({ message: '参考音频最多3段' });
    }

    // 获取模型信息
    const model = await get('SELECT * FROM models WHERE id = ? AND status = ?', [modelId, 'active']);
    
    if (!model) {
      return res.status(404).json({ message: '模型不存在或已禁用' });
    }

    // 检查模型类型
    if (model.model_type !== 'video') {
      return res.status(400).json({ message: '该模型不支持视频生成' });
    }

    // 检查用户配额
    const user = await get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    
    if (user.quota > 0 && user.used_quota >= user.quota) {
      return res.status(403).json({ message: '您的配额已用完，请联系管理员' });
    }

    // 构建请求参数 - Seedance 2.0 多模态格式
    const requestBody = {
      model: model.name,
      content: [
        {
          type: 'text',
          text: prompt
        }
      ]
    };

    // 添加参考图片（最多9张）
    if (images && images.length > 0) {
      images.forEach((imageBase64, index) => {
        requestBody.content.push({
          type: 'image_url',
          image_url: { url: imageBase64 }
        });
      });
      console.log(`添加了 ${images.length} 张参考图片`);
    }

    // 添加参考视频（最多3段）
    if (videos && videos.length > 0) {
      videos.forEach((videoBase64, index) => {
        requestBody.content.push({
          type: 'video_url',
          video_url: { url: videoBase64 }
        });
      });
      console.log(`添加了 ${videos.length} 段参考视频`);
    }

    // 添加参考音频（最多3段）
    if (audios && audios.length > 0) {
      audios.forEach((audioBase64, index) => {
        requestBody.content.push({
          type: 'audio_url',
          audio_url: { url: audioBase64 }
        });
      });
      console.log(`添加了 ${audios.length} 段参考音频`);
    }

    // 添加视频参数
    requestBody.video_params = {
      duration: duration,
      resolution: resolution
    };

    console.log('提交视频生成任务:', requestBody);

    // 调用 Seedance 2.0 API 提交任务
    // model.api_endpoint 应该已经是完整的API端点URL
    const apiUrl = model.api_endpoint.endsWith('/tasks') 
      ? model.api_endpoint 
      : `${model.api_endpoint}/contents/generations/tasks`;
    
    console.log('API URL:', apiUrl);
    
    const response = await axios.post(
      apiUrl,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${model.api_key}`
        },
        timeout: 60000, // 增加超时时间到60秒
        maxRedirects: 5,
        validateStatus: function (status) {
          return status < 500;
        }
      }
    );

    const taskId = response.data.id;

    // 记录任务提交日志
    await run(
      `INSERT INTO usage_logs (user_id, model_id, prompt_tokens, completion_tokens, total_tokens, cost, request_data, response_data, status) 
       VALUES (?, ?, 0, 0, 0, 0, ?, ?, 'processing')`,
      [
        req.user.id,
        modelId,
        JSON.stringify({ 
          prompt, 
          images: images.length > 0 ? `[${images.length}张图片]` : null,
          videos: videos.length > 0 ? `[${videos.length}段视频]` : null,
          audios: audios.length > 0 ? `[${audios.length}段音频]` : null,
          duration, 
          resolution 
        }),
        JSON.stringify({ taskId, status: 'submitted' })
      ]
    );

    res.json({
      taskId: taskId,
      message: '任务已提交',
      status: 'processing'
    });

  } catch (error) {
    console.error('提交视频任务错误:', error.response?.data || error.message);
    
    // 区分不同类型的错误
    let errorMessage = '提交视频生成任务失败';
    let errorCode = 'UNKNOWN_ERROR';
    
    if (error.code === 'ECONNRESET' || error.message.includes('socket disconnected')) {
      errorMessage = '网络连接中断，请检查网络连接或稍后重试';
      errorCode = 'NETWORK_ERROR';
    } else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      errorMessage = '请求超时，请稍后重试';
      errorCode = 'TIMEOUT_ERROR';
    } else if (error.response) {
      errorMessage = error.response.data?.error?.message || `API返回错误: ${error.response.status}`;
      errorCode = 'API_ERROR';
    } else if (error.request) {
      errorMessage = '无法连接到API服务器，请检查网络';
      errorCode = 'CONNECTION_ERROR';
    }
    
    res.status(500).json({ 
      message: errorMessage,
      error: error.response?.data?.error?.message || error.message,
      code: errorCode
    });
  }
});

// 查询视频生成任务状态
router.get('/task-status/:taskId', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params;

    // 从数据库获取模型信息（需要知道是哪个模型的任务）
    const log = await get(
      'SELECT ul.*, m.api_endpoint, m.api_key, m.name as model_name ' +
      'FROM usage_logs ul ' +
      'JOIN models m ON ul.model_id = m.id ' +
      'WHERE ul.response_data LIKE ? ' +
      'ORDER BY ul.created_at DESC LIMIT 1',
      [`%"${taskId}"%`]
    );

    if (!log) {
      return res.status(404).json({ message: '任务不存在' });
    }

    // 调用 Seedance 2.0 API 查询任务状态
    // 正确的查询URL格式：{base_url}/contents/generations/tasks/{taskId}
    let queryUrl;
    if (log.api_endpoint.includes('/contents/generations/tasks')) {
      // 如果api_endpoint已经包含完整路径，直接在末尾追加taskId
      // 例如：https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks
      // 变为：https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks/{taskId}
      queryUrl = `${log.api_endpoint}/${taskId}`;
    } else {
      // 否则拼接标准路径
      queryUrl = `${log.api_endpoint}/contents/generations/tasks/${taskId}`;
    }
    
    console.log('查询任务状态 URL:', queryUrl);
    
    const response = await axios.get(
      queryUrl,
      {
        headers: {
          'Authorization': `Bearer ${log.api_key}`
        },
        timeout: 60000, // 增加超时时间到60秒
        // 添加重试配置
        maxRedirects: 5,
        validateStatus: function (status) {
          return status < 500; // 只拒绝5xx服务器错误
        }
      }
    );

    const taskData = response.data;
    console.log('任务状态:', taskData.status);
    console.log('完整返回数据:', JSON.stringify(taskData, null, 2));

    // 如果任务成功完成
    if (taskData.status === 'succeeded') {
      let videoUrl = null;
      
      // 方式1：尝试从 content 对象中提取（火山引擎格式）
      if (taskData.content) {
        console.log('Content 数据:', JSON.stringify(taskData.content));
        
        // 格式1：content 是对象，直接包含 video_url
        if (typeof taskData.content === 'object' && !Array.isArray(taskData.content)) {
          if (taskData.content.video_url) {
            videoUrl = taskData.content.video_url;
            console.log('从 content.video_url 提取（对象格式）:', videoUrl);
          }
        }
        // 格式2：content 是数组（OpenAI格式）
        else if (Array.isArray(taskData.content) && taskData.content.length > 0) {
          const videoContent = taskData.content.find(c => c.type === 'video_url');
          if (videoContent && videoContent.video_url) {
            videoUrl = videoContent.video_url.url || videoContent.video_url;
            console.log('从 content 提取（数组格式）:', videoUrl);
          }
        }
      }
      
      // 方式2：尝试从 output 字段提取
      if (!videoUrl && taskData.output) {
        console.log('Output 数据:', JSON.stringify(taskData.output));
        if (taskData.output.video_url) {
          videoUrl = taskData.output.video_url;
          console.log('从 output.video_url 提取:', videoUrl);
        } else if (Array.isArray(taskData.output) && taskData.output[0]?.video_url) {
          videoUrl = taskData.output[0].video_url;
          console.log('从 output[0].video_url 提取:', videoUrl);
        } else if (taskData.output.url) {
          videoUrl = taskData.output.url;
          console.log('从 output.url 提取:', videoUrl);
        }
      }
      
      // 方式3：直接查找任何 URL 字段
      if (!videoUrl) {
        const findUrl = (obj) => {
          if (typeof obj !== 'object' || obj === null) return null;
          for (const key of Object.keys(obj)) {
            if (key.includes('video') && key.includes('url') && typeof obj[key] === 'string' && obj[key].startsWith('http')) {
              return obj[key];
            }
            if (typeof obj[key] === 'object') {
              const found = findUrl(obj[key]);
              if (found) return found;
            }
          }
          return null;
        };
        videoUrl = findUrl(taskData);
        if (videoUrl) console.log('智能提取视频URL:', videoUrl);
      }
      
      console.log('最终视频URL:', videoUrl);

      // 如果是临时URL，尝试转为Base64
      if (videoUrl && videoUrl.startsWith('http')) {
        try {
          const videoResponse = await axios.get(videoUrl, {
            responseType: 'arraybuffer',
            timeout: 60000
          });
          
          if (videoResponse.data && videoResponse.status === 200) {
            const base64 = Buffer.from(videoResponse.data, 'binary').toString('base64');
            videoUrl = `data:video/mp4;base64,${base64}`;
          }
        } catch (proxyError) {
          console.warn('代理下载视频失败，使用原始URL:', proxyError.message);
        }
      }

      // 计算费用
      const cost = 0.50; // 假设每次视频生成0.50元
      const tokens = 5000;

      // 更新用户配额
      const user = await get('SELECT * FROM users WHERE id = ?', [log.user_id]);
      if (user.quota > 0) {
        await run('UPDATE users SET used_quota = used_quota + ? WHERE id = ?', [tokens, log.user_id]);
      }

      // 更新日志状态
      await run(
        'UPDATE usage_logs SET status = ?, cost = ?, total_tokens = ?, response_data = ? WHERE id = ?',
        ['success', cost, tokens, JSON.stringify({ ...taskData, videoUrl }), log.id]
      );

      res.json({
        status: 'succeeded',
        videoUrl: videoUrl,
        cost: cost
      });
    } else if (taskData.status === 'failed') {
      // 更新日志为失败
      await run(
        'UPDATE usage_logs SET status = ?, error_message = ? WHERE id = ?',
        ['failed', taskData.error || '未知错误', log.id]
      );

      res.json({
        status: 'failed',
        error: taskData.error || '视频生成失败'
      });
    } else {
      // 仍在处理中
      res.json({
        status: taskData.status || 'processing',
        message: '任务处理中'
      });
    }

  } catch (error) {
    console.error('查询任务状态错误:', error.response?.data || error.message);
    
    // 区分不同类型的错误
    let errorMessage = '查询任务状态失败';
    let errorCode = 'UNKNOWN_ERROR';
    
    if (error.code === 'ECONNRESET' || error.message.includes('socket disconnected')) {
      errorMessage = '网络连接中断，请检查网络连接或稍后重试';
      errorCode = 'NETWORK_ERROR';
    } else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      errorMessage = '请求超时，请稍后重试';
      errorCode = 'TIMEOUT_ERROR';
    } else if (error.response) {
      errorMessage = error.response.data?.error?.message || `API返回错误: ${error.response.status}`;
      errorCode = 'API_ERROR';
    } else if (error.request) {
      errorMessage = '无法连接到API服务器，请检查网络';
      errorCode = 'CONNECTION_ERROR';
    }
    
    res.status(500).json({ 
      message: errorMessage,
      error: error.response?.data?.error?.message || error.message,
      code: errorCode
    });
  }
});

module.exports = router;
