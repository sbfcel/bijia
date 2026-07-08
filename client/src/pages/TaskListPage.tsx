import { useState, useEffect, useCallback } from 'react'
import { Table, Tag, message } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import api from '../services/api'

interface TaskLog {
  id: number
  keyword_text: string
  platform_code: string
  platform_name: string
  status: string
  error_message: string | null
  product_count: number
  started_at: string
  completed_at: string
}

const colors: Record<string, string> = { jd: 'red', pdd: 'volcano', douyin: 'purple', tmall: 'blue' }

export default function TaskListPage() {
  const [logs, setLogs] = useState<TaskLog[]>([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 })

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const res = await api.get('/tasks', { params: { page, limit: pagination.limit } })
      setLogs(res.data.data)
      setPagination((prev) => ({ ...prev, page, total: res.data.pagination.total }))
    } catch { message.error('获取任务日志失败') }
    finally { setLoading(false) }
  }, [pagination.limit])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  return (
    <div>
      <h2>采集任务日志</h2>
      <Table
        dataSource={logs}
        rowKey="id"
        loading={loading}
        columns={[
          { title: '关键字', dataIndex: 'keyword_text', width: 150 },
          { title: '平台', dataIndex: 'platform_name', width: 80, render: (v: string, r: TaskLog) => <Tag color={colors[r.platform_code]}>{v}</Tag> },
          {
            title: '状态', dataIndex: 'status', width: 80,
            render: (v: string) => {
              if (v === 'success')
                return <Tag icon={<CheckCircleOutlined />} color="success">成功</Tag>
              if (v === 'blocked')
                return <Tag icon={<CloseCircleOutlined />} color="warning">被拦截</Tag>
              return <Tag icon={<CloseCircleOutlined />} color="error">失败</Tag>
            },
          },
          { title: '商品数量', dataIndex: 'product_count', width: 100 },
          { title: '开始时间', dataIndex: 'started_at', width: 160 },
          { title: '完成时间', dataIndex: 'completed_at', width: 160 },
          { title: '错误信息', dataIndex: 'error_message', ellipsis: true, render: (v: string | null) => v || '-' },
        ]}
        pagination={{
          current: pagination.page,
          pageSize: pagination.limit,
          total: pagination.total,
          showTotal: (total) => `共 ${total} 条`,
          onChange: (page) => fetchLogs(page),
        }}
      />
    </div>
  )
}
