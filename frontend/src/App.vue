<template>
  <el-config-provider :locale="locale">
    <router-view />
  </el-config-provider>
</template>

<script setup>
import { ref } from 'vue'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'

const locale = ref(zhCn)
</script>

<style>
/* Google Fonts 使用 protocol-relative URL 或回退到系统字体 */
@import url('//fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --secondary-gradient: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  --accent-color: #667eea;
  --bg-dark: #0f172a;
  --bg-card: rgba(30, 41, 59, 0.8);
  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
  --border-color: rgba(148, 163, 184, 0.1);
  --shadow-glow: 0 0 40px rgba(102, 126, 234, 0.15);
}

#app {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  height: 100vh;
  background: var(--bg-dark);
  color: var(--text-primary);
  overflow: hidden;
}

body {
  margin: 0;
  padding: 0;
  background: var(--bg-dark);
}

/* 全局滚动条样式 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: rgba(15, 23, 42, 0.5);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 4px;
  transition: all 0.3s ease;
}

::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
}

/* Element Plus 组件覆盖 */
.el-button--primary {
  background: var(--primary-gradient) !important;
  border: none !important;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3) !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

.el-button--primary:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4) !important;
}

.el-card {
  background: var(--bg-card) !important;
  backdrop-filter: blur(20px) !important;
  border: 1px solid var(--border-color) !important;
  box-shadow: var(--shadow-glow) !important;
  border-radius: 16px !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

.el-card:hover {
  transform: translateY(-4px) !important;
  box-shadow: 0 8px 40px rgba(102, 126, 234, 0.25) !important;
}

.el-input__wrapper,
.el-textarea__inner {
  background: rgba(15, 23, 42, 0.6) !important;
  border: 1px solid var(--border-color) !important;
  border-radius: 12px !important;
  transition: all 0.3s ease !important;
}

.el-input__wrapper:hover,
.el-textarea__inner:focus {
  border-color: var(--accent-color) !important;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1) !important;
}

.el-select .el-input__wrapper {
  background: rgba(15, 23, 42, 0.6) !important;
}

.el-table {
  background: transparent !important;
}

.el-table th,
.el-table td {
  background: rgba(15, 23, 42, 0.4) !important;
  border-bottom: 1px solid var(--border-color) !important;
}

.el-table tr:hover > td {
  background: rgba(102, 126, 234, 0.1) !important;
}

.el-tag {
  border-radius: 8px !important;
  font-weight: 500 !important;
}

.el-menu {
  background: transparent !important;
  border-right: none !important;
}
</style>
