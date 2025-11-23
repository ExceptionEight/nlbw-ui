import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Laptop, Download, Upload, Activity, X, Wifi } from 'lucide-react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatBytes, formatNumber } from '../utils/format'

const COLORS = ['#00f2fe', '#4facfe', '#fee140', '#fa709a', '#667eea', '#764ba2', '#f093fb', '#f5576c', '#39ff14', '#ff10f0']

function Devices({ dateRange }) {
  const [loading, setLoading] = useState(true)
  const [devices, setDevices] = useState([])
  const [selectedDevice, setSelectedDevice] = useState(null)
  const [protocols, setProtocols] = useState([])
  const [modalVisible, setModalVisible] = useState(false)
  const [protocolsLoading, setProtocolsLoading] = useState(false)
  const [availableDates, setAvailableDates] = useState([])

  useEffect(() => {
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
      const startDate = dateRange[0].format('YYYY-MM-DD')
      const endDate = dateRange[1].format('YYYY-MM-DD')
      const datesToFetch = availableDates.filter(date => date >= startDate && date <= endDate)

      const protocolMap = {}

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
          // Continue
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

  const handleRowClick = async (device) => {
    setSelectedDevice(device)
    setModalVisible(true)
    await fetchProtocols(device.mac)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <div className="spinner" />
      </div>
    )
  }

  if (!devices || devices.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--text-muted)' }}>
        <Laptop size={64} style={{ marginBottom: '20px', opacity: 0.3 }} />
        <p>No devices found</p>
      </div>
    )
  }

  const pieData = protocols.slice(0, 8).map((p, idx) => ({
    name: `${p.protocol}${p.port ? ':' + p.port : ''}`,
    value: p.downloaded + p.uploaded,
  }))

  const barData = protocols.slice(0, 8).map((p) => ({
    name: `${p.protocol}${p.port ? ':' + p.port : ''}`,
    Download: p.downloaded,
    Upload: p.uploaded,
  }))

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card"
      >
        <h3 style={{
          marginBottom: '24px',
          fontSize: '24px',
          fontWeight: '700',
          background: 'linear-gradient(135deg, #00f5ff, #b24bf3)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          All Devices
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table className="modern-table">
            <thead>
              <tr>
                <th>Device</th>
                <th>MAC / IP</th>
                <th>Downloaded</th>
                <th>Uploaded</th>
                <th>Packets</th>
                <th>Connections</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device, index) => (
                <motion.tr
                  key={device.mac}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleRowClick(device)}
                >
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #00f5ff, #b24bf3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <Laptop size={20} color="#fff" />
                      </div>
                      <strong>{device.friendly_name}</strong>
                    </div>
                  </td>
                  <td>
                    <div>
                      <code style={{ fontSize: '11px', opacity: 0.7 }}>{device.mac}</code>
                      <div style={{ fontSize: '13px', marginTop: '2px' }}>{device.ip}</div>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-success">
                      <Download size={12} style={{ marginRight: '4px' }} />
                      {formatBytes(device.downloaded)}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-warning">
                      <Upload size={12} style={{ marginRight: '4px' }} />
                      {formatBytes(device.uploaded)}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-info">
                      {formatNumber(device.rx_packets + device.tx_packets)}
                    </span>
                  </td>
                  <td>{formatNumber(device.connections)}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {modalVisible && selectedDevice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '20px',
            }}
            onClick={() => setModalVisible(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 50 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card"
              style={{
                maxWidth: '1200px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                position: 'relative',
              }}
            >
              {/* Header */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                marginBottom: '24px',
                paddingBottom: '20px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #00f5ff, #b24bf3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Wifi size={32} color="#fff" />
                  </div>
                  <div>
                    <h2 style={{
                      fontSize: '28px',
                      fontWeight: '800',
                      background: 'linear-gradient(135deg, #00f5ff, #b24bf3)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      marginBottom: '6px',
                    }}>
                      {selectedDevice.friendly_name}
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
                      {selectedDevice.ip} • {selectedDevice.mac}
                    </p>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setModalVisible(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#fff',
                  }}
                >
                  <X size={20} />
                </motion.button>
              </div>

              {/* Stats */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginBottom: '32px',
              }}>
                {[
                  { label: 'Downloaded', value: formatBytes(selectedDevice.downloaded), icon: Download, gradient: 'linear-gradient(135deg, #4facfe, #00f2fe)' },
                  { label: 'Uploaded', value: formatBytes(selectedDevice.uploaded), icon: Upload, gradient: 'linear-gradient(135deg, #fa709a, #fee140)' },
                  { label: 'Connections', value: formatNumber(selectedDevice.connections), icon: Activity, gradient: 'linear-gradient(135deg, #667eea, #764ba2)' },
                  { label: 'Packets', value: formatNumber(selectedDevice.rx_packets + selectedDevice.tx_packets), icon: Activity, gradient: 'linear-gradient(135deg, #f093fb, #f5576c)' },
                ].map((stat, i) => {
                  const Icon = stat.icon
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="stat-card"
                      style={{ textAlign: 'center' }}
                    >
                      <Icon size={24} color="#00f5ff" style={{ marginBottom: '8px' }} />
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        {stat.label}
                      </div>
                      <div style={{
                        fontSize: '20px',
                        fontWeight: '700',
                        background: stat.gradient,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }}>
                        {stat.value}
                      </div>
                    </motion.div>
                  )
                })}
              </div>

              {protocolsLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
                  <div className="spinner" />
                </div>
              ) : protocols.length > 0 ? (
                <>
                  {/* Charts */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                    gap: '24px',
                    marginBottom: '32px',
                  }}>
                    <div className="gradient-card">
                      <h4 style={{ marginBottom: '20px', fontSize: '16px', fontWeight: '600' }}>
                        Traffic by Protocol
                      </h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => percent > 0.05 ? `${name} (${(percent * 100).toFixed(0)}%)` : ''}
                            outerRadius={90}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip
                            contentStyle={{
                              background: 'rgba(10, 14, 39, 0.95)',
                              backdropFilter: 'blur(20px)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              borderRadius: '12px',
                            }}
                            formatter={(value) => formatBytes(value)}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="gradient-card">
                      <h4 style={{ marginBottom: '20px', fontSize: '16px', fontWeight: '600' }}>
                        Download vs Upload
                      </h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={barData}>
                          <defs>
                            <linearGradient id="barDownload" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#00f2fe" stopOpacity={0.8} />
                              <stop offset="100%" stopColor="#4facfe" stopOpacity={0.3} />
                            </linearGradient>
                            <linearGradient id="barUpload" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#fee140" stopOpacity={0.8} />
                              <stop offset="100%" stopColor="#fa709a" stopOpacity={0.3} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                          <XAxis
                            dataKey="name"
                            stroke="var(--text-secondary)"
                            fontSize={11}
                            angle={-45}
                            textAnchor="end"
                            height={100}
                          />
                          <YAxis
                            stroke="var(--text-secondary)"
                            fontSize={11}
                            tickFormatter={(value) => formatBytes(value)}
                          />
                          <RechartsTooltip
                            contentStyle={{
                              background: 'rgba(10, 14, 39, 0.95)',
                              backdropFilter: 'blur(20px)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              borderRadius: '12px',
                            }}
                            formatter={(value) => formatBytes(value)}
                          />
                          <Legend iconType="circle" />
                          <Bar dataKey="Download" fill="url(#barDownload)" radius={[8, 8, 0, 0]} />
                          <Bar dataKey="Upload" fill="url(#barUpload)" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Protocol Table */}
                  <div>
                    <h4 style={{
                      marginBottom: '16px',
                      fontSize: '18px',
                      fontWeight: '700',
                      background: 'linear-gradient(135deg, #b24bf3, #ff10f0)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}>
                      Protocol Details
                    </h4>

                    <div style={{ overflowX: 'auto' }}>
                      <table className="modern-table">
                        <thead>
                          <tr>
                            <th>Protocol</th>
                            <th>Port</th>
                            <th>Download</th>
                            <th>Upload</th>
                            <th>Packets</th>
                            <th>Connections</th>
                          </tr>
                        </thead>
                        <tbody>
                          {protocols.slice(0, 10).map((proto, i) => (
                            <motion.tr
                              key={i}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: i * 0.05 }}
                            >
                              <td>
                                <span className="badge badge-info">{proto.protocol}</span>
                              </td>
                              <td>{proto.port}</td>
                              <td>{formatBytes(proto.downloaded)}</td>
                              <td>{formatBytes(proto.uploaded)}</td>
                              <td>{formatNumber(proto.rx_packets + proto.tx_packets)}</td>
                              <td>{formatNumber(proto.connections)}</td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                  <Activity size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
                  <p>No protocol data available</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Devices
