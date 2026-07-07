import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Form, Input, InputNumber, Select, Button, Card, message, Spin } from 'antd'
import api from '../services/api'

interface Platform {
  id: number
  code: string
  name: string
  enabled: number
}

export default function KeywordFormPage() {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  useEffect(() => {
    api.get('/platforms').then((res) => setPlatforms(res.data.filter((p: Platform) => p.enabled === 1))).catch(() => {})
    if (isEdit) {
      setLoading(true)
      api.get('/keywords').then((res) => {
        const kw = res.data.find((k: { id: number }) => k.id === parseInt(id!))
        if (kw) {
          form.setFieldsValue({
            text: kw.text,
            price_limit: kw.price_limit,
            interval_minutes: kw.interval_minutes,
            platform_ids: kw.platforms.map((p: Platform) => p.id),
          })
        }
      }).catch(() => message.error('加载关键字失败'))
        .finally(() => setLoading(false))
    }
  }, [id, isEdit, form])

  const onFinish = async (values: { text: string; price_limit: number; interval_minutes: number; platform_ids: number[] }) => {
    setSaving(true)
    try {
      if (isEdit) {
        await api.put(`/keywords/${id}`, values)
        message.success('更新成功')
      } else {
        await api.post('/keywords', values)
        message.success('创建成功')
      }
      navigate('/keywords')
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } }
      message.error(error?.response?.data?.error || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Spin size="large" />

  return (
    <div>
      <h2>{isEdit ? '编辑关键字' : '新建关键字'}</h2>
      <Card style={{ maxWidth: 600, marginTop: 16 }}>
        <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ interval_minutes: 30 }}>
          <Form.Item name="text" label="关键字" rules={[{ required: true, message: '请输入关键字' }]}>
            <Input placeholder="如：iPhone 15" />
          </Form.Item>
          <Form.Item name="price_limit" label="限价 (元)" rules={[{ required: true, message: '请输入限价' }]}>
            <InputNumber min={0.01} step={0.01} precision={2} style={{ width: '100%' }} placeholder="低于此价格的商品将被标记" />
          </Form.Item>
          <Form.Item name="platform_ids" label="监控平台" rules={[{ required: true, message: '请选择至少一个平台' }]}>
            <Select mode="multiple" placeholder="选择平台" options={platforms.map((p) => ({ label: p.name, value: p.id }))} />
          </Form.Item>
          <Form.Item name="interval_minutes" label="采集间隔 (分钟)">
            <Select options={[
              { label: '15 分钟', value: 15 },
              { label: '30 分钟', value: 30 },
              { label: '1 小时', value: 60 },
              { label: '2 小时', value: 120 },
              { label: '6 小时', value: 360 },
              { label: '12 小时', value: 720 },
              { label: '24 小时', value: 1440 },
            ]} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={saving} style={{ marginRight: 8 }}>
              {isEdit ? '保存' : '创建'}
            </Button>
            <Button onClick={() => navigate('/keywords')}>取消</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
