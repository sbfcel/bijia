import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Button, theme } from 'antd'
import {
  DashboardOutlined,
  SearchOutlined,
  ShoppingOutlined,
  ScheduleOutlined,
  KeyOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons'
import { useAuth } from '../contexts/AuthContext'

const { Header, Sider, Content } = Layout

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: '概览' },
  { key: '/keywords', icon: <SearchOutlined />, label: '关键字管理' },
  { key: '/products', icon: <ShoppingOutlined />, label: '商品监控' },
  { key: '/tasks', icon: <ScheduleOutlined />, label: '采集任务' },
  { key: '/accounts', icon: <KeyOutlined />, label: '平台账号' },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const { token: themeToken } = theme.useToken()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const selectedKey = menuItems.find((item) =>
    item.key === '/' ? location.pathname === '/' : location.pathname.startsWith(item.key)
  )?.key || '/'

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed} theme="light">
        <div
          style={{
            height: 48,
            margin: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: collapsed ? 14 : 18,
            color: themeToken.colorPrimary,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
        >
          {collapsed ? '比价' : '商品价格监控'}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: '0 24px',
            background: themeToken.colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${themeToken.colorBorderSecondary}`,
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span>{user?.username}</span>
            <Button type="text" icon={<LogoutOutlined />} onClick={handleLogout}>
              退出
            </Button>
          </div>
        </Header>
        <Content
          style={{
            margin: 16,
            padding: 24,
            background: themeToken.colorBgContainer,
            borderRadius: themeToken.borderRadiusLG,
            minHeight: 280,
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}
