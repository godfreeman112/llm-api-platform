/**
 * 数据库初始化脚本 - 添加示例数据
 * 运行: node seed.js
 */

const { initDatabase, run, get } = require('./database');
const bcrypt = require('bcryptjs');

async function seed() {
  console.log('开始初始化示例数据...');
  
  try {
    // 初始化数据库
    await initDatabase();
    console.log('✓ 数据库初始化完成');
    
    // 检查是否已有示例数据
    const existingModel = await get('SELECT * FROM models LIMIT 1');
    if (existingModel) {
      console.log('⚠ 数据库中已有数据，跳过示例数据插入');
      return;
    }
    
    // 添加示例模型（需要用户自己替换API密钥）
    console.log('\n添加示例模型配置...');
    
    const models = [
      {
        name: 'GPT-3.5-Turbo',
        provider: 'openai',
        model_type: 'chat',
        api_endpoint: 'https://api.openai.com/v1/chat/completions',
        api_key: 'YOUR_API_KEY_HERE',
        temperature: 0.7,
        max_tokens: 4096,
        image_size: null,
        output_format: null,
        response_format: null,
        description: 'OpenAI的GPT-3.5 Turbo模型，适用于大多数对话场景',
        status: 'inactive'
      },
      {
        name: 'GPT-4',
        provider: 'openai',
        model_type: 'chat',
        api_endpoint: 'https://api.openai.com/v1/chat/completions',
        api_key: 'YOUR_API_KEY_HERE',
        temperature: 0.7,
        max_tokens: 8192,
        image_size: null,
        output_format: null,
        response_format: null,
        description: 'OpenAI的GPT-4模型，更强大的推理能力',
        status: 'inactive'
      },
      {
        name: '文心一言',
        provider: 'baidu',
        model_type: 'chat',
        api_endpoint: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions',
        api_key: 'YOUR_API_KEY_HERE',
        temperature: 0.7,
        max_tokens: 4096,
        image_size: null,
        output_format: null,
        response_format: null,
        description: '百度文心一言大模型',
        status: 'inactive'
      },
      {
        name: 'doubao-seedream-4.0',
        provider: 'volcengine',
        model_type: 'image',
        api_endpoint: 'https://ark.cn-beijing.volces.com/api/v3/images/generations',
        api_key: 'YOUR_VOLCENGINE_API_KEY_HERE',
        temperature: null,
        max_tokens: null,
        image_size: '1024x1024',
        output_format: 'png',
        response_format: 'url',
        description: '火山引擎即梦4.0文生图模型，支持高质量图像生成',
        status: 'inactive'
      }
    ];
    
    for (const model of models) {
      await run(
        `INSERT INTO models (name, provider, model_type, api_endpoint, api_key, temperature, max_tokens, image_size, output_format, response_format, description, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          model.name, model.provider, model.model_type || 'chat', model.api_endpoint, model.api_key,
          model.temperature, model.max_tokens, model.image_size || '1024x1024',
          model.output_format || 'png', model.response_format || 'url',
          model.description, model.status
        ]
      );
      console.log(`  ✓ ${model.name} (${model.model_type === 'image' ? '图像生成' : '对话'})`);
    }
    
    // 创建示例普通用户
    const sampleUserPassword = await bcrypt.hash('user123456', 10);
    await run(
      'INSERT INTO users (username, email, password, role, quota, status) VALUES (?, ?, ?, ?, ?, ?)',
      ['demo', 'demo@example.com', sampleUserPassword, 'user', 100000, 'active']
    );
    console.log('\n✓ 创建示例用户: demo / user123456');
    
    console.log('\n✓ 示例数据初始化完成！');
    console.log('\n重要提示:');
    console.log('1. 请在"模型管理"中配置您的真实API密钥');
    console.log('2. 管理员账号: admin / admin123456');
    console.log('3. 示例用户: demo / user123456');
    
  } catch (error) {
    console.error('错误:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  seed();
}

module.exports = seed;
