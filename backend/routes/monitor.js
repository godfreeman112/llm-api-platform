const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { query, get } = require('../database');

const router = express.Router();

// 获取统计数据
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { period = '7d' } = req.query;

    // 计算时间范围
    let days = 7;
    if (period === '30d') days = 30;
    if (period === '90d') days = 90;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 总调用次数
    const totalCallsResult = await get(
      'SELECT COUNT(*) as count FROM usage_logs WHERE created_at >= ?',
      [startDate.toISOString()]
    );

    // 总Token消耗
    const totalTokensResult = await get(
      'SELECT SUM(total_tokens) as total FROM usage_logs WHERE created_at >= ?',
      [startDate.toISOString()]
    );

    // 总费用
    const totalCostResult = await get(
      'SELECT SUM(cost) as total FROM usage_logs WHERE created_at >= ?',
      [startDate.toISOString()]
    );

    // 活跃用户数
    const activeUsersResult = await get(
      'SELECT COUNT(DISTINCT user_id) as count FROM usage_logs WHERE created_at >= ?',
      [startDate.toISOString()]
    );

    res.json({
      totalCalls: totalCallsResult?.count || 0,
      totalTokens: totalTokensResult?.total || 0,
      totalCost: parseFloat(totalCostResult?.total || 0).toFixed(2),
      activeUsers: activeUsersResult?.count || 0
    });
  } catch (error) {
    console.error('获取统计数据错误:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

// 获取使用趋势
router.get('/usage-trend', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { period = '7d' } = req.query;

    let days = 7;
    if (period === '30d') days = 30;
    if (period === '90d') days = 90;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 按天统计
    const trendData = await query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as calls,
        COALESCE(SUM(total_tokens), 0) as tokens
       FROM usage_logs 
       WHERE created_at >= ?
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [startDate.toISOString()]
    );

    // 填充缺失的日期
    const result = [];
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const existing = trendData.find(d => d.date === dateStr);
      result.push({
        date: dateStr,
        calls: existing?.calls || 0,
        tokens: existing?.tokens || 0
      });
    }

    res.json(result);
  } catch (error) {
    console.error('获取使用趋势错误:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

// 获取模型使用统计
router.get('/model-stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stats = await query(
      `SELECT 
        m.name as modelName,
        COUNT(*) as calls,
        COALESCE(SUM(ul.total_tokens), 0) as tokens,
        COALESCE(SUM(ul.cost), 0) as cost
       FROM usage_logs ul
       LEFT JOIN models m ON ul.model_id = m.id
       GROUP BY ul.model_id, m.name
       ORDER BY calls DESC`
    );

    res.json(stats);
  } catch (error) {
    console.error('获取模型统计错误:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

// 获取用户使用统计
router.get('/user-stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stats = await query(
      `SELECT 
        u.username,
        COUNT(*) as calls,
        COALESCE(SUM(ul.total_tokens), 0) as tokens,
        COALESCE(SUM(ul.cost), 0) as cost
       FROM usage_logs ul
       LEFT JOIN users u ON ul.user_id = u.id
       GROUP BY ul.user_id, u.username
       ORDER BY calls DESC
       LIMIT 20`
    );

    res.json(stats.map(s => ({
      ...s,
      cost: parseFloat(s.cost).toFixed(2)
    })));
  } catch (error) {
    console.error('获取用户统计错误:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

module.exports = router;
