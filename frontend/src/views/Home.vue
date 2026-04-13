<template>
  <div class="home-container">
    <el-container>
      <!-- 侧边栏 -->
      <el-aside width="200px">
        <div class="logo">
          <h3>API平台</h3>
        </div>
        <el-menu :default-active="activeMenu" :default-openeds="['models']" router>
          <el-menu-item index="/">
            <el-icon><HomeFilled /></el-icon>
            <span>首页</span>
          </el-menu-item>
          
          <!-- 动态模型菜单 -->
          <el-sub-menu v-if="models.length > 0" index="models">
            <template #title>
              <el-icon><Cpu /></el-icon>
              <span>大模型</span>
            </template>
            <el-menu-item 
              v-for="model in models" 
              :key="model.id"
              :index="getModelRoute(model)"
              @click="selectModel(model)"
            >
              <el-icon>
                <ChatDotRound v-if="model.modelType === 'chat'" />
                <Picture v-else-if="model.modelType === 'image'" />
                <VideoCamera v-else />
              </el-icon>
              <span>{{ model.description || model.name }}</span>
            </el-menu-item>
          </el-sub-menu>
          
          <el-menu-item v-if="authStore.isAdmin" index="/models">
            <el-icon><Setting /></el-icon>
            <span>模型管理</span>
          </el-menu-item>
          <el-menu-item v-if="authStore.isAdmin" index="/users">
            <el-icon><User /></el-icon>
            <span>用户管理</span>
          </el-menu-item>
          <el-menu-item v-if="authStore.isAdmin" index="/monitor">
            <el-icon><DataLine /></el-icon>
            <span>使用监控</span>
          </el-menu-item>
          <el-menu-item v-if="authStore.isAdmin" index="/profile">
            <el-icon><Setting /></el-icon>
            <span>个人中心</span>
          </el-menu-item>
        </el-menu>
      </el-aside>

      <!-- 主内容区 -->
      <el-container>
        <el-header>
          <div class="header-content">
            <h2>欢迎使用字节大模型平台</h2>
            <div class="user-info">
              <span>{{ authStore.user?.username }}</span>
              <el-tag size="small" :type="authStore.isAdmin ? 'danger' : 'success'">
                {{ authStore.isAdmin ? '管理员' : '普通用户' }}
              </el-tag>
              <el-button type="danger" size="small" @click="handleLogout">退出</el-button>
            </div>
          </div>
        </el-header>

        <el-main>
          <!-- 仅管理员显示统计信息 -->
          <template v-if="authStore.isAdmin">
            <el-row :gutter="20">
              <el-col :span="6">
                <el-card class="stat-card">
                  <div class="stat-content">
                    <div class="stat-icon" style="background: #409eff">
                      <el-icon size="30"><ChatDotRound /></el-icon>
                    </div>
                    <div class="stat-info">
                      <div class="stat-value">{{ stats.todayCalls || 0 }}</div>
                      <div class="stat-label">今日调用</div>
                    </div>
                  </div>
                </el-card>
              </el-col>
              
              <el-col :span="6">
                <el-card class="stat-card">
                  <div class="stat-content">
                    <div class="stat-icon" style="background: #67c23a">
                      <el-icon size="30"><Document /></el-icon>
                    </div>
                    <div class="stat-info">
                      <div class="stat-value">{{ stats.todayTokens || 0 }}</div>
                      <div class="stat-label">今日Token</div>
                    </div>
                  </div>
                </el-card>
              </el-col>
              
              <el-col :span="6">
                <el-card class="stat-card">
                  <div class="stat-content">
                    <div class="stat-icon" style="background: #e6a23c">
                      <el-icon size="30"><Coin /></el-icon>
                    </div>
                    <div class="stat-info">
                      <div class="stat-value">¥{{ stats.monthCost || 0 }}</div>
                      <div class="stat-label">本月费用</div>
                    </div>
                  </div>
                </el-card>
              </el-col>
              
              <el-col :span="6">
                <el-card class="stat-card">
                  <div class="stat-content">
                    <div class="stat-icon" style="background: #f56c6c">
                      <el-icon size="30"><TrendCharts /></el-icon>
                    </div>
                    <div class="stat-info">
                      <div class="stat-value">{{ stats.remainQuota || '∞' }}</div>
                      <div class="stat-label">剩余配额</div>
                    </div>
                  </div>
                </el-card>
              </el-col>
            </el-row>

            <el-card style="margin-top: 20px">
              <template #header>
                <div class="card-header">
                  <span>快速开始</span>
                </div>
              </template>
              <el-steps :active="1" align-center>
                <el-step title="选择模型" description="在模型管理中配置API密钥" />
                <el-step title="开始对话" description="在对话测试中体验模型能力" />
                <el-step title="查看统计" description="在使用监控中查看使用情况" />
              </el-steps>
            </el-card>
          </template>

          <!-- 所有用户都显示可用模型 -->
          <el-card :style="{ marginTop: authStore.isAdmin ? '20px' : '0' }">
            <template #header>
              <div class="card-header">
                <span>可用模型</span>
              </div>
            </template>
            <el-table :data="models" stripe>
              <el-table-column prop="name" label="模型ID" />
              <el-table-column prop="status" label="状态">
                <template #default="{ row }">
                  <el-tag :type="row.status === 'active' ? 'success' : 'info'">
                    {{ row.status === 'active' ? '可用' : '禁用' }}
                  </el-tag>
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../stores/auth'
import { modelApi } from '../api'

const router = useRouter()
const authStore = useAuthStore()

const activeMenu = computed(() => router.currentRoute.value.path)

const stats = ref({
  todayCalls: 0,
  todayTokens: 0,
  monthCost: 0,
  remainQuota: null
})

const models = ref([])

const loadModels = async () => {
  try {
    const data = await modelApi.getList()
    models.value = data.filter(m => m.status === 'active')
  } catch (error) {
    console.error('加载模型失败', error)
  }
}

const selectModel = (model) => {
  // 根据模型类型跳转到不同页面
  let path = '/chat'
  if (model.modelType === 'image') {
    path = '/image-generate'
  } else if (model.modelType === 'video') {
    path = '/video-generate'
  }
  router.push({ path, query: { model: model.id } })
}

const getModelRoute = (model) => {
  // 返回模型对应的路由路径，用于菜单高亮
  if (model.modelType === 'image') return '/image-generate'
  if (model.modelType === 'video') return '/video-generate'
  return '/chat'
}

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
  ElMessage.success('已退出登录')
}

onMounted(() => {
  loadModels()
})
</script>

<style scoped>
.home-container {
  height: 100vh;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  position: relative;
}

/* 背景装饰 */
.home-container::before {
  content: '';
  position: absolute;
  width: 800px;
  height: 800px;
  background: radial-gradient(circle, rgba(102, 126, 234, 0.08) 0%, transparent 70%);
  top: -300px;
  right: -300px;
  pointer-events: none;
}

.el-aside {
  background: rgba(15, 23, 42, 0.95) !important;
  backdrop-filter: blur(20px);
  color: #fff;
  border-right: 1px solid rgba(148, 163, 184, 0.1);
  box-shadow: 4px 0 20px rgba(0, 0, 0, 0.2);
}

.logo {
  height: 70px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%);
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  position: relative;
  overflow: hidden;
}

.logo::before {
  content: '';
  position: absolute;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.05), transparent);
  animation: shimmer 3s infinite;
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.logo h3 {
  margin: 0;
  color: #fff;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 1px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  position: relative;
  z-index: 1;
}

.el-menu {
  border-right: none;
  background: transparent !important;
  padding: 10px 0;
}

:deep(.el-menu-item) {
  color: #94a3b8;
  margin: 4px 12px;
  border-radius: 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-weight: 500;
}

:deep(.el-menu-item:hover) {
  background: rgba(102, 126, 234, 0.15) !important;
  color: #667eea !important;
  transform: translateX(4px);
}

:deep(.el-menu-item.is-active) {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%) !important;
  color: #667eea !important;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.2);
}

/* 大模型子菜单样式优化 */
:deep(.el-sub-menu__title) {
  color: #f1f5f9 !important;
  background: rgba(102, 126, 234, 0.1) !important;
  margin: 4px 12px;
  border-radius: 12px;
  font-weight: 600;
  transition: all 0.3s ease;
}

:deep(.el-sub-menu__title:hover) {
  background: rgba(102, 126, 234, 0.2) !important;
  transform: translateX(4px);
}

:deep(.el-menu--inline .el-menu-item) {
  background: transparent !important;
  color: #cbd5e1 !important;
  padding-left: 50px !important;
  font-size: 13px;
  margin: 2px 12px;
  border-radius: 10px;
}

:deep(.el-menu--inline .el-menu-item:hover) {
  background: rgba(102, 126, 234, 0.15) !important;
  color: #667eea !important;
}

:deep(.el-menu--inline .el-menu-item.is-active) {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%) !important;
  color: #667eea !important;
  box-shadow: 0 2px 10px rgba(102, 126, 234, 0.15);
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
  align-items: center;
  width: 100%;
}

.header-content h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #f1f5f9;
  letter-spacing: 0.5px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-info span {
  color: #cbd5e1;
  font-weight: 500;
}

.stat-card {
  margin-bottom: 20px;
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

.stat-content {
  display: flex;
  align-items: center;
  gap: 15px;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
}

.stat-card:hover .stat-icon {
  transform: scale(1.1) rotate(5deg);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.3);
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #f1f5f9;
  letter-spacing: -0.5px;
}

.stat-label {
  font-size: 13px;
  color: #94a3b8;
  margin-top: 5px;
  font-weight: 500;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

:deep(.el-steps) {
  padding: 20px 0;
}

:deep(.el-step__title) {
  color: #f1f5f9 !important;
  font-weight: 600;
}

:deep(.el-step__description) {
  color: #94a3b8 !important;
}

:deep(.el-table) {
  --el-table-border-color: rgba(148, 163, 184, 0.1);
  --el-table-header-bg-color: rgba(15, 23, 42, 0.6);
  --el-table-tr-hover-bg-color: rgba(102, 126, 234, 0.1);
}

:deep(.el-table th) {
  color: #cbd5e1 !important;
  font-weight: 600;
  background: rgba(15, 23, 42, 0.6) !important;
}

:deep(.el-table td) {
  color: #e2e8f0 !important;
  background: rgba(15, 23, 42, 0.4) !important;
}
</style>
