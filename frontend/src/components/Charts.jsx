import React, { useState, useEffect } from 'react'
import { Card, Checkbox, Row, Col, Spin, Empty, Typography } from 'antd'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatBytes } from '../utils/format'

const { Title } = Typography

function Charts({ dateRange }) {
  const [loading, setLoading] = useState(true)
  const [timeseries, setTimeseries] = useState([])
  const [devices, setDevices] = useState([])
  const [selectedMacs, setSelectedMacs] = useState([])

  useEffect(() => {
    fetchDevices()
  }, [dateRange])

  useEffect(() => {
    fetchTimeseries()
  }, [dateRange, selectedMacs])

  const fetchDevices = async () => {
    try {
      const from = dateRange[0].format('YYYY-MM-DD')
      const to = dateRange[1].format('YYYY-MM-DD')
      const response = await fetch(`/api/summary?from=${from}&to=${to}`)
      const data = await response.json()

      // Агрегация по устройствам
      const deviceStats = {}
      data.days.forEach((day) => {
        if (day.devices) {
          Object.values(day.devices).forEach((device) => {
            const key = device.mac
            if (!deviceStats[key]) {
              deviceStats[key] = {
                mac: device.mac,
                friendly_name: device.friendly_name,
                total: 0,
              }
            }
            deviceStats[key].total += device.downloaded + device.uploaded
          })
        }
      })

      const devicesArray = Object.values(deviceStats).sort((a, b) => b.total - a.total)
      setDevices(devicesArray)
    } catch (error) {
      console.error('Failed to fetch devices:', error)
    }
  }

  const fetchTimeseries = async () => {
    setLoading(true)
    try {
      const from = dateRange[0].format('YYYY-MM-DD')
      const to = dateRange[1].format('YYYY-MM-DD')
      const macsParam = selectedMacs.length > 0 ? `&macs=${selectedMacs.join(',')}` : ''
      const response = await fetch(`/api/timeseries?from=${from}&to=${to}${macsParam}`)
      const data = await response.json()
      setTimeseries(data)
    } catch (error) {
      console.error('Failed to fetch timeseries:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeviceToggle = (mac) => {
    setSelectedMacs((prev) => {
      if (prev.includes(mac)) {
        return prev.filter((m) => m !== mac)
      } else {
        return [...prev, mac]
      }
    })
  }

  if (loading && timeseries.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!timeseries || timeseries.length === 0) {
    return <Empty description="No data available" />
  }

  const chartData = timeseries.map((day) => ({
    date: day.date,
    Downloaded: day.downloaded,
    Uploaded: day.uploaded,
  }))

  return (
    <div>
      <Row gutter={24}>
        <Col span={18}>
          <Card title="Traffic Over Time" loading={loading}>
            <ResponsiveContainer width="100%" height={500}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorDownloaded" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#52c41a" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#52c41a" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="colorUploaded" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fa8c16" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#fa8c16" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                <XAxis dataKey="date" stroke="#8b949e" />
                <YAxis stroke="#8b949e" tickFormatter={(value) => formatBytes(value)} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#161b22', border: '1px solid #30363d' }}
                  formatter={(value) => formatBytes(value)}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="Downloaded"
                  stroke="#52c41a"
                  fillOpacity={1}
                  fill="url(#colorDownloaded)"
                />
                <Area
                  type="monotone"
                  dataKey="Uploaded"
                  stroke="#fa8c16"
                  fillOpacity={1}
                  fill="url(#colorUploaded)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col span={6}>
          <Card title="Filter Devices">
            <Title level={5}>
              {selectedMacs.length === 0
                ? 'Showing all devices'
                : `Showing ${selectedMacs.length} device(s)`}
            </Title>
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {devices.map((device) => (
                <div key={device.mac} style={{ marginBottom: 8 }}>
                  <Checkbox
                    checked={selectedMacs.includes(device.mac)}
                    onChange={() => handleDeviceToggle(device.mac)}
                  >
                    {device.friendly_name}
                  </Checkbox>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Charts
