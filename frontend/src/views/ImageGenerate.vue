<template>
  <div class="image-generate-container">
    <el-card class="config-card">
      <template #header>
        <div class="card-header">
          <span>图像生成</span>
        </div>
      </template>

      <el-form :model="form" label-width="120px">
        <el-form-item label="选择模型">
          <el-select v-model="form.modelId" placeholder="选择图像生成模型" style="width: 100%" @change="onModelChange">
            <el-option
              v-for="model in imageModels"
              :key="model.id"
              :label="model.name"
              :value="model.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="提示词">
          <el-input
            v-model="form.prompt"
            type="textarea"
            :rows="4"
            placeholder="请输入图像描述提示词，例如：一个充满活力的特写编辑肖像，模特眼神犀利，头戴雕塑感帽子，色彩拼接丰富..."
            maxlength="600"
            show-word-limit
            @drop.prevent
          />
          <div class="prompt-tip">
            💡 提示：请通过下方的"参考图片"区域上传，不要将图片拖拽到此处
          </div>
          <!-- 参考文件引用快捷按钮 -->
          <div v-if="hasReferenceFiles" class="reference-files-bar">
            <span class="reference-label">📎 已上传参考文件：</span>
            <div class="reference-buttons">
              <el-tag 
                v-for="(ref, index) in referenceFiles" 
                :key="index"
                size="small"
                closable
                type="success"
                @close="removeReference(ref)"
                @click="insertReference(ref)"
                class="reference-tag"
              >
                {{ ref.icon }} {{ ref.name }}
              </el-tag>
            </div>
            <div class="reference-hint">点击标签插入引用，或拖拽到提示词框中</div>
          </div>
        </el-form-item>

        <!-- 参考图片（默认显示） -->
        <el-form-item label="参考图片" v-if="form.modelConfig?.supportImageInput !== false">
          <el-upload
            v-model:file-list="imageFileList"
            class="upload-demo"
            :auto-upload="false"
            :on-change="handleImageChange"
            :on-remove="handleImageRemove"
            :limit="9"
            accept="image/*"
            list-type="picture-card"
            multiple
            :on-preview="handlePictureCardPreview"
          >
            <el-icon><Plus /></el-icon>
            <template #tip>
              <div class="el-upload__tip">支持 jpg/png/webp，最多9张，可选：上传参考图进行图生图</div>
            </template>
          </el-upload>
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            @click="generateImage"
            :loading="loading"
            :disabled="!canGenerate"
            size="large"
          >
            {{ loading ? '生成中...' : '生成图像' }}
          </el-button>
          <el-button @click="resetForm" :disabled="loading">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 生成结果 -->
    <el-card v-if="generatedImage" class="result-card">
      <template #header>
        <div class="card-header">
          <span>生成结果</span>
          <div class="result-actions">
            <el-tag type="success">生成成功</el-tag>
            <el-button size="small" @click="downloadImage">下载图片</el-button>
          </div>
        </div>
      </template>

      <div class="image-result">
        <el-image
          :src="generatedImage"
          fit="contain"
          class="generated-image"
          :preview-src-list="[generatedImage]"
        >
          <template #error>
            <div class="image-error">
              <el-icon><Picture /></el-icon>
              <span>图片加载失败</span>
            </div>
          </template>
        </el-image>
      </div>

      <div class="usage-info">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="使用模型">{{ selectedModel?.name }}</el-descriptions-item>
          <el-descriptions-item label="成本">¥{{ usageInfo.cost?.toFixed(4) || '0.0000' }}</el-descriptions-item>
          <el-descriptions-item label="生成时间">{{ generationTime }}秒</el-descriptions-item>
          <el-descriptions-item label="提示词长度">{{ form.prompt?.length || 0 }}字</el-descriptions-item>
        </el-descriptions>
      </div>
    </el-card>

    <!-- 生成历史 -->
    <el-card class="history-card" v-if="history.length > 0">
      <template #header>
        <span>生成历史</span>
      </template>

      <el-row :gutter="16">
        <el-col :span="6" v-for="(item, index) in history" :key="index">
          <el-card shadow="hover" class="history-item">
            <el-image
              :src="item.imageUrl"
              fit="cover"
              class="history-image"
              :preview-src-list="history.map(h => h.imageUrl)"
            />
            <div class="history-info">
              <p class="history-prompt">{{ item.prompt }}</p>
              <span class="history-time">{{ item.time }}</span>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Picture, Plus } from '@element-plus/icons-vue'
import { modelApi, imageApi } from '../api'

const route = useRoute()

const loading = ref(false)
const generatedImage = ref(null)
const usageInfo = ref({})
const generationTime = ref(0)
const history = ref([])
const imageModels = ref([])
const selectedModel = ref(null)
const imageFileList = ref([])

const form = ref({
  modelId: '',
  prompt: '',
  images: [],
  modelConfig: {
    supportImageInput: true
  }
})

const canGenerate = computed(() => {
  return form.value.modelId && form.value.prompt.trim() && !loading.value
})

// 参考文件列表
const referenceFiles = computed(() => {
  const files = []
  
  // 图片文件
  imageFileList.value.forEach((file, index) => {
    files.push({
      type: 'image',
      icon: '🖼️',
      name: file.name || `图片${index + 1}`,
      index: index,
      category: 'images'
    })
  })
  
  return files
})

const hasReferenceFiles = computed(() => {
  return referenceFiles.value.length > 0
})

// 插入引用到提示词
const insertReference = (ref) => {
  const textarea = document.querySelector('textarea')
  if (!textarea) return
  
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const text = form.value.prompt
  
  // 生成引用标记
  let refText = ''
  if (ref.type === 'image') {
    refText = `[参考图片${ref.index + 1}]`
  }
  
  // 在光标位置插入引用
  const newText = text.substring(0, start) + ' ' + refText + ' ' + text.substring(end)
  form.value.prompt = newText
  
  // 将光标移动到引用后面
  setTimeout(() => {
    textarea.focus()
    const newPos = start + refText.length + 2
    textarea.setSelectionRange(newPos, newPos)
  }, 0)
  
  ElMessage.success(`已插入引用: ${refText}`)
}

// 移除参考文件
const removeReference = (ref) => {
  if (ref.category === 'images') {
    // 移除图片
    imageFileList.value.splice(ref.index, 1)
    form.value.images.splice(ref.index, 1)
  }
  ElMessage.success(`已移除: ${ref.name}`)
}

const loadImageModels = async () => {
  try {
    const data = await modelApi.getList()
    imageModels.value = data.filter(m => m.status === 'active' && m.modelType === 'image')
    
    if (imageModels.value.length > 0 && !form.value.modelId) {
      form.value.modelId = imageModels.value[0].id
      onModelChange()
    }
  } catch (error) {
    ElMessage.error('加载模型列表失败')
  }
}

const onModelChange = () => {
  selectedModel.value = imageModels.value.find(m => m.id === form.value.modelId)
  // 设置模型配置，控制上传组件显示
  if (selectedModel.value) {
    form.value.modelConfig = {
      supportImageInput: selectedModel.value.supportImageInput !== false  // 默认 true
    }
  } else {
    form.value.modelConfig = {
      supportImageInput: true
    }
  }
  // 清空所有文件
  clearAllFiles()
}

// Element Plus 图片预览
const handlePictureCardPreview = (file) => {
  // 使用 Element Plus 的内置图片预览
  const img = new Image()
  img.src = file.url
  img.onload = () => {
    const previewImg = new Image()
    previewImg.src = img.src
    previewImg.style.maxWidth = '80vw'
    previewImg.style.maxHeight = '80vh'
    const previewContainer = document.createElement('div')
    previewContainer.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.8);display:flex;justify-content:center;align-items:center;z-index:9999;cursor:pointer;'
    previewContainer.appendChild(previewImg)
    previewContainer.onclick = () => document.body.removeChild(previewContainer)
    document.body.appendChild(previewContainer)
  }
}

const handleImageChange = (file, fileList) => {
  // Element Plus 需要立即设置 file.url 才能显示预览
  // 先用 ObjectURL 作为临时预览
  const tempUrl = URL.createObjectURL(file.raw)
  file.url = tempUrl
  
  // 异步转换 Base64
  const reader = new FileReader()
  reader.onload = (e) => {
    const base64 = e.target.result
    // 更新 file.url 为 Base64
    file.url = base64
    // 存入表单数据
    form.value.images.push(base64)
    console.log(`图片已转换: ${file.name}`, base64.substring(0, 50) + '...')
  }
  reader.onerror = () => {
    ElMessage.error(`图片转换失败: ${file.name}`)
  }
  reader.readAsDataURL(file.raw)
}

const handleImageRemove = (file, fileList) => {
  // 使用 file.url 来匹配（因为 file.uid 可能不一致）
  const index = form.value.images.findIndex(base64 => base64 === file.url)
  if (index !== -1) {
    form.value.images.splice(index, 1)
    console.log('移除图片，索引:', index)
  }
}

const clearAllFiles = () => {
  imageFileList.value = []
  form.value.images = []
}

const generateImage = async () => {
  if (!canGenerate.value) return

  loading.value = true
  const startTime = Date.now()

  try {
    const result = await imageApi.generate({
      model: form.value.modelId,
      prompt: form.value.prompt.trim(),
      images: form.value.images.length > 0 ? form.value.images : undefined
    })

    generatedImage.value = result.imageUrl
    usageInfo.value = result.usage || {}
    generationTime.value = ((Date.now() - startTime) / 1000).toFixed(2)

    // 添加到历史记录
    history.value.unshift({
      imageUrl: result.imageUrl,
      prompt: form.value.prompt,
      time: new Date().toLocaleString(),
      cost: result.usage?.cost
    })

    ElMessage.success('图像生成成功！')
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '图像生成失败')
    console.error('生成图像错误:', error)
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  // 保留 modelConfig，避免上传区域消失
  const currentModelConfig = form.value.modelConfig || {
    supportImageInput: true
  }
  
  form.value = {
    modelId: form.value.modelId,
    prompt: '',
    images: [],
    modelConfig: currentModelConfig
  }
  generatedImage.value = null
  usageInfo.value = {}
  generationTime.value = 0
  clearAllFiles()
}

const downloadImage = () => {
  if (!generatedImage.value) return

  const link = document.createElement('a')
  link.href = generatedImage.value
  link.download = `generated_${Date.now()}.png`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

onMounted(() => {
  loadImageModels()
})

// 监听路由参数，自动选择模型
watch(() => route.query.model, (newModelId) => {
  if (newModelId && imageModels.value.length > 0) {
    const model = imageModels.value.find(m => m.id === parseInt(newModelId))
    if (model) {
      form.value.modelId = model.id
      onModelChange()
    }
  }
})
</script>

<style scoped>
.image-generate-container {
  padding: 30px;
  max-width: 1400px;
  margin: 0 auto;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  min-height: 100vh;
}

.config-card,
.result-card,
.history-card {
  animation: fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header span {
  font-size: 18px;
  font-weight: 600;
  color: #f1f5f9;
  letter-spacing: 0.5px;
}

.result-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.prompt-tip {
  margin-top: 10px;
  font-size: 13px;
  color: #94a3b8;
  font-weight: 500;
}

/* 参考文件引用栏 */
.reference-files-bar {
  margin-top: 15px;
  padding: 16px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  border-radius: 12px;
  border: 1px solid rgba(102, 126, 234, 0.2);
  backdrop-filter: blur(10px);
}

.reference-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #cbd5e1;
  margin-bottom: 10px;
  letter-spacing: 0.5px;
}

.reference-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 10px;
}

.reference-tag {
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
  background: rgba(102, 126, 234, 0.15) !important;
  border: 1px solid rgba(102, 126, 234, 0.3) !important;
  color: #667eea !important;
  font-weight: 500;
}

.reference-tag:hover {
  transform: translateY(-3px) scale(1.05);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.3);
  background: rgba(102, 126, 234, 0.25) !important;
  border-color: rgba(102, 126, 234, 0.5) !important;
}

.reference-tag:active {
  transform: translateY(-1px) scale(1.02);
}

.reference-hint {
  font-size: 12px;
  color: #94a3b8;
  font-style: italic;
  font-weight: 400;
}

.upload-demo {
  margin-bottom: 15px;
}

:deep(.el-upload--picture-card) {
  background: rgba(15, 23, 42, 0.6) !important;
  border: 2px dashed rgba(148, 163, 184, 0.2) !important;
  border-radius: 12px !important;
  transition: all 0.3s ease !important;
}

:deep(.el-upload--picture-card:hover) {
  border-color: #667eea !important;
  background: rgba(102, 126, 234, 0.1) !important;
}

:deep(.el-upload-list--picture-card .el-upload-list__item) {
  border-radius: 12px !important;
  overflow: hidden;
}

.image-result {
  text-align: center;
  margin: 25px 0;
}

.generated-image {
  max-width: 100%;
  max-height: 700px;
  border-radius: 16px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3), 0 0 40px rgba(102, 126, 234, 0.15);
  border: 1px solid rgba(148, 163, 184, 0.1);
  transition: all 0.3s ease;
}

.generated-image:hover {
  transform: scale(1.02);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4), 0 0 50px rgba(102, 126, 234, 0.2);
}

.image-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: #94a3b8;
}

.image-error .el-icon {
  font-size: 56px;
  margin-bottom: 15px;
  color: #ef4444;
}

.usage-info {
  margin-top: 25px;
}

.history-card {
  margin-top: 25px;
}

.history-item {
  margin-bottom: 20px;
  transition: all 0.3s ease;
}

.history-item:hover {
  transform: translateY(-4px);
}

.history-image {
  width: 100%;
  height: 220px;
  border-radius: 12px;
  object-fit: cover;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(148, 163, 184, 0.1);
}

.history-info {
  margin-top: 12px;
}

.history-prompt {
  font-size: 13px;
  color: #cbd5e1;
  margin: 0 0 10px 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.6;
  font-weight: 500;
}

.history-time {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}
</style>
