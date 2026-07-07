import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Table, Button, Tag, Space, Popconfirm, message, Switch } from 'antd'
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import api from '../services/api'

interface Keyword {
  id: number
  text: string
  price_limit: number
  interval_minutes: number
  enabled: number
  platforms: { id: number; code: string; name: string }[]
  created_at: string
}

const colors: Record<string, string> = { jd: 'red', pdd: 'volcano', douyin: 'purple', tmall: 'blue' }

export default function KeywordListPage() {
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const fetchKeywords = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/keywords')
      setKeywords(res.data)
    } catch { message.error('获取关键字列表失败') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchKeywords() }, [fetchKeywords])

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/keywords/${id}`)
      message.success('删除成功')
      fetchKeywords()
    } catch { message.error('删除失败') }
  }

  const handleToggle = async (kw: Keyword) => {
    try {
      await api.put(`/keywords/${kw.id}`, { enabled: kw.enabled ? 0 : 1 })
      message.success(kw.enabled ? '已禁用' : '已启用')
      fetchKeywords()
    } catch { message.error('操作失败') }
  }

  const handleScrape = async (id: number) => {
    try {
      message.loading({ content: '正在采集...', key: 'scrape' })
      const res = await api.post(`/products/scrape/${id}`)
      message.success({ content: `采集完成，共获取 ${res.data.results.reduce((s: number, r: { productCount: number }) => s + r.productCount, 0)} 条商品`, key: 'scrape' })
      fetchKeywords()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } }
      message.error({ content: error?.response?.data?.error || '采集失败', key: 'scrape' })
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>关键字管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/keywords/new')}>
          新建关键字
        </Button>
      </div>
      <Table
        dataSource={keywords}
        rowKey="id"
        loading={loading}
        columns={[
          { title: '关键字', dataIndex: 'text', width: 150 },
          { title: '限价', dataIndex: 'price_limit', width: 100, render: (v: number) => `¥${v}` },
          {
            title: '监控平台', dataIndex: 'platforms', width: 200,
            render: (platforms: { code: string; name: string }[]) =>
              platforms.map((p) => <Tag key={p.code} color={colors[p.code]}>{p.name}</Tag>),
          },
          { title: '采集间隔', dataIndex: 'interval_minutes', width: 100, render: (v: number) => `${v} 分钟` },
          {
            title: '状态', dataIndex: 'enabled', width: 80,
            render: (v: number, record: Keyword) => (
              <Switch checked={v === 1} onChange={() => handleToggle(record)} />
            ),
          },
          { title: '创建时间', dataIndex: 'created_at', width: 160 },
          {
            title: '操作', width: 240,
            render: (_: unknown, record: Keyword) => (
              <Space>
                <Button size="small" icon={<SearchOutlined />} onClick={() => handleScrape(record.id)}>
                  采集
                </Button>
                <Button size="small" icon={<EditOutlined />} onClick={() => navigate(`/keywords/${record.id}`)}>
                  编辑
                </Button>
                <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
                  <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />
    </div>
  )
}
