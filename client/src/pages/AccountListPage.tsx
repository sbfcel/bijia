import { useState, useEffect, useCallback } from 'react'
import { Table, Button, Modal, Form, Input, Select, Tag, Space, message, Popconfirm, Card, Row, Col, Tooltip, Descriptions } from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  SafetyOutlined, ThunderboltOutlined, ClockCircleOutlined,
  ReloadOutlined, CheckCircleOutlined,
} from '@ant-design/icons'
import api from '../services/api'

const COOKIE_HINTS: Record<string, { fields: string; example: string }> = {
  jd: {
    fields: '必需: pt_key, pt_pin | 推荐: pwdt_id, TrackID, thor',
    example: '[{"name":"pt_key","value":"xxx","domain":".jd.com","path":"/"},{"name":"pt_pin","value":"xxx","domain":".jd.com","path":"/"}]',
  },
  pdd: {
    fields: '必需: PDDAccessToken, UID | 推荐: JSESSIONID, api_uid, pdd_user_id',
    example: '[{"name":"PDDAccessToken","value":"xxx","domain":".yangkeduo.com","path":"/"},{"name":"UID","value":"xxx","domain":".yangkeduo.com","path":"/"}]',
  },
  douyin: {
    fields: '必需: sessionid, sessionid_ss, passport_csrf_token | 推荐: sid_guard, odin_tt, tt_webid',
    example: '[{"name":"sessionid","value":"xxx","domain":".jinritemai.com","path":"/"},{"name":"sessionid_ss","value":"xxx","domain":".jinritemai.com","path":"/"},{"name":"passport_csrf_token","value":"xxx","domain":".jinritemai.com","path":"/"}]',
  },
  tmall: {
    fields: '必需: _tb_token_, cookie2, t | 推荐: unb, _m_h5_tk, _m_h5_tk_enc',
    example: '[{"name":"_tb_token_","value":"xxx","domain":".tmall.com","path":"/"},{"name":"cookie2","value":"xxx","domain":".tmall.com","path":"/"},{"name":"t","value":"xxx","domain":".tmall.com","path":"/"}]',
  },
}

interface Platform {
  id: number
  code: string
  name: string
}

interface Account {
  id: number
  platform_id: number
  platform_code: string
  platform_name: string
  account_name: string
  cookies: string | null
  status: string
  last_login_at: string | null
  created_at: string
}

interface AntiDetectPlatform {
  code: string
  name: string
  riskLevel: string
  riskColor: string
  riskDesc: string
  config: { delayRange: string; maxRetries: number; scrollPages: number }
  measures: string[]
}

const colors: Record<string, string> = { jd: 'red', pdd: 'volcano', douyin: 'purple', tmall: 'blue' }

export default function AccountListPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [antiDetectConfigs, setAntiDetectConfigs] = useState<AntiDetectPlatform[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Account | null>(null)
  const [form] = Form.useForm()

  const fetchAccounts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/accounts')
      setAccounts(res.data)
    } catch { message.error('获取账号列表失败') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchAccounts()
    api.get('/platforms').then((res) => setPlatforms(res.data)).catch(() => {})
    api.get('/anti-detect/platforms').then((res) => setAntiDetectConfigs(res.data)).catch(() => {})
  }, [fetchAccounts])

  const handleOpenModal = (account?: Account) => {
    if (account) {
      setEditing(account)
      form.setFieldsValue({
        platform_id: account.platform_id,
        account_name: account.account_name,
        cookies: account.cookies || '',
      })
    } else {
      setEditing(null)
      form.resetFields()
    }
    setModalOpen(true)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      if (editing) {
        await api.put(`/accounts/${editing.id}`, values)
        message.success('更新成功')
      } else {
        await api.post('/accounts', values)
        message.success('添加成功')
      }
      setModalOpen(false)
      fetchAccounts()
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return
      const error = err as { response?: { data?: { error?: string } } }
      message.error(error?.response?.data?.error || '保存失败')
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/accounts/${id}`)
      message.success('删除成功')
      fetchAccounts()
    } catch { message.error('删除失败') }
  }

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>平台反爬风控配置</h2>
      <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
        {antiDetectConfigs.map((cfg) => (
          <Col span={6} key={cfg.code}>
            <Card
              size="small"
              title={
                <Space>
                  <SafetyOutlined />
                  <Tag color={colors[cfg.code]}>{cfg.name}</Tag>
                  <Tag color={cfg.riskColor}>{'风控等级: ' + cfg.riskLevel}</Tag>
                </Space>
              }
              style={{ height: '100%' }}
            >
              <Descriptions column={1} size="small" colon={false}>
                <Descriptions.Item label={<><ThunderboltOutlined /> 检测手段</>}>
                  <span style={{ fontSize: 12 }}>{cfg.riskDesc}</span>
                </Descriptions.Item>
                <Descriptions.Item label={<><ClockCircleOutlined /> 请求间隔</>}>
                  {cfg.config.delayRange}
                </Descriptions.Item>
                <Descriptions.Item label={<><ReloadOutlined /> 重试次数</>}>
                  {cfg.config.maxRetries} 次
                </Descriptions.Item>
              </Descriptions>
              <div style={{ marginTop: 8 }}>
                {cfg.measures.slice(0, 4).map((m, i) => (
                  <Tag key={i} icon={<CheckCircleOutlined />} color="processing" style={{ marginBottom: 4, fontSize: 11 }}>
                    {m}
                  </Tag>
                ))}
              </div>
              {cfg.measures.length > 4 && (
                <Tooltip title={cfg.measures.slice(4).join('、')}>
                  <Tag style={{ fontSize: 11, cursor: 'pointer' }}>+{cfg.measures.length - 4} 项更多</Tag>
                </Tooltip>
              )}
            </Card>
          </Col>
        ))}
      </Row>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>平台账号凭证</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>
          添加账号
        </Button>
      </div>

      <Table
        dataSource={accounts}
        rowKey="id"
        loading={loading}
        columns={[
          { title: '平台', dataIndex: 'platform_name', width: 100, render: (v: string, r: Account) => <Tag color={colors[r.platform_code]}>{v}</Tag> },
          { title: '账号名称', dataIndex: 'account_name', width: 150 },
          {
            title: '登录状态', dataIndex: 'cookies', width: 100,
            render: (v: string | null) => v ? <Tag color="success">已配置</Tag> : <Tag color="default">未配置</Tag>,
          },
          { title: '添加时间', dataIndex: 'created_at', width: 160 },
          {
            title: '操作', width: 160,
            render: (_: unknown, record: Account) => (
              <Space>
                <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenModal(record)}>编辑</Button>
                <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
                  <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title={editing ? '编辑账号' : '添加账号'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="platform_id" label="平台" rules={[{ required: true, message: '请选择平台' }]}>
            <Select
              placeholder="选择平台"
              disabled={!!editing}
              options={platforms.map((p) => ({ label: p.name, value: p.id }))}
            />
          </Form.Item>
          <Form.Item name="account_name" label="账号名称" rules={[{ required: true, message: '请输入账号名称' }]}>
            <Input placeholder="如：运营账号1" />
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prev, cur) => prev.platform_id !== cur.platform_id}
          >
            {({ getFieldValue }) => {
              const pid = getFieldValue('platform_id')
              const plat = platforms.find((p) => p.id === pid)
              const hint = plat ? COOKIE_HINTS[plat.code] : null
              return (
                <Form.Item
                  name="cookies"
                  label="Cookie 凭证"
                  help={
                    <span>
                      浏览器中按 F12 → Application → Cookies，复制所需字段。<br />
                      {hint && <><strong>{plat!.name}关键字段：</strong>{hint.fields}<br /></>}
                      格式示例：<code>{hint ? hint.example : '[{"name":"token","value":"xxx","domain":".example.com","path":"/"}]'}</code>
                    </span>
                  }
                >
                  <Input.TextArea rows={6} placeholder={hint ? hint.example : '[{"name":"token","value":"xxx","domain":".example.com","path":"/"}]'} />
                </Form.Item>
              )
            }}
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
