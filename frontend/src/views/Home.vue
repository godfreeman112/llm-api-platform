<template>
  <div class="home-container">
    <el-container>
      <!-- 侧边栏 -->
      <el-aside width="200px">
        <div class="logo">
          <h3>API平台</h3>
        </div>
        <el-menu :default-active="activeMenu" router>
          <el-menu-item index="/">
            <el-icon><HomeFilled /></el-icon>
            <span>首页</span>
          </el-menu-item>
          <el-menu-item index="/chat">
            <el-icon><ChatDotRound /></el-icon>
            <span>对话测试</span>
          </el-menu-item>
          <el-menu-item index="/image-generate">
            <el-icon><Picture /></el-icon>
            <span>图像生成</span>
          </el-menu-item>
          <el-menu-item v-if="authStore.isAdmin" index="/models">
            <el-icon><Cpu /></el-icon>
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
          <el-menu-item index="/profile">
            <el-icon><Setting /></el-icon>
            <span>个人中心</span>
          </el-menu-item>
        </el-menu>
      </el-aside>

      <!-- 主内容区 -->
      <el-container>
        <el-header>
          <div class="header-content">
            <h2>欢迎使用大模型API平台</h2>
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

          <el-card style="margin-top: 20px">
            <template #header>
              <div class="card-header">
                <span>可用模型</span>
              </div>
            </template>
            <el-table :data="models" stripe>
              <el-table-column prop="name" label="模型名称" />
              <el-table-column prop="provider" label="提供商" />
              <el-table-column prop="status" label="状态">
                <template #default="{ row }">
                  <el-tag :type="row.status === 'active' ? 'success' : 'info'">
                    {{ row.status === 'active' ? '可用' : '禁用' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作">
                <template #default="{ row }">
                  <el-button size="small" type="primary" @click="selectModel(row)">
                    使用此模型
                  </el-button>
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
  router.push({ path: '/chat', query: { model: model.id } })
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
}

.el-aside {
  background-color: #304156;
  color: #fff;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #2b3a4c;
}

.logo h3 {
  margin: 0;
  color: #fff;
  font-size: 18px;
}

.el-menu {
  border-right: none;
  background-color: #304156;
}

:deep(.el-menu-item) {
  color: #bfcbd9;
}

:deep(.el-menu-item:hover),
:deep(.el-menu-item.is-active) {
  background-color: #263445 !important;
  color: #409eff !important;
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
  align-items: center;
  width: 100%;
}

.header-content h2 {
  margin: 0;
  font-size: 18px;
  color: #303133;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.stat-card {
  margin-bottom: 20px;
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 15px;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 5px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
