#!/usr/bin/env node

/**
 * Seedance 2.0 模型配置测试脚本
 * 
 * 此脚本用于验证视频生成模型的配置是否正确
 */

const axios = require('axios');

// 配置信息 - 请根据实际情况修改
const CONFIG = {
  baseUrl: 'http://localhost:3000/api', // 后端API地址
  adminUsername: 'admin',
  adminPassword: 'admin123456'
};

async function testSeedanceModel() {
  console.log('🎬 Seedance 2.0 模型配置测试\n');
  
  try {
    // 1. 登录获取token
    console.log('1️⃣  正在登录...');
    const loginResponse = await axios.post(`${CONFIG.baseUrl}/auth/login`, {
      username: CONFIG.adminUsername,
      password: CONFIG.adminPassword
    });
    
    const token = loginResponse.data.token;
    console.log('✅ 登录成功\n');
    
    // 2. 添加Seedance 2.0模型
    console.log('2️⃣  正在添加 Seedance 2.0 模型...');
    const modelData = {
      name: 'seedance-2.0-pro',
      provider: 'volcengine',
      modelType: 'video',
      apiEndpoint: 'https://ark.cn-beijing.volces.com/api/v3/videos/generations',
      apiKey: 'YOUR_API_KEY_HERE', // 请替换为真实的API密钥
      temperature: 0.7,
      maxTokens: 4096,
      videoDuration: '5s',
      videoResolution: '1080p',
      outputFormat: 'mp4',
      description: '火山引擎 Seedance 2.0 视频生成模型',
      status: 'active'
    };
    
    const createResponse = await axios.post(
      `${CONFIG.baseUrl}/models`,
      modelData,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('✅ 模型创建成功');
    console.log(`   模型ID: ${createResponse.data.id}\n`);
    
    const modelId = createResponse.data.id;
    
    // 3. 获取模型列表验证
    console.log('3️⃣  正在验证模型列表...');
    const listResponse = await axios.get(
      `${CONFIG.baseUrl}/models`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    const models = listResponse.data;
    const seedanceModel = models.find(m => m.id === modelId);
    
    if (seedanceModel) {
      console.log('✅ 模型存在于列表中');
      console.log(`   名称: ${seedanceModel.name}`);
      console.log(`   类型: ${seedanceModel.modelType}`);
      console.log(`   状态: ${seedanceModel.status}`);
      console.log(`   视频时长: ${seedanceModel.videoDuration}`);
      console.log(`   视频分辨率: ${seedanceModel.videoResolution}`);
      console.log(`   输出格式: ${seedanceModel.outputFormat}\n`);
    } else {
      console.log('❌ 未找到刚创建的模型\n');
    }
    
    // 4. 测试模型连接（需要真实的API密钥）
    console.log('4️⃣  测试模型连接...');
    console.log('⚠️  注意：此步骤需要有效的API密钥');
    console.log('   如果使用的是测试密钥，连接测试可能会失败\n');
    
    try {
      const testResponse = await axios.post(
        `${CONFIG.baseUrl}/models/${modelId}/test`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          timeout: 60000 // 视频生成需要更长的超时时间
        }
      );
      
      console.log('✅ 连接测试成功');
      console.log('   响应:', JSON.stringify(testResponse.data, null, 2));
    } catch (error) {
      console.log('⚠️  连接测试失败（这可能是正常的，如果使用的是测试密钥）');
      console.log('   错误信息:', error.response?.data?.message || error.message);
    }
    
    console.log('\n✨ 测试完成！\n');
    console.log('📝 下一步操作：');
    console.log('   1. 在平台管理界面中编辑模型');
    console.log('   2. 替换为您的真实 API Key');
    console.log('   3. 再次进行连接测试');
    console.log('   4. 开始使用视频生成功能\n');
    
  } catch (error) {
    console.error('\n❌ 测试失败:');
    console.error('   错误:', error.response?.data?.message || error.message);
    console.error('\n💡 提示：');
    console.error('   - 确保后端服务正在运行');
    console.error('   - 检查管理员账号密码是否正确');
    console.error('   - 查看后端日志获取更多信息\n');
  }
}

// 运行测试
testSeedanceModel();
