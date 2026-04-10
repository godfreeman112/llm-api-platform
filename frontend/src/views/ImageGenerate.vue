<template>
  <div class="image-generate-container">
    <el-card class="config-card">
      <template #header>
        <div class="card-header">
          <span>图像生成</span>
          <el-tag type="info">火山引擎即梦 4.0</el-tag>
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
          />
        </el-form-item>

        <el-form-item label="参考图片" v-if="form.modelConfig?.supportImageInput">
          <el-upload
            class="upload-demo"
            :auto-upload="false"
            :on-change="handleFileChange"
            :limit="1"
            accept="image/*"
          >
            <template #trigger>
              <el-button type="primary">选择图片</el-button>
            </template>
            <template #tip>
              <div class="el-upload__tip">支持 jpg/png/webp，可选：上传参考图进行图生图</div>
            </template>
          </el-upload>
          <div v-if="previewImage" class="preview-container">
            <img :src="previewImage" alt="预览图" class="preview-image" />
            <el-button size="small" type="danger" @click="clearImage" class="clear-btn">
              移除图片
            </el-button>
          </div>
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
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Picture } from '@element-plus/icons-vue'
import { modelApi, imageApi } from '../api'

const loading = ref(false)
const generatedImage = ref(null)
const usageInfo = ref({})
const generationTime = ref(0)
const history = ref([])
const previewImage = ref(null)
const imageFile = ref(null)
const imageModels = ref([])
const selectedModel = ref(null)

const form = ref({
  modelId: '',
  prompt: '',
  image: null
})

const canGenerate = computed(() => {
  return form.value.modelId && form.value.prompt.trim() && !loading.value
})

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
  form.value.image = null
  previewImage.value = null
  imageFile.value = null
}

const handleFileChange = (file) => {
  imageFile.value = file.raw
  previewImage.value = URL.createObjectURL(file.raw)
  
  // 将图片转为Base64
  const reader = new FileReader()
  reader.onload = (e) => {
    form.value.image = e.target.result
  }
  reader.readAsDataURL(file.raw)
}

const clearImage = () => {
  form.value.image = null
  previewImage.value = null
  imageFile.value = null
}

const generateImage = async () => {
  if (!canGenerate.value) return

  loading.value = true
  const startTime = Date.now()

  try {
    const result = await imageApi.generate({
      model: form.value.modelId,
      prompt: form.value.prompt.trim(),
      image: form.value.image
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
  form.value = {
    modelId: form.value.modelId,
    prompt: '',
    image: null
  }
  generatedImage.value = null
  usageInfo.value = {}
  generationTime.value = 0
  previewImage.value = null
  imageFile.value = null
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
</script>

<style scoped>
.image-generate-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.result-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.upload-demo {
  margin-bottom: 10px;
}

.preview-container {
  position: relative;
  margin-top: 10px;
  display: inline-block;
}

.preview-image {
  max-width: 200px;
  max-height: 200px;
  border-radius: 8px;
  border: 2px solid #e6e6e6;
}

.clear-btn {
  position: absolute;
  top: -10px;
  right: -10px;
  padding: 2px 8px;
}

.image-result {
  text-align: center;
  margin: 20px 0;
}

.generated-image {
  max-width: 100%;
  max-height: 600px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.image-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: #999;
}

.image-error .el-icon {
  font-size: 48px;
  margin-bottom: 10px;
}

.usage-info {
  margin-top: 20px;
}

.history-card {
  margin-top: 20px;
}

.history-item {
  margin-bottom: 16px;
}

.history-image {
  width: 100%;
  height: 200px;
  border-radius: 4px;
}

.history-info {
  margin-top: 10px;
}

.history-prompt {
  font-size: 12px;
  color: #666;
  margin: 0 0 8px 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.history-time {
  font-size: 11px;
  color: #999;
}
</style>
