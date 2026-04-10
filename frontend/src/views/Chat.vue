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
                <div class="message-text">{{ msg.content }}</div>
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
import { chatApi, modelApi } from '../api'

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
    
    const assistantMessage = {
      role: 'assistant',
      content: response.content,
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
}

.el-aside {
  background-color: #f5f7fa;
  border-right: 1px solid #e6e6e6;
}

.sidebar-header {
  padding: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e6e6e6;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 16px;
}

.history-list {
  overflow-y: auto;
  height: calc(100vh - 60px);
}

.history-item {
  padding: 12px 15px;
  cursor: pointer;
  border-bottom: 1px solid #e6e6e6;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.history-item:hover {
  background-color: #e6e6e6;
}

.history-item.active {
  background-color: #409eff;
  color: #fff;
}

.el-header {
  background-color: #fff;
  border-bottom: 1px solid #e6e6e6;
  display: flex;
  align-items: center;
  padding: 0 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  width: 100%;
}

.chat-main {
  padding: 0;
  background-color: #f5f7fa;
}

.messages {
  height: 100%;
  overflow-y: auto;
  padding: 20px;
}

.message {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.message.user {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #409eff;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.message.user .message-avatar {
  background-color: #67c23a;
}

.message-content {
  max-width: 70%;
  background-color: #fff;
  padding: 12px 15px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.message.user .message-content {
  background-color: #409eff;
  color: #fff;
}

.message-text {
  line-height: 1.6;
  word-wrap: break-word;
}

.message-time {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
}

.message.user .message-time {
  color: rgba(255, 255, 255, 0.8);
}

.el-footer {
  background-color: #fff;
  border-top: 1px solid #e6e6e6;
  padding: 10px 20px;
}

.input-area {
  display: flex;
  gap: 10px;
  height: 100%;
}

.input-area :deep(.el-textarea) {
  flex: 1;
}

.input-area .el-button {
  align-self: flex-end;
}
</style>
