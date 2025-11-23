import React, { useState, useEffect, useMemo } from 'react'
import { Layout, Tabs, DatePicker, Space, Typography } from 'antd'
import {
  DashboardOutlined,
  CalendarOutlined,
  LaptopOutlined,
  LineChartOutlined,
  SwapOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'

import Dashboard from './components/Dashboard'
import ActivityMatrix from './components/ActivityMatrix'
import Devices from './components/Devices'
import Charts from './components/Charts'
import Comparison from './components/Comparison'

const { Header, Content } = Layout
const { Title } = Typography
const { RangePicker } = DatePicker

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [dateRange, setDateRange] = useState([
    dayjs().subtract(30, 'days'),
    dayjs(),
  ])
  const [availableDates, setAvailableDates] = useState([])
  const [minMaxDates, setMinMaxDates] = useState(null)

  // Загрузка доступных дат для подсветки в календаре
  useEffect(() => {
    fetch('/api/calendar')
      .then(res => res.json())
      .then(data => {
        const dates = data.filter(d => d.value > 0).map(d => d.date).sort()
        setAvailableDates(dates)

        // Сохраняем минимальную и максимальную доступные даты
        if (dates.length > 0) {
          setMinMaxDates({
            min: dayjs(dates[0]),
            max: dayjs(dates[dates.length - 1])
          })
        }
      })
      .catch(err => console.error('Failed to fetch available dates:', err))
  }, [])

  // Функция для подсветки дней в календаре
  const dateFullCellRender = (current) => {
    const dateStr = current.format('YYYY-MM-DD')
    const hasData = availableDates.includes(dateStr)
    const isToday = current.isSame(dayjs(), 'day')
    const isCurrentMonth = current.isSame(dayjs(), 'month')

    return (
      <div
        className="ant-picker-cell-inner"
        style={{
          backgroundColor: hasData ? 'rgba(38, 166, 65, 0.15)' : 'transparent',
          borderRadius: '4px',
        }}
      >
        {current.date()}
      </div>
    )
  }

  const tabs = useMemo(() => [
    {
      key: 'dashboard',
      label: (
        <span>
          <DashboardOutlined />
          Dashboard
        </span>
      ),
      children: <Dashboard dateRange={dateRange} />,
    },
    {
      key: 'activity',
      label: (
        <span>
          <CalendarOutlined />
          Activity Matrix
        </span>
      ),
      children: <ActivityMatrix setActiveTab={setActiveTab} setDateRange={setDateRange} />,
    },
    {
      key: 'devices',
      label: (
        <span>
          <LaptopOutlined />
          Devices
        </span>
      ),
      children: <Devices dateRange={dateRange} />,
    },
    {
      key: 'charts',
      label: (
        <span>
          <LineChartOutlined />
          Charts
        </span>
      ),
      children: <Charts dateRange={dateRange} />,
    },
    {
      key: 'comparison',
      label: (
        <span>
          <SwapOutlined />
          Comparison
        </span>
      ),
      children: <Comparison />,
    },
  ], [dateRange, setActiveTab, setDateRange])

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
        }}
      >
        <Title level={3} style={{ margin: 0, color: '#58a6ff' }}>
          NLBW-UI
        </Title>

        {activeTab !== 'activity' && activeTab !== 'comparison' && (
          <Space>
            <span style={{ color: '#8b949e' }}>Date Range:</span>
            <RangePicker
              value={dateRange}
              onChange={(dates) => {
                if (dates === null && minMaxDates) {
                  // Если пользователь очистил выбор, устанавливаем весь доступный диапазон
                  setDateRange([minMaxDates.min, minMaxDates.max])
                } else if (dates) {
                  setDateRange(dates)
                }
              }}
              format="YYYY-MM-DD"
              style={{ width: 280 }}
              dateRender={dateFullCellRender}
            />
          </Space>
        )}
      </Header>

      <Content style={{ padding: '24px' }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabs}
          size="large"
        />
      </Content>
    </Layout>
  )
}

export default App
