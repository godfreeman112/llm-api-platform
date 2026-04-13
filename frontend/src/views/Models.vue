<template>
  <div class="models-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>模型管理</span>
          <el-button type="primary" @click="showAddDialog">
            <el-icon><Plus /></el-icon>
            添加模型
          </el-button>
        </div>
      </template>

      <el-table :data="models" stripe v-loading="loading">
        <el-table-column prop="name" label="模型ID" width="150" />
        <el-table-column prop="apiEndpoint" label="API端点" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-switch v-model="row.status" active-value="active" inactive-value="inactive"
                      @change="updateStatus(row)" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="testModel(row)">测试</el-button>
            <el-button size="small" type="primary" @click="showEditDialog(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="deleteModel(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 添加/编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="600px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="120px">
        <el-form-item label="模型名称" prop="name">
          <el-input v-model="form.name" placeholder="例如: GPT-4" />
        </el-form-item>
        
        <el-form-item label="模型类型" prop="modelType">
          <el-radio-group v-model="form.modelType">
            <el-radio label="chat">对话模型</el-radio>
            <el-radio label="image">图像生成模型</el-radio>
            <el-radio label="video">视频生成模型</el-radio>
          </el-radio-group>
        </el-form-item>
        
        <el-form-item label="API端点" prop="apiEndpoint">
          <el-input v-model="form.apiEndpoint" placeholder="https://api.example.com/v1/chat/completions" />
        </el-form-item>
        
        <el-form-item label="API密钥" prop="apiKey">
          <el-input v-model="form.apiKey" type="password" placeholder="输入API密钥" show-password />
        </el-form-item>
        
        <el-form-item label="默认温度" prop="temperature" v-if="form.modelType === 'chat'">
          <el-slider v-model="form.temperature" :min="0" :max="2" :step="0.1" show-input />
        </el-form-item>
        
        <el-form-item label="最大Token" prop="maxTokens" v-if="form.modelType === 'chat'">
          <el-input-number v-model="form.maxTokens" :min="100" :max="100000" :step="100" />
        </el-form-item>
        
        <!-- 图像模型专用参数 -->
        <el-form-item label="图像尺寸" prop="imageSize" v-if="form.modelType === 'image'">
          <el-select v-model="form.imageSize" placeholder="选择图像尺寸" style="width: 100%">
            <el-option label="1024x1024" value="1024x1024" />
            <el-option label="2K" value="2K" />
            <el-option label="4K" value="4K" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="输出格式" prop="outputFormat" v-if="form.modelType === 'image'">
          <el-select v-model="form.outputFormat" placeholder="选择输出格式" style="width: 100%">
            <el-option label="PNG" value="png" />
            <el-option label="JPEG" value="jpeg" />
            <el-option label="WEBP" value="webp" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="响应格式" prop="responseFormat" v-if="form.modelType === 'image'">
          <el-radio-group v-model="form.responseFormat">
            <el-radio label="url">URL链接</el-radio>
            <el-radio label="b64_json">Base64编码</el-radio>
          </el-radio-group>
        </el-form-item>
        
        <!-- 视频模型专用参数 -->
        <el-form-item label="视频时长" prop="videoDuration" v-if="form.modelType === 'video'">
          <el-select v-model="form.videoDuration" placeholder="选择视频时长" style="width: 100%">
            <el-option label="5秒" value="5s" />
            <el-option label="10秒" value="10s" />
            <el-option label="15秒" value="15s" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="视频分辨率" prop="videoResolution" v-if="form.modelType === 'video'">
          <el-select v-model="form.videoResolution" placeholder="选择视频分辨率" style="width: 100%">
            <el-option label="720p" value="720p" />
            <el-option label="1080p" value="1080p" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="输出格式" prop="outputFormat" v-if="form.modelType === 'video'">
          <el-select v-model="form.outputFormat" placeholder="选择输出格式" style="width: 100%">
            <el-option label="MP4" value="mp4" />
            <el-option label="WEBM" value="webm" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="3" 
                   placeholder="模型描述信息" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { modelApi } from '../api'

const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const dialogTitle = ref('添加模型')
const formRef = ref(null)
const models = ref([])

const form = reactive({
  id: null,
  name: '',
  provider: 'volcengine',  // 固定为字节
  modelType: 'chat',
  apiEndpoint: '',
  apiKey: '',
  temperature: 0.7,
  maxTokens: 4096,
  imageSize: '1024x1024',
  outputFormat: 'png',
  responseFormat: 'url',
  videoDuration: '5s',
  videoResolution: '1080p',
  description: '',
  status: 'active'
})

const rules = {
  name: [{ required: true, message: '请输入模型名称', trigger: 'blur' }],
  apiEndpoint: [{ required: true, message: '请输入API端点', trigger: 'blur' }],
  apiKey: [{ required: true, message: '请输入API密钥', trigger: 'blur' }]
}

const loadModels = async () => {
  loading.value = true
  try {
    const data = await modelApi.getList()
    models.value = data
  } catch (error) {
    ElMessage.error('加载模型列表失败')
  } finally {
    loading.value = false
  }
}

const showAddDialog = () => {
  dialogTitle.value = '添加模型'
  resetForm()
  dialogVisible.value = true
}

const showEditDialog = (row) => {
  dialogTitle.value = '编辑模型'
  // 深拷贝，避免引用同一对象
  Object.assign(form, JSON.parse(JSON.stringify(row)))
  dialogVisible.value = true
}

const resetForm = () => {
  Object.assign(form, {
    id: null,
    name: '',
    provider: 'volcengine',  // 固定为字节
    modelType: 'chat',
    apiEndpoint: '',
    apiKey: '',
    temperature: 0.7,
    maxTokens: 4096,
    imageSize: '1024x1024',
    outputFormat: 'png',
    responseFormat: 'url',
    videoDuration: '5s',
    videoResolution: '1080p',
    description: '',
    status: 'active'
  })
  if (formRef.value) {
    formRef.value.clearValidate()
  }
}

const submitForm = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true
      try {
        if (form.id) {
          await modelApi.update(form.id, form)
          ElMessage.success('更新成功')
        } else {
          await modelApi.create(form)
          ElMessage.success('添加成功')
        }
        dialogVisible.value = false
        // 重新加载数据，确保数据一致性
        await loadModels()
      } catch (error) {
        ElMessage.error(error.response?.data?.message || '操作失败')
      } finally {
        submitting.value = false
      }
    }
  })
}

const updateStatus = async (row) => {
  try {
    await modelApi.update(row.id, { status: row.status })
    ElMessage.success('状态更新成功')
  } catch (error) {
    row.status = row.status === 'active' ? 'inactive' : 'active'
    ElMessage.error('状态更新失败')
  }
}

const testModel = async (row) => {
  try {
    await modelApi.test(row.id)
    ElMessage.success('连接测试成功')
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '连接测试失败')
  }
}

const deleteModel = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要删除模型 "${row.name}" 吗？`, '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await modelApi.delete(row.id)
    ElMessage.success('删除成功')
    loadModels()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

onMounted(() => {
  loadModels()
})
</script>

<style scoped>
.models-container {
  padding: 30px;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  min-height: 100vh;
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

:deep(.el-dialog) {
  background: rgba(30, 41, 59, 0.95) !important;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 20px !important;
}

:deep(.el-dialog__header) {
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  padding: 20px 24px;
}

:deep(.el-dialog__title) {
  color: #f1f5f9 !important;
  font-weight: 600;
  font-size: 18px;
}

:deep(.el-dialog__body) {
  padding: 24px;
}

:deep(.el-form-item__label) {
  color: #cbd5e1 !important;
  font-weight: 500;
}

:deep(.el-radio__label),
:deep(.el-checkbox__label) {
  color: #e2e8f0 !important;
}
</style>
