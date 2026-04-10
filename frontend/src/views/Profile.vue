<template>
  <div class="profile-container">
    <el-row :gutter="20">
      <el-col :span="8">
        <el-card>
          <template #header>
            <span>个人信息</span>
          </template>
          <div class="profile-info">
            <div class="avatar-section">
              <el-avatar :size="100" :icon="UserFilled" />
            </div>
            <el-descriptions :column="1" border>
              <el-descriptions-item label="用户名">
                {{ authStore.user?.username }}
              </el-descriptions-item>
              <el-descriptions-item label="邮箱">
                {{ authStore.user?.email || '未设置' }}
              </el-descriptions-item>
              <el-descriptions-item label="角色">
                <el-tag :type="authStore.isAdmin ? 'danger' : 'success'">
                  {{ authStore.isAdmin ? '管理员' : '普通用户' }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="注册时间">
                {{ formatDate(authStore.user?.createdAt) }}
              </el-descriptions-item>
            </el-descriptions>
          </div>
        </el-card>

        <el-card style="margin-top: 20px">
          <template #header>
            <span>使用统计</span>
          </template>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="总调用次数">
              {{ userStats.totalCalls || 0 }}
            </el-descriptions-item>
            <el-descriptions-item label="总Token消耗">
              {{ formatNumber(userStats.totalTokens) || 0 }}
            </el-descriptions-item>
            <el-descriptions-item label="本月费用">
              ¥{{ userStats.monthCost || 0 }}
            </el-descriptions-item>
            <el-descriptions-item label="剩余配额">
              {{ userStats.remainQuota || '无限制' }}
            </el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>

      <el-col :span="16">
        <el-card>
          <template #header>
            <span>修改密码</span>
          </template>
          <el-form :model="passwordForm" :rules="passwordRules" 
                   ref="passwordFormRef" label-width="100px" style="max-width: 500px">
            <el-form-item label="当前密码" prop="oldPassword">
              <el-input v-model="passwordForm.oldPassword" type="password" 
                       placeholder="请输入当前密码" show-password />
            </el-form-item>
            
            <el-form-item label="新密码" prop="newPassword">
              <el-input v-model="passwordForm.newPassword" type="password" 
                       placeholder="请输入新密码" show-password />
            </el-form-item>
            
            <el-form-item label="确认密码" prop="confirmPassword">
              <el-input v-model="passwordForm.confirmPassword" type="password" 
                       placeholder="请再次输入新密码" show-password />
            </el-form-item>
            
            <el-form-item>
              <el-button type="primary" @click="changePassword" :loading="changing">
                修改密码
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <el-card style="margin-top: 20px">
          <template #header>
            <span>API密钥管理</span>
          </template>
          <el-alert
            title="提示"
            type="info"
            description="您的API密钥用于程序化访问平台，请妥善保管，不要泄露给他人。"
            :closable="false"
            style="margin-bottom: 20px"
          />
          
          <div v-if="apiKey" class="api-key-display">
            <el-input v-model="apiKey" readonly>
              <template #append>
                <el-button @click="copyApiKey">复制</el-button>
                <el-button @click="regenerateApiKey" type="warning">重新生成</el-button>
              </template>
            </el-input>
          </div>
          <el-button v-else type="primary" @click="generateApiKey">
            生成API密钥
          </el-button>
        </el-card>

        <el-card style="margin-top: 20px">
          <template #header>
            <span>最近活动</span>
          </template>
          <el-timeline>
            <el-timeline-item
              v-for="activity in activities"
              :key="activity.id"
              :timestamp="formatDate(activity.createdAt)"
              placement="top">
              <el-card>
                <h4>{{ activity.action }}</h4>
                <p>{{ activity.detail }}</p>
              </el-card>
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { UserFilled } from '@element-plus/icons-vue'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const passwordFormRef = ref(null)
const changing = ref(false)
const apiKey = ref('')

const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const validateConfirmPassword = (rule, value, callback) => {
  if (value !== passwordForm.newPassword) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const passwordRules = {
  oldPassword: [
    { required: true, message: '请输入当前密码', trigger: 'blur' }
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能小于6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' }
  ]
}

const userStats = ref({
  totalCalls: 0,
  totalTokens: 0,
  monthCost: 0,
  remainQuota: null
})

const activities = ref([
  {
    id: 1,
    action: '登录系统',
    detail: '成功登录到平台',
    createdAt: new Date().toISOString()
  }
])

const changePassword = async () => {
  if (!passwordFormRef.value) return
  
  await passwordFormRef.value.validate(async (valid) => {
    if (valid) {
      changing.value = true
      try {
        // TODO: 调用后端API修改密码
        ElMessage.success('密码修改成功，请重新登录')
        authStore.logout()
        window.location.href = '/login'
      } catch (error) {
        ElMessage.error(error.response?.data?.message || '修改失败')
      } finally {
        changing.value = false
      }
    }
  })
}

const generateApiKey = () => {
  apiKey.value = 'sk-' + Math.random().toString(36).substring(2, 15) + 
                 Math.random().toString(36).substring(2, 15)
  ElMessage.success('API密钥生成成功')
}

const regenerateApiKey = () => {
  apiKey.value = 'sk-' + Math.random().toString(36).substring(2, 15) + 
                 Math.random().toString(36).substring(2, 15)
  ElMessage.success('API密钥已重新生成')
}

const copyApiKey = () => {
  navigator.clipboard.writeText(apiKey.value)
  ElMessage.success('已复制到剪贴板')
}

const formatNumber = (num) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + 'M'
  } else if (num >= 1000) {
    return (num / 1000).toFixed(2) + 'K'
  }
  return num
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

onMounted(() => {
  // 加载用户统计数据
})
</script>

<style scoped>
.profile-container {
  padding: 20px;
}

.profile-info {
  text-align: center;
}

.avatar-section {
  margin-bottom: 20px;
}

.api-key-display {
  margin-top: 10px;
}
</style>
