<template>
  <div class="video-generate-container">
    <el-card class="config-card">
      <template #header>
        <div class="card-header">
          <span>视频生成</span>
          <el-tag type="warning" size="small">异步任务，需要等待</el-tag>
        </div>
      </template>

      <el-form :model="form" label-width="120px">
        <el-form-item label="选择模型">
          <el-select v-model="form.modelId" placeholder="选择视频生成模型" style="width: 100%" @change="onModelChange">
            <el-option
              v-for="model in videoModels"
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
            placeholder="请输入视频描述提示词，例如：一个年轻女性在樱花树下跳芭蕾舞，电影级画面，配合轻柔的钢琴曲..."
            maxlength="800"
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
                :type="ref.type === 'image' ? 'success' : ref.type === 'video' ? 'primary' : 'warning'"
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

        <!-- 参考图片（默认显示，Seedance 2.0 支持） -->
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
              <div class="el-upload__tip">支持 jpg/png，最多9张，可选：上传参考图进行图生视频</div>
            </template>
          </el-upload>
        </el-form-item>

        <!-- 参考视频（默认显示） -->
        <el-form-item label="参考视频" v-if="form.modelConfig?.supportVideoInput !== false">
          <el-upload
            v-model:file-list="videoFileList"
            class="upload-demo"
            :auto-upload="false"
            :on-change="handleVideoChange"
            :on-remove="handleVideoRemove"
            :limit="3"
            accept="video/*"
            list-type="picture-card"
            multiple
          >
            <el-icon><VideoCamera /></el-icon>
            <template #tip>
              <div class="el-upload__tip">支持 mp4/mov，最多3段，可选：上传参考视频学习镜头语言</div>
            </template>
          </el-upload>
        </el-form-item>

        <!-- 参考音频（默认显示） -->
        <el-form-item label="参考音频" v-if="form.modelConfig?.supportAudioInput !== false">
          <el-upload
            v-model:file-list="audioFileList"
            class="upload-demo"
            :auto-upload="false"
            :on-change="handleAudioChange"
            :on-remove="handleAudioRemove"
            :limit="3"
            accept="audio/*"
            multiple
            list-type="text"
          >
            <el-button type="primary">
              <el-icon><Headset /></el-icon>
              选择音频
            </el-button>
            <template #tip>
              <div class="el-upload__tip">支持 mp3/wav，最多3段，可选：上传音频实现声画同步</div>
            </template>
          </el-upload>
        </el-form-item>

        <el-form-item label="视频时长" v-if="form.modelConfig">
          <el-select v-model="form.duration" placeholder="选择视频时长" style="width: 100%">
            <el-option label="5秒" value="5s" />
            <el-option label="10秒" value="10s" />
            <el-option label="15秒" value="15s" />
          </el-select>
        </el-form-item>

        <el-form-item label="视频分辨率" v-if="form.modelConfig">
          <el-select v-model="form.resolution" placeholder="选择视频分辨率" style="width: 100%">
            <el-option label="720p" value="720p" />
            <el-option label="1080p" value="1080p" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            @click="generateVideo"
            :loading="loading"
            :disabled="!canGenerate"
            size="large"
          >
            {{ loading ? '生成中...' : '生成视频' }}
          </el-button>
          <el-button @click="resetForm" :disabled="loading">重置</el-button>
        </el-form-item>

        <el-alert
          v-if="loading"
          title="🎬 视频生成中，请耐心等待"
          type="info"
          :closable="false"
          show-icon
        >
          <template #default>
            <div style="line-height: 1.8;">
              <p>视频生成通常需要 <strong>2-5 分钟</strong>，请勿关闭页面。</p>
              <p>当前进度：<strong>{{ progressText }}</strong></p>
              <p style="color: #909399; font-size: 13px; margin-top: 8px;">
                💡 提示：生成完成后，视频会自动显示在下方“生成结果”区域
              </p>
            </div>
          </template>
        </el-alert>

        <el-alert
          v-if="!loading && generatedVideo"
          title="✅ 视频生成完成！"
          type="success"
          :closable="false"
          show-icon
          style="margin-top: 15px;"
        >
          <template #default>
            您的视频已生成成功，请在下方“生成结果”区域查看、播放或下载
          </template>
        </el-alert>
      </el-form>
    </el-card>

    <!-- 生成结果 -->
    <el-card v-if="generatedVideo" class="result-card" id="result-section">
      <template #header>
        <div class="card-header">
          <span>🎥 生成结果</span>
          <div class="result-actions">
            <el-tag type="success" size="large">✨ 生成成功</el-tag>
            <el-button type="primary" size="default" @click="downloadVideo">
              <el-icon><Download /></el-icon>
              下载视频
            </el-button>
            <el-button size="default" @click="copyVideoUrl">
              <el-icon><Link /></el-icon>
              复制链接
            </el-button>
          </div>
        </div>
      </template>

      <div class="video-result">
        <div class="video-player-wrapper">
          <video
            :src="generatedVideo"
            controls
            class="generated-video"
            autoplay
            crossorigin="anonymous"
          >
            <source :src="generatedVideo" type="video/mp4" />
            您的浏览器不支持视频播放，请尝试下载后播放
          </video>
        </div>
        
        <!-- 视频无法预览时的提示 -->
        <el-alert
          v-if="!canPreview"
          title="⚠️ 视频无法在线预览"
          type="warning"
          :closable="false"
          show-icon
          style="margin-top: 15px;"
        >
          <template #default>
            由于视频URL可能受防盗链保护，无法直接预览。请点击"下载视频"按钮保存到本地后播放。
          </template>
        </el-alert>
      </div>

      <div class="usage-info">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="使用模型">{{ selectedModel?.name }}</el-descriptions-item>
          <el-descriptions-item label="视频时长">{{ form.duration }}</el-descriptions-item>
          <el-descriptions-item label="视频分辨率">{{ form.resolution }}</el-descriptions-item>
          <el-descriptions-item label="生成时间">{{ generationTime }}秒</el-descriptions-item>
        </el-descriptions>
      </div>
    </el-card>

    <!-- 生成历史 -->
    <el-card class="history-card" v-if="history.length > 0">
      <template #header>
        <span>生成历史</span>
      </template>

      <el-row :gutter="16">
        <el-col :span="8" v-for="(item, index) in history" :key="index">
          <el-card shadow="hover" class="history-item">
            <video
              :src="item.videoUrl"
              class="history-video"
              controls
              preload="metadata"
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
import { modelApi, videoApi } from '../api'
import { Download, Link, Plus, Close, VideoCamera, Headset } from '@element-plus/icons-vue'

const route = useRoute()

const loading = ref(false)
const generatedVideo = ref(null)
const generationTime = ref(0)
const history = ref([])
const videoModels = ref([])
const selectedModel = ref(null)
const progressText = ref('提交任务中...')

// 多模态文件管理
const imageFileList = ref([])
const videoFileList = ref([])
const audioFileList = ref([])
const previewImages = ref([])
const previewVideos = ref([])
const previewAudios = ref([])

const form = ref({
  modelId: '',
  prompt: '',
  images: [],  // 参考图片数组（Base64）
  videos: [],  // 参考视频数组（Base64）
  audios: [],  // 参考音频数组（Base64）
  duration: '5s',
  resolution: '1080p',
  modelConfig: {
    supportImageInput: true,   // 默认支持图片输入
    supportVideoInput: false,  // 默认不支持视频输入
    supportAudioInput: false   // 默认不支持音频输入
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
  
  // 视频文件
  videoFileList.value.forEach((file, index) => {
    files.push({
      type: 'video',
      icon: '🎬',
      name: file.name || `视频${index + 1}`,
      index: index,
      category: 'videos'
    })
  })
  
  // 音频文件
  audioFileList.value.forEach((file, index) => {
    files.push({
      type: 'audio',
      icon: '🎵',
      name: file.name || `音频${index + 1}`,
      index: index,
      category: 'audios'
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
  } else if (ref.type === 'video') {
    refText = `[参考视频${ref.index + 1}]`
  } else if (ref.type === 'audio') {
    refText = `[参考音频${ref.index + 1}]`
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
  } else if (ref.category === 'videos') {
    // 移除视频
    videoFileList.value.splice(ref.index, 1)
    form.value.videos.splice(ref.index, 1)
  } else if (ref.category === 'audios') {
    // 移除音频
    audioFileList.value.splice(ref.index, 1)
    form.value.audios.splice(ref.index, 1)
  }
  ElMessage.success(`已移除: ${ref.name}`)
}

const loadVideoModels = async () => {
  try {
    const data = await modelApi.getList()
    videoModels.value = data.filter(m => m.status === 'active' && m.modelType === 'video')
    
    if (videoModels.value.length > 0 && !form.value.modelId) {
      form.value.modelId = videoModels.value[0].id
      onModelChange()
    }
  } catch (error) {
    ElMessage.error('加载模型列表失败')
  }
}

const onModelChange = () => {
  selectedModel.value = videoModels.value.find(m => m.id === form.value.modelId)
  if (selectedModel.value) {
    form.value.duration = selectedModel.value.videoDuration || '5s'
    form.value.resolution = selectedModel.value.videoResolution || '1080p'
    // 设置模型配置，控制上传组件显示
    // 注意：图片/视频/音频输入都默认支持（除非明确设置为 false）
    form.value.modelConfig = {
      supportImageInput: selectedModel.value.supportImageInput !== false,  // 默认 true
      supportVideoInput: selectedModel.value.supportVideoInput !== false,  // 默认 true
      supportAudioInput: selectedModel.value.supportAudioInput !== false   // 默认 true
    }
  } else {
    // 如果没有找到模型，使用默认配置
    form.value.modelConfig = {
      supportImageInput: true,
      supportVideoInput: true,
      supportAudioInput: true
    }
  }
  // 清空所有文件
  clearAllFiles()
}

// 清空所有文件
const clearAllFiles = () => {
  imageFileList.value = []
  videoFileList.value = []
  audioFileList.value = []
  previewImages.value = []
  previewVideos.value = []
  previewAudios.value = []
  form.value.images = []
  form.value.videos = []
  form.value.audios = []
}

// ========== 图片处理 ==========
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

// 阻止拖拽到提示词框
const onPromptDrop = (e) => {
  e.preventDefault()
  ElMessage.warning('请将图片拖拽到下方的“参考图片”区域')
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

// ========== 视频处理 ==========
const handleVideoChange = (file, fileList) => {
  // 先用 ObjectURL 作为临时预览
  const tempUrl = URL.createObjectURL(file.raw)
  file.url = tempUrl
  
  // 异步转换 Base64
  const reader = new FileReader()
  reader.onload = (e) => {
    const base64 = e.target.result
    // 更新 file.url 为 Base64
    file.url = base64
    form.value.videos.push(base64)
    console.log(`视频已转换: ${file.name}`)
  }
  reader.onerror = () => {
    ElMessage.error(`视频转换失败: ${file.name}`)
  }
  reader.readAsDataURL(file.raw)
}

const handleVideoRemove = (file, fileList) => {
  const index = form.value.videos.findIndex(base64 => base64 === file.url)
  if (index !== -1) {
    form.value.videos.splice(index, 1)
    console.log('移除视频，索引:', index)
  }
}

// ========== 音频处理 ==========
const handleAudioChange = (file, fileList) => {
  // 音频不需要预览，只需转换 Base64
  const reader = new FileReader()
  reader.onload = (e) => {
    const base64 = e.target.result
    form.value.audios.push(base64)
    console.log(`音频已转换: ${file.name}`)
  }
  reader.onerror = () => {
    ElMessage.error(`音频转换失败: ${file.name}`)
  }
  reader.readAsDataURL(file.raw)
}

const handleAudioRemove = (file, fileList) => {
  // 音频文件列表使用 Element Plus 的默认行为
  // form.value.audios 由 handleAudioChange 维护，需要手动同步
  // 由于 Base64 是异步生成的，移除时从末尾删除
  if (form.value.audios.length > 0) {
    form.value.audios.pop()
    console.log('移除音频，剩余:', form.value.audios.length)
  }
}

const generateVideo = async () => {
  if (!canGenerate.value) return

  loading.value = true
  progressText.value = '提交任务中...'
  const startTime = Date.now()

  try {
    // 第一步：提交视频生成任务
    const taskResult = await videoApi.submitTask({
      model: form.value.modelId,
      prompt: form.value.prompt.trim(),
      images: form.value.images,  // 参考图片数组
      videos: form.value.videos,  // 参考视频数组
      audios: form.value.audios,  // 参考音频数组
      duration: form.value.duration,
      resolution: form.value.resolution
    })

    const taskId = taskResult.taskId
    progressText.value = '任务已提交，等待生成中...'

    // 第二步：轮询任务状态
    let attempts = 0
    const maxAttempts = 60 // 最多轮询60次（约5分钟）
    let videoUrl = null

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)) // 每5秒查询一次
      
      attempts++
      progressText.value = `生成中... (尝试 ${attempts}/${maxAttempts})`

      const statusResult = await videoApi.checkStatus(taskId)
      
      console.log('任务状态结果:', statusResult)
      
      if (statusResult.status === 'succeeded') {
        videoUrl = statusResult.videoUrl
        console.log('获取到视频URL:', videoUrl)
        
        if (!videoUrl) {
          console.error('任务成功但videoUrl为空，完整响应:', statusResult)
          throw new Error('任务已完成，但未能获取视频URL。请查看控制台日志或联系管理员。')
        }
        
        break
      } else if (statusResult.status === 'failed') {
        throw new Error(statusResult.error || '视频生成失败')
      }
      // status === 'processing' 或 'queued' 时继续等待
    }

    if (!videoUrl) {
      throw new Error('视频生成超时，请稍后重试')
    }

    // 第三步：显示结果
    generatedVideo.value = videoUrl
    generationTime.value = ((Date.now() - startTime) / 1000).toFixed(2)
    progressText.value = '生成完成！'

    // 添加到历史记录
    history.value.unshift({
      videoUrl: videoUrl,
      prompt: form.value.prompt,
      time: new Date().toLocaleString(),
      duration: form.value.duration
    })

    ElMessage.success('🎉 视频生成成功！')
    
    // 自动滚动到结果区域
    setTimeout(() => {
      const resultSection = document.getElementById('result-section')
      if (resultSection) {
        resultSection.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 100)
  } catch (error) {
    ElMessage.error(error.response?.data?.message || error.message || '视频生成失败')
    console.error('生成视频错误:', error)
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  // 保留 modelConfig，避免上传区域消失
  const currentModelConfig = form.value.modelConfig || {
    supportImageInput: true,
    supportVideoInput: false,
    supportAudioInput: false
  }
  
  form.value = {
    modelId: form.value.modelId,
    prompt: '',
    images: [],
    videos: [],
    audios: [],
    duration: form.value.duration,
    resolution: form.value.resolution,
    modelConfig: currentModelConfig
  }
  generatedVideo.value = null
  generationTime.value = 0
  clearAllFiles()
}

const downloadVideo = () => {
  if (!generatedVideo.value) return

  const link = document.createElement('a')
  link.href = generatedVideo.value
  link.download = `generated_${Date.now()}.mp4`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  ElMessage.success('视频开始下载')
}

const copyVideoUrl = () => {
  if (!generatedVideo.value) return
  
  navigator.clipboard.writeText(generatedVideo.value).then(() => {
    ElMessage.success('视频链接已复制到剪贴板')
  }).catch(() => {
    ElMessage.error('复制失败，请手动复制')
  })
}

onMounted(() => {
  loadVideoModels()
})

// 监听路由参数，自动选择模型
watch(() => route.query.model, (newModelId) => {
  if (newModelId && videoModels.value.length > 0) {
    const model = videoModels.value.find(m => m.id === parseInt(newModelId))
    if (model) {
      form.value.modelId = model.id
      onModelChange()
    }
  }
})
</script>

<style scoped>
.video-generate-container {
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

.prompt-tip {
  margin-top: 8px;
  font-size: 13px;
  color: #909399;
}

/* 参考文件引用栏 */
.reference-files-bar {
  margin-top: 12px;
  padding: 12px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8eef5 100%);
  border-radius: 8px;
  border: 1px solid #dcdfe6;
}

.reference-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  margin-bottom: 8px;
}

.reference-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.reference-tag {
  cursor: pointer;
  transition: all 0.3s;
  user-select: none;
}

.reference-tag:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.reference-tag:active {
  transform: translateY(0);
}

.reference-hint {
  font-size: 12px;
  color: #909399;
  font-style: italic;
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
  margin-top: 12px;
}

.preview-item {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid #e6e6e6;
  transition: all 0.3s;
}

.preview-item:hover {
  border-color: #409eff;
  box-shadow: 0 2px 12px rgba(64, 158, 255, 0.3);
}

.preview-image {
  width: 100%;
  height: 150px;
  object-fit: cover;
  display: block;
}

.video-item .preview-video {
  width: 100%;
  height: 150px;
  object-fit: cover;
  display: block;
}

.remove-btn {
  position: absolute;
  top: 5px;
  right: 5px;
  opacity: 0;
  transition: opacity 0.3s;
}

.preview-item:hover .remove-btn {
  opacity: 1;
}

.audio-list {
  margin-top: 12px;
}

.audio-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  background: #f5f7fa;
  border-radius: 4px;
  margin-bottom: 8px;
}

.audio-player {
  flex: 1;
  height: 40px;
}

.video-result {
  text-align: center;
  margin: 20px 0;
}

.generated-video {
  max-width: 100%;
  max-height: 600px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
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

.history-video {
  width: 100%;
  height: 200px;
  border-radius: 4px;
  background: #000;
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
