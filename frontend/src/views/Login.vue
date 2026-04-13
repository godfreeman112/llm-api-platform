<template>
  <div class="login-container">
    <el-card class="login-card">
      <template #header>
        <div class="card-header">
          <h2>管理员登录</h2>
          <p>请输入管理员账号和密码</p>
        </div>
      </template>
      
      <el-form :model="form" :rules="rules" ref="loginFormRef" label-width="80px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="请输入管理员用户名" prefix-icon="User" />
        </el-form-item>
        
        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" placeholder="请输入密码" 
                    prefix-icon="Lock" @keyup.enter="handleLogin" show-password />
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" @click="handleLogin" :loading="loading" style="width: 100%">
            登录
          </el-button>
        </el-form-item>
        
        <el-divider>
          <span style="color: #909399; font-size: 12px">或者</span>
        </el-divider>
        
        <el-form-item>
          <el-button @click="goToHome" style="width: 100%">
            以默认用户身份访问
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const loginFormRef = ref(null)
const loading = ref(false)

const form = reactive({
  username: '',
  password: ''
})

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能小于6位', trigger: 'blur' }
  ]
}

const handleLogin = async () => {
  if (!loginFormRef.value) return
  
  await loginFormRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true
      const result = await authStore.login(form.username, form.password)
      loading.value = false
      
      if (result.success) {
        ElMessage.success('登录成功')
        router.push('/')
      } else {
        ElMessage.error(result.message)
      }
    }
  })
}

const goToHome = async () => {
  // 如果已经自动登录，直接跳转
  if (authStore.isAuthenticated && authStore.isAutoLogin) {
    router.push('/')
    return
  }
  
  // 否则执行自动登录
  loading.value = true
  const result = await authStore.autoLogin()
  loading.value = false
  
  if (result.success) {
    ElMessage.success('已以默认用户身份登录')
    router.push('/')
  } else {
    ElMessage.error(result.message)
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
  position: relative;
  overflow: hidden;
}

/* 背景装饰 */
.login-container::before {
  content: '';
  position: absolute;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(102, 126, 234, 0.15) 0%, transparent 70%);
  top: -200px;
  right: -200px;
  animation: float 8s ease-in-out infinite;
}

.login-container::after {
  content: '';
  position: absolute;
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(118, 75, 162, 0.15) 0%, transparent 70%);
  bottom: -150px;
  left: -150px;
  animation: float 10s ease-in-out infinite reverse;
}

@keyframes float {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  50% {
    transform: translate(30px, -30px) scale(1.1);
  }
}

.login-card {
  width: 450px;
  background: rgba(30, 41, 59, 0.6) !important;
  backdrop-filter: blur(20px) !important;
  border: 1px solid rgba(148, 163, 184, 0.1) !important;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3), 0 0 40px rgba(102, 126, 234, 0.1) !important;
  border-radius: 24px !important;
  position: relative;
  z-index: 1;
  animation: slideUp 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card-header {
  text-align: center;
  padding: 20px 0;
}

.card-header h2 {
  margin: 0 0 10px 0;
  color: #f1f5f9;
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.5px;
}

.card-header p {
  margin: 0;
  color: #94a3b8;
  font-size: 14px;
  font-weight: 400;
}

/* 表单样式优化 */
:deep(.el-form-item__label) {
  color: #cbd5e1 !important;
  font-weight: 500;
}

:deep(.el-input__wrapper) {
  background: rgba(15, 23, 42, 0.6) !important;
  border: 1px solid rgba(148, 163, 184, 0.15) !important;
  box-shadow: none !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

:deep(.el-input__wrapper:hover) {
  border-color: rgba(102, 126, 234, 0.5) !important;
  background: rgba(15, 23, 42, 0.8) !important;
}

:deep(.el-input__wrapper.is-focus) {
  border-color: #667eea !important;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15) !important;
}

:deep(.el-button--primary) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  border: none !important;
  font-weight: 600 !important;
  letter-spacing: 0.5px;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3) !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

:deep(.el-button--primary:hover) {
  transform: translateY(-2px) !important;
  box-shadow: 0 6px 25px rgba(102, 126, 234, 0.5) !important;
}

:deep(.el-button:not(.el-button--primary)) {
  background: rgba(148, 163, 184, 0.1) !important;
  border: 1px solid rgba(148, 163, 184, 0.2) !important;
  color: #cbd5e1 !important;
  transition: all 0.3s ease !important;
}

:deep(.el-button:not(.el-button--primary):hover) {
  background: rgba(148, 163, 184, 0.2) !important;
  border-color: rgba(148, 163, 184, 0.3) !important;
  transform: translateY(-1px);
}

:deep(.el-divider__text) {
  background: rgba(30, 41, 59, 0.6) !important;
  color: #94a3b8 !important;
}

:deep(.el-divider) {
  border-color: rgba(148, 163, 184, 0.1) !important;
}
</style>
