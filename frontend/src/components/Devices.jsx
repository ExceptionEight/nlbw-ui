import React, { useState, useEffect } from 'react'
import { Card, Table, Tag, Spin, Empty, Modal, Row, Col, Statistic, Divider, Typography } from 'antd'
import { DownloadOutlined, UploadOutlined } from '@ant-design/icons'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatBytes, formatNumber } from '../utils/format'

const { Title, Text } = Typography

const COLORS = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16', '#a0d911', '#2f54eb']

function Devices({ dateRange }) {
  const [loading, setLoading] = useState(true)
  const [devices, setDevices] = useState([])
  const [selectedDevice, setSelectedDevice] = useState(null)
  const [protocols, setProtocols] = useState([])
  const [modalVisible, setModalVisible] = useState(false)
  const [protocolsLoading, setProtocolsLoading] = useState(false)
  const [availableDates, setAvailableDates] = useState([])

  useEffect(() => {
    // Загружаем доступные даты при первом рендере
    fetch('/api/calendar')
      .then(res => res.json())
      .then(data => {
        const dates = data.filter(d => d.value > 0).map(d => d.date)
        setAvailableDates(dates)
      })
      .catch(err => console.error('Failed to fetch available dates:', err))
  }, [])

  useEffect(() => {
    fetchDevices()
  }, [dateRange])

  const fetchDevices = async () => {
    setLoading(true)
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
                ip: device.ip,
                downloaded: 0,
                uploaded: 0,
                rx_packets: 0,
                tx_packets: 0,
                connections: 0,
              }
            }
            deviceStats[key].downloaded += device.downloaded
            deviceStats[key].uploaded += device.uploaded
            deviceStats[key].rx_packets += device.rx_packets
            deviceStats[key].tx_packets += device.tx_packets
            deviceStats[key].connections += device.connections
          })
        }
      })

      setDevices(Object.values(deviceStats).sort((a, b) => b.downloaded - a.downloaded))
    } catch (error) {
      console.error('Failed to fetch devices:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchProtocols = async (mac) => {
    setProtocolsLoading(true)
    try {
      // Фильтруем только доступные даты в выбранном диапазоне
      const startDate = dateRange[0].format('YYYY-MM-DD')
      const endDate = dateRange[1].format('YYYY-MM-DD')

      const datesToFetch = availableDates.filter(date => date >= startDate && date <= endDate)

      const protocolMap = {}

      // Делаем запросы только для дат с данными
      for (const dateStr of datesToFetch) {
        try {
          const response = await fetch(`/api/device/${dateStr}/${mac}`)
          if (response.ok) {
            const data = await response.json()
            if (Array.isArray(data)) {
              data.forEach(proto => {
                const key = `${proto.protocol}:${proto.port}`
                if (!protocolMap[key]) {
                  protocolMap[key] = { ...proto }
                } else {
                  protocolMap[key].downloaded += proto.downloaded
                  protocolMap[key].uploaded += proto.uploaded
                  protocolMap[key].rx_packets += proto.rx_packets
                  protocolMap[key].tx_packets += proto.tx_packets
                  protocolMap[key].connections += proto.connections
                }
              })
            }
          }
        } catch (err) {
          // Продолжаем для следующей даты
        }
      }

      const aggregatedData = Object.values(protocolMap).sort((a, b) => b.downloaded - a.downloaded)
      setProtocols(aggregatedData)
    } catch (error) {
      console.error('Failed to fetch protocols:', error)
      setProtocols([])
    } finally {
      setProtocolsLoading(false)
    }
  }

  const handleRowClick = async (record) => {
    setSelectedDevice(record)
    setModalVisible(true)
    await fetchProtocols(record.mac)
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!devices || devices.length === 0) {
    return <Empty description="No devices found" />
  }

  const columns = [
    {
      title: 'Device',
      dataIndex: 'friendly_name',
      key: 'friendly_name',
      render: (text) => <strong>{text}</strong>,
      sorter: (a, b) => a.friendly_name.localeCompare(b.friendly_name),
    },
    {
      title: 'MAC Address',
      dataIndex: 'mac',
      key: 'mac',
      render: (mac) => <code style={{ fontSize: 12 }}>{mac}</code>,
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
      render: (bytes) => (
        <Tag color="success" icon={<DownloadOutlined />}>
          {formatBytes(bytes)}
        </Tag>
      ),
      sorter: (a, b) => a.downloaded - b.downloaded,
      defaultSortOrder: 'descend',
    },
    {
      title: 'Uploaded',
      dataIndex: 'uploaded',
      key: 'uploaded',
      render: (bytes) => (
        <Tag color="warning" icon={<UploadOutlined />}>
          {formatBytes(bytes)}
        </Tag>
      ),
      sorter: (a, b) => a.uploaded - b.uploaded,
    },
    {
      title: 'Packets ↓',
      dataIndex: 'rx_packets',
      key: 'rx_packets',
      render: (pkts) => formatNumber(pkts),
      sorter: (a, b) => a.rx_packets - b.rx_packets,
    },
    {
      title: 'Packets ↑',
      dataIndex: 'tx_packets',
      key: 'tx_packets',
      render: (pkts) => formatNumber(pkts),
      sorter: (a, b) => a.tx_packets - b.tx_packets,
    },
    {
      title: 'Connections',
      dataIndex: 'connections',
      key: 'connections',
      render: (conns) => formatNumber(conns),
      sorter: (a, b) => a.connections - b.connections,
    },
  ]

  const protocolColumns = [
    {
      title: 'Protocol',
      dataIndex: 'protocol',
      key: 'protocol',
      render: (proto) => <Tag color="blue">{proto}</Tag>,
    },
    {
      title: 'Port',
      dataIndex: 'port',
      key: 'port',
    },
    {
      title: 'Download',
      dataIndex: 'downloaded',
      key: 'downloaded',
      render: (bytes) => <span style={{ color: '#52c41a' }}>{formatBytes(bytes)}</span>,
      sorter: (a, b) => a.downloaded - b.downloaded,
    },
    {
      title: 'Upload',
      dataIndex: 'uploaded',
      key: 'uploaded',
      render: (bytes) => <span style={{ color: '#fa8c16' }}>{formatBytes(bytes)}</span>,
      sorter: (a, b) => a.uploaded - b.uploaded,
    },
    {
      title: 'Packets',
      key: 'packets',
      render: (record) => formatNumber(record.rx_packets + record.tx_packets),
    },
    {
      title: 'Connections',
      dataIndex: 'connections',
      key: 'connections',
      render: (conns) => formatNumber(conns),
    },
  ]

  // Данные для Pie Chart
  const pieData = protocols.slice(0, 7).map((p, idx) => ({
    name: `${p.protocol}${p.port ? ':' + p.port : ''}`,
    value: p.downloaded + p.uploaded,
  }))

  // Данные для Bar Chart
  const barData = protocols.slice(0, 7).map((p) => ({
    name: `${p.protocol}${p.port ? ':' + p.port : ''}`,
    Download: p.downloaded,
    Upload: p.uploaded,
  }))

  return (
    <div>
      <Card title="Devices">
        <Table
          columns={columns}
          dataSource={devices}
          rowKey="mac"
          pagination={{ pageSize: 20 }}
          onRow={(record) => ({
            onClick: () => handleRowClick(record),
            style: { cursor: 'pointer' },
          })}
        />
      </Card>

      <Modal
        title={null}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        width={1200}
        footer={null}
        styles={{
          body: { padding: 0 }
        }}
      >
        {selectedDevice && (
          <div style={{ padding: 24 }}>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
              <Title level={3} style={{ margin: 0 }}>
                Device: {selectedDevice.friendly_name}
              </Title>
              <Text type="secondary">
                IP Address: {selectedDevice.ip}
              </Text>
            </div>

            {/* Statistics */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="Total Download"
                    value={formatBytes(selectedDevice.downloaded)}
                    valueStyle={{ color: '#52c41a', fontSize: 20 }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="Total Upload"
                    value={formatBytes(selectedDevice.uploaded)}
                    valueStyle={{ color: '#fa8c16', fontSize: 20 }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="Total Connections"
                    value={formatNumber(selectedDevice.connections)}
                    valueStyle={{ fontSize: 20 }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="Total Packets"
                    value={formatNumber(selectedDevice.rx_packets + selectedDevice.tx_packets)}
                    valueStyle={{ fontSize: 20 }}
                  />
                </Card>
              </Col>
            </Row>

            {protocolsLoading ? (
              <div style={{ textAlign: 'center', padding: '50px 0' }}>
                <Spin size="large" />
              </div>
            ) : protocols.length > 0 ? (
              <>
                {/* Charts */}
                <Row gutter={24} style={{ marginBottom: 24 }}>
                  <Col span={12}>
                    <Card title="Traffic by Protocol" size="small">
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => percent > 0.05 ? `${name} (${(percent * 100).toFixed(1)}%)` : ''}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip formatter={(value) => formatBytes(value)} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card title="Download vs Upload by Protocol" size="small">
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={barData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                          <XAxis dataKey="name" stroke="#8b949e" angle={-45} textAnchor="end" height={80} />
                          <YAxis stroke="#8b949e" tickFormatter={(value) => formatBytes(value)} />
                          <RechartsTooltip
                            contentStyle={{ backgroundColor: '#161b22', border: '1px solid #30363d' }}
                            formatter={(value) => formatBytes(value)}
                          />
                          <Legend />
                          <Bar dataKey="Download" fill="#52c41a" />
                          <Bar dataKey="Upload" fill="#fa8c16" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Card>
                  </Col>
                </Row>

                <Divider />

                {/* Protocol Details Table */}
                <div>
                  <Title level={5} style={{ marginBottom: 16 }}>Protocol Details</Title>
                  <Table
                    columns={protocolColumns}
                    dataSource={protocols}
                    rowKey={(record) => `${record.protocol}:${record.port}`}
                    pagination={{ pageSize: 10 }}
                    size="small"
                  />
                </div>
              </>
            ) : (
              <Empty description="No protocol data available" />
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default Devices
