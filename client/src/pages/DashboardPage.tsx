import { useState, useEffect } from 'react'
import { Card, Row, Col, Statistic, Table, Tag } from 'antd'
import { ShoppingOutlined, WarningOutlined } from '@ant-design/icons'
import api from '../services/api'

interface PlatformStat {
  code: string
  name: string
  count: number
}

interface RecentProduct {
  id: number
  platform_code: string
  platform_name: string
  shop_name: string
  product_name: string
  price: number
  price_limit: number
  scraped_at: string
}

export default function DashboardPage() {
  const [stats, setStats] = useState<{ total: number; byPlatform: PlatformStat[] }>({ total: 0, byPlatform: [] })
  const [recent, setRecent] = useState<RecentProduct[]>([])

  useEffect(() => {
    api.get('/products/stats').then((res) => setStats(res.data)).catch(() => {})
    api.get('/products', { params: { limit: 5, sort: 'price_asc' } }).then((res) => setRecent(res.data.data)).catch(() => {})
  }, [])

  const colors: Record<string, string> = { jd: 'red', pdd: 'volcano', douyin: 'purple', tmall: 'blue' }

  return (
    <div>
      <h2>概览</h2>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card><Statistic title="低于限价商品总数" value={stats.total} prefix={<WarningOutlined />} valueStyle={{ color: '#cf1322' }} /></Card>
        </Col>
        {stats.byPlatform.map((s) => (
          <Col span={6} key={s.code}>
            <Card><Statistic title={s.name} value={s.count} prefix={<ShoppingOutlined />} /></Card>
          </Col>
        ))}
      </Row>

      <h3 style={{ marginTop: 24 }}>最低价商品</h3>
      <Table
        dataSource={recent}
        rowKey="id"
        pagination={false}
        columns={[
          { title: '平台', dataIndex: 'platform_name', width: 80, render: (v: string, r: RecentProduct) => <Tag color={colors[r.platform_code]}>{v}</Tag> },
          { title: '店铺', dataIndex: 'shop_name', width: 150 },
          { title: '产品', dataIndex: 'product_name', ellipsis: true },
          { title: '价格', dataIndex: 'price', width: 100, render: (v: number) => <span style={{ color: '#cf1322', fontWeight: 'bold' }}>¥{v}</span> },
          { title: '限价', dataIndex: 'price_limit', width: 100, render: (v: number) => `¥${v}` },
          { title: '采集时间', dataIndex: 'scraped_at', width: 160 },
        ]}
      />
    </div>
  )
}
