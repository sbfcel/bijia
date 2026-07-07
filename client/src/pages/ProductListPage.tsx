import { useState, useEffect, useCallback } from 'react'
import { Table, Tag, InputNumber, Select, Button, Space, message } from 'antd'
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons'
import api from '../services/api'

interface Product {
  id: number
  shop_name: string
  product_name: string
  price: number
  price_limit: number
  shop_url: string
  product_url: string
  scraped_at: string
  platform_code: string
  platform_name: string
  keyword_text: string
}

const colors: Record<string, string> = { jd: 'red', pdd: 'volcano', douyin: 'purple', tmall: 'blue' }

export default function ProductListPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 })
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([])
  const [filters, setFilters] = useState<{ platform_id?: number; keyword_id?: number; min_price?: number; max_price?: number; sort: string }>({ sort: 'price_asc' })

  const fetchProducts = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { page, limit: pagination.limit, sort: filters.sort }
      if (filters.platform_id) params.platform_id = filters.platform_id
      if (filters.keyword_id) params.keyword_id = filters.keyword_id
      if (filters.min_price !== undefined) params.min_price = filters.min_price
      if (filters.max_price !== undefined) params.max_price = filters.max_price
      const res = await api.get('/products', { params })
      setProducts(res.data.data)
      setPagination((prev) => ({ ...prev, page, total: res.data.pagination.total }))
    } catch { message.error('获取商品列表失败') }
    finally { setLoading(false) }
  }, [filters, pagination.limit])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  const handleExport = async (format: 'excel' | 'csv') => {
    try {
      const params: Record<string, unknown> = {}
      if (filters.platform_id) params.platform_id = filters.platform_id
      if (filters.keyword_id) params.keyword_id = filters.keyword_id
      if (selectedRowKeys.length > 0) params.ids = selectedRowKeys.join(',')

      const res = await api.get(`/export/${format}`, { params, responseType: 'blob' })
      const ext = format === 'excel' ? 'xlsx' : 'csv'
      const mime = format === 'excel'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv'

      const url = window.URL.createObjectURL(new Blob([res.data], { type: mime }))
      const link = document.createElement('a')
      link.href = url
      link.download = `products_${Date.now()}.${ext}`
      link.click()
      window.URL.revokeObjectURL(url)
      message.success('导出成功')
    } catch { message.error('导出失败') }
  }

  const columns = [
    { title: '平台', dataIndex: 'platform_name', width: 80, render: (v: string, r: Product) => <Tag color={colors[r.platform_code]}>{v}</Tag> },
    { title: '关键字', dataIndex: 'keyword_text', width: 120 },
    { title: '店铺', dataIndex: 'shop_name', width: 160 },
    { title: '产品名称', dataIndex: 'product_name', ellipsis: true },
    {
      title: '价格', dataIndex: 'price', width: 100, sorter: true,
      render: (v: number) => <span style={{ color: '#cf1322', fontWeight: 'bold' }}>¥{v}</span>,
    },
    { title: '限价', dataIndex: 'price_limit', width: 100, render: (v: number) => `¥${v}` },
    {
      title: '链接', dataIndex: 'product_url', width: 80,
      render: (v: string) => v ? <a href={v} target="_blank" rel="noreferrer">查看</a> : '-',
    },
    { title: '采集时间', dataIndex: 'scraped_at', width: 160 },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>商品监控</h2>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => fetchProducts(pagination.page)}>刷新</Button>
          <Button icon={<DownloadOutlined />} onClick={() => handleExport('excel')}>导出 Excel</Button>
          <Button icon={<DownloadOutlined />} onClick={() => handleExport('csv')}>导出 CSV</Button>
        </Space>
      </div>

      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          placeholder="选择平台" allowClear style={{ width: 120 }}
          options={[
            { label: '京东', value: 1 }, { label: '拼多多', value: 2 },
            { label: '抖音', value: 3 }, { label: '天猫', value: 4 },
          ]}
          onChange={(v) => setFilters((f) => ({ ...f, platform_id: v }))}
        />
        <InputNumber placeholder="最低价格" style={{ width: 120 }} min={0}
          onChange={(v) => setFilters((f) => ({ ...f, min_price: v ?? undefined }))} />
        <InputNumber placeholder="最高价格" style={{ width: 120 }} min={0}
          onChange={(v) => setFilters((f) => ({ ...f, max_price: v ?? undefined }))} />
        <Select
          placeholder="排序" style={{ width: 120 }} value={filters.sort}
          options={[
            { label: '价格升序', value: 'price_asc' },
            { label: '价格降序', value: 'price_desc' },
            { label: '时间降序', value: 'time_desc' },
          ]}
          onChange={(v) => setFilters((f) => ({ ...f, sort: v }))}
        />
      </Space>

      <Table
        dataSource={products}
        rowKey="id"
        loading={loading}
        columns={columns}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys as number[]),
        }}
        pagination={{
          current: pagination.page,
          pageSize: pagination.limit,
          total: pagination.total,
          showTotal: (total) => `共 ${total} 条`,
          onChange: (page) => fetchProducts(page),
        }}
      />
    </div>
  )
}
