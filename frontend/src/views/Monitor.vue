<template>
  <div class="monitor-container">
    <el-row :gutter="20">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background: #409eff">
              <el-icon size="30"><ChatDotRound /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.totalCalls || 0 }}</div>
              <div class="stat-label">总调用次数</div>
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
              <div class="stat-value">{{ formatNumber(stats.totalTokens) || 0 }}</div>
              <div class="stat-label">总Token消耗</div>
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
              <div class="stat-value">¥{{ stats.totalCost || 0 }}</div>
              <div class="stat-label">总费用</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background: #f56c6c">
              <el-icon size="30"><User /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.activeUsers || 0 }}</div>
              <div class="stat-label">活跃用户</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card style="margin-top: 20px">
      <template #header>
        <div class="card-header">
          <span>使用趋势</span>
          <el-radio-group v-model="period" size="small" @change="loadUsageTrend">
            <el-radio-button label="7d">近7天</el-radio-button>
            <el-radio-button label="30d">近30天</el-radio-button>
            <el-radio-button label="90d">近90天</el-radio-button>
          </el-radio-group>
        </div>
      </template>
      <div ref="trendChartRef" style="height: 300px"></div>
    </el-card>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>模型使用统计</span>
          </template>
          <div ref="modelChartRef" style="height: 300px"></div>
        </el-card>
      </el-col>
      
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>用户使用情况</span>
          </template>
          <el-table :data="userStats" stripe max-height="300">
            <el-table-column prop="username" label="用户名" />
            <el-table-column prop="calls" label="调用次数" />
            <el-table-column prop="tokens" label="Token数" />
            <el-table-column prop="cost" label="费用(元)" />
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { monitorApi } from '../api'

const period = ref('7d')
const trendChartRef = ref(null)
const modelChartRef = ref(null)
let trendChart = null
let modelChart = null

const stats = ref({
  totalCalls: 0,
  totalTokens: 0,
  totalCost: 0,
  activeUsers: 0
})

const userStats = ref([])

const loadStats = async () => {
  try {
    const data = await monitorApi.getStats(period.value)
    stats.value = data
  } catch (error) {
    console.error('加载统计数据失败', error)
  }
}

const loadUsageTrend = async () => {
  try {
    const data = await monitorApi.getUsageTrend(period.value)
    renderTrendChart(data)
  } catch (error) {
    console.error('加载趋势数据失败', error)
  }
}

const loadModelStats = async () => {
  try {
    const data = await monitorApi.getModelStats()
    renderModelChart(data)
  } catch (error) {
    console.error('加载模型统计失败', error)
  }
}

const loadUserStats = async () => {
  try {
    const data = await monitorApi.getUserStats()
    userStats.value = data
  } catch (error) {
    console.error('加载用户统计失败', error)
  }
}

const renderTrendChart = (data) => {
  if (!trendChart) {
    trendChart = echarts.init(trendChartRef.value)
  }
  
  const option = {
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['调用次数', 'Token消耗']
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: data.map(item => item.date)
    },
    yAxis: [
      {
        type: 'value',
        name: '调用次数'
      },
      {
        type: 'value',
        name: 'Token数'
      }
    ],
    series: [
      {
        name: '调用次数',
        type: 'line',
        smooth: true,
        data: data.map(item => item.calls),
        itemStyle: { color: '#409eff' }
      },
      {
        name: 'Token消耗',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        data: data.map(item => item.tokens),
        itemStyle: { color: '#67c23a' }
      }
    ]
  }
  
  trendChart.setOption(option)
}

const renderModelChart = (data) => {
  if (!modelChart) {
    modelChart = echarts.init(modelChartRef.value)
  }
  
  const option = {
    tooltip: {
      trigger: 'item'
    },
    legend: {
      orient: 'vertical',
      left: 'left'
    },
    series: [
      {
        name: '调用次数',
        type: 'pie',
        radius: '60%',
        data: data.map(item => ({
          name: item.modelName,
          value: item.calls
        })),
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  }
  
  modelChart.setOption(option)
}

const formatNumber = (num) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + 'M'
  } else if (num >= 1000) {
    return (num / 1000).toFixed(2) + 'K'
  }
  return num
}

onMounted(async () => {
  await Promise.all([
    loadStats(),
    loadUsageTrend(),
    loadModelStats(),
    loadUserStats()
  ])
  
  window.addEventListener('resize', () => {
    trendChart?.resize()
    modelChart?.resize()
  })
})
</script>

<style scoped>
.monitor-container {
  padding: 30px;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  min-height: 100vh;
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

.card-header span {
  font-size: 18px;
  font-weight: 600;
  color: #f1f5f9;
  letter-spacing: 0.5px;
}
</style>
