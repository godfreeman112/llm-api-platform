<template>
  <div class="chat-container">
    <el-container>
      <el-aside width="200px">
        <div class="sidebar-header">
          <h3>对话历史</h3>
          <el-button type="primary" size="small" @click="newChat" circle>
            <el-icon><Plus /></el-icon>
          </el-button>
        </div>
        <div class="history-list">
          <div v-for="chat in history" :key="chat.id" class="history-item"
               :class="{ active: currentChatId === chat.id }"
               @click="loadChat(chat.id)">
            {{ chat.title || '新对话' }}
          </div>
        </div>
      </el-aside>

      <el-container>
        <el-header>
          <div class="header-content">
            <el-select v-model="selectedModel" placeholder="选择模型" style="width: 200px">
              <el-option v-for="model in models" :key="model.id" 
                        :label="model.name" :value="model.id" />
            </el-select>
            <el-button @click="clearHistory">清空历史</el-button>
          </div>
        </el-header>

        <el-main class="chat-main">
          <div class="messages" ref="messagesRef">
            <div v-for="(msg, index) in messages" :key="index" 
                 class="message" :class="msg.role">
              <div class="message-avatar">
                <el-icon v-if="msg.role === 'user'"><User /></el-icon>
                <el-icon v-else><Cpu /></el-icon>
              </div>
              <div class="message-content">
                <div class="message-text" v-html="formatMessageContent(msg.content)" />
                
                <!-- 视频生成任务展示区 -->
                <div v-if="msg.taskId" class="task-result">
                  <el-divider content-position="left">
                    <el-icon><VideoCamera /></el-icon>
                    视频生成任务
                  </el-divider>
                  
                  <!-- 任务信息卡片 -->
                  <div class="task-info-card">
                    <div class="task-header">
                      <el-tag :type="getTaskStatusType(msg)" size="small">
                        {{ getTaskStatusLabel(msg) }}
                      </el-tag>
                      <span class="task-id">ID: {{ msg.taskId }}</span>
                    </div>
                    
                    <!-- 未开始查询 -->
                    <div v-if="!msg.videoUrl && !msg.isPolling && !msg.hasQueried" class="task-actions">
                      <el-button 
                        type="primary" 
                        size="default"
                        @click="startPolling(index, msg.taskId)"
                      >
                        <el-icon><Refresh /></el-icon>
                        查询生成结果
                      </el-button>
                      <el-text size="small" type="info">
                        点击按钮开始查询视频生成状态
                      </el-text>
                    </div>
                    
                    <!-- 正在轮询 -->
                    <div v-if="msg.isPolling" class="polling-status">
                      <el-progress 
                        :percentage="getPollingProgress(msg)" 
                        :stroke-width="8"
                        :status="msg.pollingError ? 'exception' : undefined"
                      />
                      <div class="polling-info">
                        <el-icon class="is-loading"><Loading /></el-icon>
                        <span>{{ msg.pollingText || '正在获取结果...' }}</span>
                      </div>
                      <el-button 
                        size="small" 
                        @click="stopPolling(index)"
                        type="danger"
                        plain
                      >
                        停止查询
                      </el-button>
                    </div>
                    
                    <!-- 视频生成成功 -->
                    <div v-if="msg.videoUrl" class="video-result-container">
                      <div class="video-player-wrapper">
                        <video 
                          :src="msg.videoUrl" 
                          controls 
                          class="generated-video" 
                          preload="metadata"
                        />
                      </div>
                      <div class="video-actions">
                        <el-button type="success" size="default" @click="downloadVideo(msg.videoUrl, index)">
                          <el-icon><Download /></el-icon>
                          下载视频
                        </el-button>
                        <el-button size="default" @click="copyVideoUrl(msg.videoUrl)">
                          <el-icon><Link /></el-icon>
                          复制链接
                        </el-button>
                        <el-button size="default" @click="openInNewTab(msg.videoUrl)">
                          <el-icon><View /></el-icon>
                          新窗口打开
                        </el-button>
                      </div>
                    </div>
                    
                    <!-- 任务失败 -->
                    <div v-if="msg.pollingError" class="task-error">
                      <el-alert 
                        :title="'生成失败: ' + msg.pollingError" 
                        type="error" 
                        :closable="false"
                        show-icon
                      />
                      <el-button 
                        size="small" 
                        type="warning"
                        @click="retryQuery(index, msg.taskId)"
                        style="margin-top: 10px;"
                      >
                        重试查询
                      </el-button>
                    </div>
                  </div>
                </div>
                
                <div class="message-time">{{ formatTime(msg.time) }}</div>
              </div>
            </div>
            <div v-if="loading" class="message assistant">
              <div class="message-avatar">
                <el-icon><Cpu /></el-icon>
              </div>
              <div class="message-content">
                <el-skeleton :rows="2" animated />
              </div>
            </div>
          </div>
        </el-main>

        <el-footer height="80px">
          <div class="input-area">
            <el-input v-model="inputMessage" type="textarea" :rows="3" 
                     placeholder="输入消息... (Ctrl+Enter发送)"
                     @keydown.ctrl.enter="sendMessage" />
            <el-button type="primary" @click="sendMessage" :loading="loading">
              发送
            </el-button>
          </div>
        </el-footer>
      </el-container>
    </el-container>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { chatApi, modelApi, videoApi } from '../api'
import { Plus, User, Cpu, Loading, VideoCamera, Refresh, Download, Link, View } from '@element-plus/icons-vue'

const route = useRoute()
const messagesRef = ref(null)
const loading = ref(false)
const inputMessage = ref('')
const selectedModel = ref('')
const currentChatId = ref(null)
const messages = ref([])
const history = ref([])
const models = ref([])

const loadModels = async () => {
  try {
    const data = await modelApi.getList()
    models.value = data.filter(m => m.status === 'active')
    if (models.value.length > 0 && !selectedModel.value) {
      selectedModel.value = models.value[0].id
    }
  } catch (error) {
    ElMessage.error('加载模型列表失败')
  }
}

const loadHistory = async () => {
  try {
    const data = await chatApi.getHistory()
    history.value = data
  } catch (error) {
    console.error('加载历史失败', error)
  }
}

const newChat = () => {
  currentChatId.value = null
  messages.value = []
}

const loadChat = (id) => {
  currentChatId.value = id
  // 这里应该从后端加载具体对话内容
  messages.value = []
}

const sendMessage = async () => {
  if (!inputMessage.value.trim()) {
    ElMessage.warning('请输入消息内容')
    return
  }
  
  if (!selectedModel.value) {
    ElMessage.warning('请选择模型')
    return
  }

  const userMessage = {
    role: 'user',
    content: inputMessage.value,
    time: new Date()
  }
  
  messages.value.push(userMessage)
  const currentInput = inputMessage.value
  inputMessage.value = ''
  loading.value = true
  
  scrollToBottom()

  try {
    const response = await chatApi.sendMessage({
      model: selectedModel.value,
      message: currentInput,
      history: messages.value.slice(0, -1)
    })
    
    const selectedModelObj = models.value.find(m => m.id === selectedModel.value)
    const isVideoModel = selectedModelObj && selectedModelObj.modelType === 'video'
    
    // 解析任务ID（如果是视频/图像生成模型）
    let taskId = null
    let content = response.content
    if (isVideoModel && response.content.includes('任务ID:')) {
      const match = response.content.match(/任务ID: ([\w-]+)/)
      if (match) {
        taskId = match[1]
      }
    }

    const assistantMessage = {
      role: 'assistant',
      content: content,
      taskId: taskId,
      videoUrl: null,
      isPolling: false,
      pollingText: '',
      pollingError: null,
      hasQueried: false,
      pollingAttempts: 0,
      time: new Date()
    }
    
    messages.value.push(assistantMessage)
    await loadHistory()
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '发送失败')
  } finally {
    loading.value = false
    scrollToBottom()
  }
}

const clearHistory = async () => {
  try {
    await chatApi.clearHistory()
    messages.value = []
    history.value = []
    ElMessage.success('已清空历史')
  } catch (error) {
    ElMessage.error('清空失败')
  }
}

const scrollToBottom = async () => {
  await nextTick()
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  }
}

const formatTime = (time) => {
  if (!time) return ''
  const date = new Date(time)
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

// 格式化消息内容（处理换行符）
const formatMessageContent = (content) => {
  if (!content) return ''
  return content.replace(/\n/g, '<br>')
}

// 获取任务状态标签类型
const getTaskStatusType = (msg) => {
  if (msg.videoUrl) return 'success'
  if (msg.pollingError) return 'danger'
  if (msg.isPolling) return 'warning'
  return 'info'
}

// 获取任务状态文本
const getTaskStatusLabel = (msg) => {
  if (msg.videoUrl) return '✓ 生成成功'
  if (msg.pollingError) return '✗ 生成失败'
  if (msg.isPolling) return '⟳ 生成中'
  return '⏸ 待查询'
}

// 获取轮询进度百分比
const getPollingProgress = (msg) => {
  if (!msg.pollingAttempts) return 0
  return Math.round((msg.pollingAttempts / 60) * 100)
}

// 开始轮询任务状态
const startPolling = async (msgIndex, taskId) => {
  const msg = messages.value[msgIndex]
  msg.isPolling = true
  msg.pollingText = '正在连接服务器...'
  msg.pollingError = null
  msg.hasQueried = true
  msg.pollingAttempts = 0

  let attempts = 0
  const maxAttempts = 60 // 最多轮询60次（约5分钟）

  while (attempts < maxAttempts && msg.isPolling) {
    await new Promise(resolve => setTimeout(resolve, 5000)) // 每5秒查询一次
    
    if (!msg.isPolling) break // 用户手动停止
    
    attempts++
    msg.pollingAttempts = attempts
    msg.pollingText = `查询中... (${attempts}/${maxAttempts})`

    try {
      const statusResult = await videoApi.checkStatus(taskId)
      
      if (statusResult.status === 'succeeded') {
        msg.videoUrl = statusResult.videoUrl
        msg.isPolling = false
        msg.pollingText = ''
        msg.pollingError = null
        ElMessage.success('🎉 视频生成成功！')
        scrollToBottom()
        break
      } else if (statusResult.status === 'failed') {
        msg.isPolling = false
        msg.pollingError = statusResult.error || '未知错误'
        msg.pollingText = ''
        ElMessage.error('❌ 视频生成失败')
        break
      } else {
        // 仍在处理中
        msg.pollingText = `生成中... ${statusResult.message || '请稍候'} (${attempts}/${maxAttempts})`
      }
    } catch (error) {
      console.error('轮询状态失败:', error)
      // 不立即中断，继续尝试
      if (attempts >= 3) {
        msg.pollingError = '网络连接异常，请检查网络后重试'
        msg.isPolling = false
        ElMessage.error('查询失败，请重试')
        break
      }
    }
  }

  if (!msg.videoUrl && !msg.pollingError && attempts >= maxAttempts) {
    msg.isPolling = false
    msg.pollingError = '生成超时（超过5分钟），请稍后手动查询或联系客服'
    ElMessage.warning('⏰ 视频生成超时')
  }
}

// 停止轮询
const stopPolling = (msgIndex) => {
  messages.value[msgIndex].isPolling = false
  messages.value[msgIndex].pollingText = '已停止查询'
  ElMessage.info('已停止查询，您可以稍后再次点击“查询生成结果”按钮')
}

// 重试查询
const retryQuery = (msgIndex, taskId) => {
  messages.value[msgIndex].pollingError = null
  startPolling(msgIndex, taskId)
}

// 下载视频
const downloadVideo = (videoUrl, msgIndex) => {
  if (!videoUrl) return
  const link = document.createElement('a')
  link.href = videoUrl
  link.download = `generated_video_${Date.now()}.mp4`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// 复制视频链接
const copyVideoUrl = async (videoUrl) => {
  if (!videoUrl) return
  try {
    await navigator.clipboard.writeText(videoUrl)
    ElMessage.success('✅ 视频链接已复制到剪贴板')
  } catch (error) {
    ElMessage.error('复制链接失败')
  }
}

// 在新窗口打开视频
const openInNewTab = (videoUrl) => {
  if (!videoUrl) return
  window.open(videoUrl, '_blank')
}

watch(() => route.query.model, (newModel) => {
  if (newModel) {
    selectedModel.value = newModel
  }
})

onMounted(() => {
  loadModels()
  loadHistory()
  if (route.query.model) {
    selectedModel.value = route.query.model
  }
})
</script>

<style scoped>
.chat-container {
  height: 100vh;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
}

.el-aside {
  background: rgba(15, 23, 42, 0.95) !important;
  backdrop-filter: blur(20px);
  border-right: 1px solid rgba(148, 163, 184, 0.1);
  box-shadow: 4px 0 20px rgba(0, 0, 0, 0.2);
}

.sidebar-header {
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
}

.sidebar-header h3 {
  margin: 0;
  font-size: 16px;
  color: #f1f5f9;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.history-list {
  overflow-y: auto;
  height: calc(100vh - 70px);
  padding: 10px;
}

.history-item {
  padding: 14px 16px;
  cursor: pointer;
  border-radius: 12px;
  margin-bottom: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #94a3b8;
  font-weight: 500;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: rgba(30, 41, 59, 0.4);
  border: 1px solid transparent;
}

.history-item:hover {
  background: rgba(102, 126, 234, 0.15);
  color: #cbd5e1;
  transform: translateX(4px);
  border-color: rgba(102, 126, 234, 0.2);
}

.history-item.active {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.25) 0%, rgba(118, 75, 162, 0.25) 100%);
  color: #667eea;
  border-color: rgba(102, 126, 234, 0.3);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.2);
}

.el-header {
  background: rgba(30, 41, 59, 0.6) !important;
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  display: flex;
  align-items: center;
  padding: 0 30px;
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
}

.header-content {
  display: flex;
  justify-content: space-between;
  width: 100%;
  align-items: center;
}

.chat-main {
  padding: 0;
  background: transparent;
}

.messages {
  height: 100%;
  overflow-y: auto;
  padding: 30px;
}

.message {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  animation: messageSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes messageSlideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message.user {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  transition: all 0.3s ease;
}

.message.user .message-avatar {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.message:hover .message-avatar {
  transform: scale(1.1);
}

.message-content {
  max-width: 70%;
  background: rgba(30, 41, 59, 0.8);
  backdrop-filter: blur(10px);
  padding: 16px 20px;
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.1);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
}

.message:hover .message-content {
  box-shadow: 0 6px 25px rgba(0, 0, 0, 0.2);
}

.message.user .message-content {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.9) 0%, rgba(118, 75, 162, 0.9) 100%);
  color: #fff;
  border: none;
}

.message-text {
  line-height: 1.7;
  word-wrap: break-word;
  color: #e2e8f0;
  font-size: 14px;
}

.message.user .message-text {
  color: #fff;
}

.task-result {
  margin-top: 18px;
  padding-top: 15px;
  border-top: 1px solid rgba(148, 163, 184, 0.1);
}

.task-info-card {
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.6) 100%);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 20px;
  border: 1px solid rgba(148, 163, 184, 0.15);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.task-id {
  font-size: 12px;
  color: #94a3b8;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 500;
}

.task-actions {
  text-align: center;
  padding: 25px 0;
}

.task-actions .el-button {
  margin-bottom: 12px;
}

.task-actions .el-text {
  display: block;
  margin-top: 10px;
}

.polling-status {
  padding: 18px;
  background: rgba(15, 23, 42, 0.6);
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.15);
}

.polling-info {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #667eea;
  font-size: 14px;
  margin: 15px 0;
  justify-content: center;
  font-weight: 500;
}

.polling-status .el-button {
  width: 100%;
  margin-top: 12px;
}

.video-result-container {
  margin-top: 18px;
}

.video-player-wrapper {
  background: #000;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 15px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(148, 163, 184, 0.1);
}

.generated-video {
  width: 100%;
  max-height: 480px;
  display: block;
}

.video-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

.task-error {
  margin-top: 15px;
}

.message-time {
  font-size: 12px;
  color: #64748b;
  margin-top: 8px;
  font-weight: 500;
}

.message.user .message-time {
  color: rgba(255, 255, 255, 0.7);
}

.el-footer {
  background: rgba(30, 41, 59, 0.8) !important;
  backdrop-filter: blur(20px);
  border-top: 1px solid rgba(148, 163, 184, 0.1);
  padding: 15px 30px;
  box-shadow: 0 -2px 20px rgba(0, 0, 0, 0.1);
}

.input-area {
  display: flex;
  gap: 12px;
  height: 100%;
}

.input-area :deep(.el-textarea) {
  flex: 1;
}

.input-area .el-button {
  align-self: flex-end;
}
</style>
