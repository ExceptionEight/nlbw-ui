import React, { useState, useEffect } from 'react'
import { Card, Row, Col, Statistic, Table, Spin, Empty } from 'antd'
import { DownloadOutlined, UploadOutlined, LaptopOutlined, SwapOutlined } from '@ant-design/icons'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatBytes, formatNumber } from '../utils/format'

function Dashboard({ dateRange }) {
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    fetchSummary()
  }, [dateRange])

  const fetchSummary = async () => {
    setLoading(true)
    try {
      const from = dateRange[0].format('YYYY-MM-DD')
      const to = dateRange[1].format('YYYY-MM-DD')
      const response = await fetch(`/api/summary?from=${from}&to=${to}`)
      const data = await response.json()
      setSummary(data)
    } catch (error) {
      console.error('Failed to fetch summary:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!summary) {
    return <Empty description="No data available" />
  }

  // Агрегация по устройствам
  const deviceStats = {}
  summary.days.forEach((day) => {
    if (day.devices) {
      Object.values(day.devices).forEach((device) => {
        const key = device.mac
        if (!deviceStats[key]) {
          deviceStats[key] = {
            mac: device.mac,
            friendly_name: device.friendly_name,
            ip: device.ip,
            downloaded: 0,
            uploaded: 0,
          }
        }
        deviceStats[key].downloaded += device.downloaded
        deviceStats[key].uploaded += device.uploaded
      })
    }
  })

  const topDevices = Object.values(deviceStats)
    .sort((a, b) => b.downloaded - a.downloaded)
    .slice(0, 10)

  const topDevicesChart = topDevices.map((d) => ({
    name: d.friendly_name,
    Downloaded: d.downloaded,
    Uploaded: d.uploaded,
  }))

  const columns = [
    {
      title: 'Device',
      dataIndex: 'friendly_name',
      key: 'friendly_name',
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: 'IP',
      dataIndex: 'ip',
      key: 'ip',
    },
    {
      title: 'Downloaded',
      dataIndex: 'downloaded',
      key: 'downloaded',
      render: (bytes) => <span style={{ color: '#52c41a' }}>{formatBytes(bytes)}</span>,
      sorter: (a, b) => a.downloaded - b.downloaded,
    },
    {
      title: 'Uploaded',
      dataIndex: 'uploaded',
      key: 'uploaded',
      render: (bytes) => <span style={{ color: '#fa8c16' }}>{formatBytes(bytes)}</span>,
      sorter: (a, b) => a.uploaded - b.uploaded,
    },
  ]

  return (
    <div>
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card>
            <Statistic
              title={<span style={{ fontSize: 20 }}>Total Downloaded</span>}
              value={formatBytes(summary.total_downloaded)}
              prefix={<DownloadOutlined style={{ fontSize: 32 }} />}
              valueStyle={{ color: '#52c41a', fontSize: 48, fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card>
            <Statistic
              title={<span style={{ fontSize: 20 }}>Total Uploaded</span>}
              value={formatBytes(summary.total_uploaded)}
              prefix={<UploadOutlined style={{ fontSize: 32 }} />}
              valueStyle={{ color: '#fa8c16', fontSize: 48, fontWeight: 'bold' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="Total Devices"
              value={Object.keys(deviceStats).length}
              prefix={<LaptopOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Days in Range"
              value={summary.days.length}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Total Traffic"
              value={formatBytes(summary.total_downloaded + summary.total_uploaded)}
              prefix={<SwapOutlined />}
              valueStyle={{ color: '#13c2c2' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Top 10 Devices by Downloaded Traffic" style={{ marginBottom: 24 }}>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={topDevicesChart}>
            <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
            <XAxis dataKey="name" stroke="#8b949e" />
            <YAxis stroke="#8b949e" tickFormatter={(value) => formatBytes(value)} />
            <Tooltip
              contentStyle={{ backgroundColor: '#161b22', border: '1px solid #30363d' }}
              formatter={(value) => formatBytes(value)}
            />
            <Legend />
            <Bar dataKey="Downloaded" fill="#52c41a" />
            <Bar dataKey="Uploaded" fill="#fa8c16" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card title="All Devices">
        <Table
          columns={columns}
          dataSource={topDevices}
          rowKey="mac"
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  )
}

export default Dashboard
