import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, Upload, Laptop, Activity, TrendingUp, X, Wifi, ChevronLeft, ChevronRight } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip } from 'recharts'
import { formatBytes, formatNumber } from '../utils/format'
import { useIsMobile } from '../App'

const COLORS = ['#00f2fe', '#4facfe', '#fee140', '#fa709a', '#667eea', '#764ba2', '#f093fb', '#f5576c', '#39ff14', '#ff10f0']
const ITEMS_PER_PAGE = 30

function Dashboard({ dateRange }) {
  const isMobile = useIsMobile()
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState(null)
  const [selectedDevice, setSelectedDevice] = useState(null)
  const [protocols, setProtocols] = useState([])
  const [modalVisible, setModalVisible] = useState(false)
  const [protocolsLoading, setProtocolsLoading] = useState(false)
  const [availableDates, setAvailableDates] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [hoveredProtocol, setHoveredProtocol] = useState(null)
  const [selectedProtocol, setSelectedProtocol] = useState(null)

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
    fetchSummary()
    setCurrentPage(1)
  }, [dateRange])

  useEffect(() => {
    if (modalVisible) {
      const scrollY = window.scrollY
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      return () => {
        document.body.style.overflow = ''
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''
        window.scrollTo(0, scrollY)
      }
    }
  }, [modalVisible])

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

  if (!summary) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--text-muted)' }}>
        <Activity size={64} style={{ marginBottom: '20px', opacity: 0.3 }} />
        <p>No data available</p>
      </div>
    )
  }

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

  const allDevices = Object.values(deviceStats)
    .sort((a, b) => b.downloaded - a.downloaded)

  const topDevices = allDevices.slice(0, 10)

  const topDevicesChart = topDevices.map((d) => ({
    name: d.friendly_name,
    Downloaded: d.downloaded,
    Uploaded: d.uploaded,
  }))

  // Pagination
  const totalPages = Math.ceil(allDevices.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedDevices = allDevices.slice(startIndex, endIndex)

  const statCards = [
    {
      title: 'Total Downloaded',
      value: formatBytes(summary.total_downloaded),
      icon: Download,
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      color: '#00f2fe',
    },
    {
      title: 'Total Uploaded',
      value: formatBytes(summary.total_uploaded),
      icon: Upload,
      gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      color: '#fa709a',
    },
    {
      title: 'Total Devices',
      value: Object.keys(deviceStats).length,
      icon: Laptop,
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: '#667eea',
    },
    {
      title: 'Total Traffic',
      value: formatBytes(summary.total_downloaded + summary.total_uploaded),
      icon: TrendingUp,
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      color: '#f5576c',
    },
  ]

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  }

  return (
    <div>
      {/* Stat Cards */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: isMobile ? '12px' : '24px',
          marginBottom: isMobile ? '24px' : '40px',
        }}
      >
        {statCards.map((card, index) => {
          const Icon = card.icon
          return (
            <motion.div
              key={index}
              variants={item}
              whileHover={isMobile ? {} : { scale: 1.02, y: -4 }}
              transition={{ duration: 0.15 }}
              className="stat-card"
              style={{
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{
                position: 'absolute',
                top: -50,
                right: -50,
                width: isMobile ? 100 : 150,
                height: isMobile ? 100 : 150,
                background: card.gradient,
                borderRadius: '50%',
                opacity: 0.1,
                filter: 'blur(40px)',
              }} />

              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: isMobile ? '8px' : '12px',
                }}>
                  <span style={{
                    fontSize: isMobile ? '11px' : '14px',
                    color: 'var(--text-secondary)',
                    fontWeight: '500',
                  }}>
                    {card.title}
                  </span>
                  <div style={{
                    width: isMobile ? '28px' : '40px',
                    height: isMobile ? '28px' : '40px',
                    borderRadius: isMobile ? '8px' : '12px',
                    background: `${card.color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Icon size={isMobile ? 14 : 20} color={card.color} />
                  </div>
                </div>

                <div style={{
                  fontSize: isMobile ? '20px' : '32px',
                  fontWeight: '800',
                  background: card.gradient,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                  {card.value}
                </div>
              </div>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Top Devices Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card"
        style={{ marginBottom: isMobile ? '24px' : '40px' }}
      >
        <h3 style={{
          marginBottom: isMobile ? '16px' : '24px',
          fontSize: isMobile ? '16px' : '20px',
          fontWeight: '700',
          background: 'linear-gradient(135deg, #00f5ff, #b24bf3)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          Top 10 Devices by Traffic
        </h3>

        <ResponsiveContainer width="100%" height={isMobile ? 280 : 400}>
          <BarChart data={topDevicesChart} margin={{ top: 5, right: 5, bottom: 5, left: -15 }}>
            <defs>
              <linearGradient id="downloadGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00f2fe" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#4facfe" stopOpacity={0.3} />
              </linearGradient>
              <linearGradient id="uploadGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fee140" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#fa709a" stopOpacity={0.3} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
            <XAxis
              dataKey="name"
              stroke="var(--text-secondary)"
              fontSize={isMobile ? 10 : 12}
              angle={-45}
              textAnchor="end"
              height={isMobile ? 70 : 100}
              tickFormatter={(value) => {
                const maxLen = isMobile ? 14 : 19
                return value.length > maxLen ? value.substring(0, maxLen) + '...' : value
              }}
            />
            <YAxis
              stroke="var(--text-secondary)"
              fontSize={12}
              width={80}
              tickFormatter={(value) => formatBytes(value)}
            />
            <Tooltip
              contentStyle={{
                background: 'rgba(10, 14, 39, 0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '12px',
              }}
              formatter={(value) => formatBytes(value)}
              labelStyle={{ color: '#fff', marginBottom: '8px' }}
            />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="circle"
            />
            <Bar dataKey="Downloaded" fill="url(#downloadGradient)" radius={[8, 8, 0, 0]} />
            <Bar dataKey="Uploaded" fill="url(#uploadGradient)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* All Devices Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass-card"
      >
        <h3 style={{
          marginBottom: isMobile ? '16px' : '24px',
          fontSize: isMobile ? '16px' : '20px',
          fontWeight: '700',
          background: 'linear-gradient(135deg, #b24bf3, #ff10f0)',
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
                {!isMobile && <th>IP Address</th>}
                <th>Downloaded</th>
                <th>Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {paginatedDevices.map((device, index) => (
                <motion.tr
                  key={device.mac}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.05 }}
                  onClick={() => handleRowClick(device)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px' }}>
                      <div style={{
                        width: isMobile ? '8px' : '10px',
                        height: isMobile ? '8px' : '10px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #00f5ff, #b24bf3)',
                        flexShrink: 0,
                      }} />
                      <strong style={{ fontSize: isMobile ? '13px' : 'inherit' }}>
                        {isMobile && device.friendly_name.length > 12
                          ? device.friendly_name.substring(0, 12) + '...'
                          : device.friendly_name}
                      </strong>
                    </div>
                  </td>
                  {!isMobile && (
                    <td>
                      <code style={{ fontSize: '13px' }}>{device.ip}</code>
                    </td>
                  )}
                  <td>
                    <span className="badge badge-success">
                      {formatBytes(device.downloaded)}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-warning">
                      {formatBytes(device.uploaded)}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: isMobile ? '8px' : '12px',
            marginTop: isMobile ? '16px' : '24px',
            paddingTop: isMobile ? '16px' : '20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          }}>
            <motion.button
              whileHover={currentPage > 1 ? { scale: 1.05 } : {}}
              whileTap={currentPage > 1 ? { scale: 0.95 } : {}}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{
                background: currentPage === 1 ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 245, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: isMobile ? '8px 12px' : '10px 16px',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                color: currentPage === 1 ? 'var(--text-muted)' : '#00f5ff',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: isMobile ? '13px' : '14px',
                fontWeight: '500',
                opacity: currentPage === 1 ? 0.5 : 1,
              }}
            >
              <ChevronLeft size={isMobile ? 16 : 18} />
              {!isMobile && 'Previous'}
            </motion.button>

            <div style={{
              color: 'var(--text-secondary)',
              fontSize: isMobile ? '13px' : '14px',
              fontWeight: '500',
            }}>
              Page {currentPage} of {totalPages}
            </div>

            <motion.button
              whileHover={currentPage < totalPages ? { scale: 1.05 } : {}}
              whileTap={currentPage < totalPages ? { scale: 0.95 } : {}}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{
                background: currentPage === totalPages ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 245, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: isMobile ? '8px 12px' : '10px 16px',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                color: currentPage === totalPages ? 'var(--text-muted)' : '#00f5ff',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: isMobile ? '13px' : '14px',
                fontWeight: '500',
                opacity: currentPage === totalPages ? 0.5 : 1,
              }}
            >
              {!isMobile && 'Next'}
              <ChevronRight size={isMobile ? 16 : 18} />
            </motion.button>
          </div>
        )}
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
              padding: isMobile ? '0' : '20px',
            }}
            onClick={() => {
              setModalVisible(false)
              setSelectedProtocol(null)
              setHoveredProtocol(null)
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 50 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card"
              style={{
                maxWidth: isMobile ? '100%' : '1200px',
                width: '100%',
                height: isMobile ? '100%' : 'auto',
                maxHeight: isMobile ? '100%' : '90vh',
                overflowY: 'auto',
                position: isMobile ? 'fixed' : 'relative',
                top: isMobile ? 0 : 'auto',
                left: isMobile ? 0 : 'auto',
                right: isMobile ? 0 : 'auto',
                bottom: isMobile ? 0 : 'auto',
                borderRadius: isMobile ? '0' : '20px',
                margin: isMobile ? '0' : undefined,
              }}
            >
              {/* Header */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                marginBottom: isMobile ? '16px' : '24px',
                paddingBottom: isMobile ? '12px' : '20px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '16px', flex: 1, minWidth: 0 }}>
                  <div style={{
                    width: isMobile ? '48px' : '64px',
                    height: isMobile ? '48px' : '64px',
                    borderRadius: isMobile ? '12px' : '16px',
                    background: 'linear-gradient(135deg, #00f5ff, #b24bf3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Wifi size={isMobile ? 24 : 32} color="#fff" />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h2 style={{
                      fontSize: isMobile ? '18px' : '28px',
                      fontWeight: '800',
                      background: 'linear-gradient(135deg, #00f5ff, #b24bf3)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      marginBottom: '4px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {selectedDevice.friendly_name}
                    </h2>
                    <p style={{
                      color: 'var(--text-secondary)',
                      fontSize: isMobile ? '11px' : '14px',
                      margin: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
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
                gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: isMobile ? '10px' : '16px',
                marginBottom: isMobile ? '20px' : '32px',
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
                      <Icon size={isMobile ? 18 : 24} color="#00f5ff" style={{ marginBottom: isMobile ? '4px' : '8px' }} />
                      <div style={{ fontSize: isMobile ? '11px' : '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        {stat.label}
                      </div>
                      <div style={{
                        fontSize: isMobile ? '15px' : '20px',
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
                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(400px, 1fr))',
                    gap: isMobile ? '16px' : '24px',
                    marginBottom: isMobile ? '20px' : '32px',
                  }}>
                    {/* FIXED TRAFFIC BY PROTOCOL CARD */}
                    <div
                      className="gradient-card"
                      onClick={() => {
                        // Сброс выделения при клике в любое свободное место карточки
                        setSelectedProtocol(null)
                        setHoveredProtocol(null)
                      }}
                    >
                      <h4
                        style={{ marginBottom: isMobile ? '12px' : '20px', fontSize: isMobile ? '14px' : '16px', fontWeight: '600' }}
                      >
                        Traffic by Protocol
                      </h4>

                      <div style={{
                        display: 'flex',
                        flexDirection: isMobile ? 'column' : 'row',
                        alignItems: isMobile ? 'center' : 'flex-start',
                        gap: isMobile ? '16px' : '24px',
                      }}>
                        {/* Pie Chart */}
                        <div style={{
                          flex: isMobile ? '0 0 auto' : '0 0 65%',
                          width: isMobile ? '100%' : 'auto',
                        }}>
                          <ResponsiveContainer width="100%" height={isMobile ? 200 : 280}>
                            <PieChart>
                              <Pie
                                data={protocols.slice(0, 8).map((p, idx) => ({
                                  name: `${p.protocol}${p.port ? ':' + p.port : ''}`,
                                  value: p.downloaded + p.uploaded,
                                }))}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                outerRadius={isMobile ? 80 : 100}
                                fill="#8884d8"
                                dataKey="value"
                                // Переносим onClick сюда, т.к. onClick на Cell работает нестабильно в Recharts
                                onClick={(data, index, e) => {
                                  // Останавливаем всплытие к карточке
                                  // В Recharts аргумент 'e' обычно идет третьим
                                  const event = e || index; 
                                  if (event && event.stopPropagation) {
                                    event.stopPropagation();
                                  }

                                  const protocolName = data.name;
                                  if (selectedProtocol === protocolName) {
                                    setSelectedProtocol(null);
                                  } else {
                                    setSelectedProtocol(protocolName);
                                  }
                                }}
                                style={{ cursor: 'pointer' }}
                              >
                                {protocols.slice(0, 8).map((entry, index) => {
                                  const protocolName = `${entry.protocol}${entry.port ? ':' + entry.port : ''}`
                                  const isDimmed = selectedProtocol
                                    ? (selectedProtocol !== protocolName)
                                    : (hoveredProtocol && hoveredProtocol !== protocolName)

                                  return (
                                    <Cell
                                      key={`cell-${index}`}
                                      fill={COLORS[index % COLORS.length]}
                                      opacity={isDimmed ? 0.3 : 1}
                                      style={{
                                        cursor: 'pointer',
                                        transition: 'opacity 0.2s ease',
                                        outline: 'none'
                                      }}
                                      onMouseEnter={() => setHoveredProtocol(protocolName)}
                                      onMouseLeave={() => setHoveredProtocol(null)}
                                      // Удален onClick отсюда, вся логика перенесена в Pie
                                    />
                                  )
                                })}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Custom Legend */}
                        <div style={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: isMobile ? '8px' : '10px',
                          minWidth: 0,
                        }}>
                          {protocols.slice(0, 8).map((proto, index) => {
                            const protocolName = `${proto.protocol}${proto.port ? ':' + proto.port : ''}`
                            const totalTraffic = protocols.slice(0, 8).reduce((sum, p) => sum + p.downloaded + p.uploaded, 0)
                            const percentage = ((proto.downloaded + proto.uploaded) / totalTraffic * 100).toFixed(1)
                            const isActive = hoveredProtocol === protocolName || selectedProtocol === protocolName
                            const isDimmed = selectedProtocol
                              ? (selectedProtocol !== protocolName)
                              : (hoveredProtocol && hoveredProtocol !== protocolName)

                            return (
                              <motion.div
                                key={index}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                onMouseEnter={() => setHoveredProtocol(protocolName)}
                                onMouseLeave={() => setHoveredProtocol(null)}
                                onClick={(e) => {
                                  // Останавливаем всплытие, чтобы не сбросилось
                                  e.stopPropagation()
                                  if (selectedProtocol === protocolName) {
                                    setSelectedProtocol(null)
                                  } else {
                                    setSelectedProtocol(protocolName)
                                  }
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: isMobile ? '8px' : '12px',
                                  padding: isMobile ? '6px 8px' : '8px 12px',
                                  borderRadius: '8px',
                                  background: isActive ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                                  cursor: 'pointer',
                                  transition: 'opacity 0.2s ease, background 0.2s ease',
                                  opacity: isDimmed ? 0.3 : 1,
                                  willChange: 'opacity',
                                }}
                                whileHover={!isMobile ? {
                                  background: 'rgba(255, 255, 255, 0.05)',
                                } : {}}
                              >
                                {/* Color indicator */}
                                <div style={{
                                  width: isMobile ? '10px' : '12px',
                                  height: isMobile ? '10px' : '12px',
                                  borderRadius: '50%',
                                  background: COLORS[index % COLORS.length],
                                  flexShrink: 0,
                                  boxShadow: isActive ? `0 0 10px ${COLORS[index % COLORS.length]}` : 'none',
                                  transition: 'box-shadow 0.2s ease',
                                }} />

                                {/* Protocol name */}
                                <div style={{
                                  flex: 1,
                                  fontSize: isMobile ? '12px' : '13px',
                                  fontWeight: isActive ? '600' : '500',
                                  color: isActive ? '#fff' : '#c8c8c8',
                                  transition: 'all 0.2s ease',
                                  minWidth: 0,
                                }}>
                                  {protocolName}
                                </div>

                                {/* Percentage */}
                                <div style={{
                                  fontSize: isMobile ? '12px' : '13px',
                                  fontWeight: '600',
                                  color: isActive ? COLORS[index % COLORS.length] : 'var(--text-muted)',
                                  transition: 'color 0.2s ease',
                                  flexShrink: 0,
                                }}>
                                  {percentage}%
                                </div>
                              </motion.div>
                            )
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="gradient-card">
                      <h4 style={{ marginBottom: isMobile ? '12px' : '20px', fontSize: isMobile ? '14px' : '16px', fontWeight: '600' }}>
                        Download vs Upload
                      </h4>
                      <ResponsiveContainer width="100%" height={isMobile ? 220 : 300}>
                        <BarChart data={protocols.slice(0, 8).map((p) => ({
                          name: `${p.protocol}${p.port ? ':' + p.port : ''}`,
                          Download: p.downloaded,
                          Upload: p.uploaded,
                        }))}>
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
                            fontSize={isMobile ? 9 : 11}
                            angle={-45}
                            textAnchor="end"
                            height={isMobile ? 60 : 100}
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
                              color: '#fff',
                            }}
                            itemStyle={{
                              color: '#fff',
                            }}
                            labelStyle={{
                              color: '#fff',
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
                      marginBottom: isMobile ? '12px' : '16px',
                      fontSize: isMobile ? '14px' : '18px',
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
                            {!isMobile && <th>Port</th>}
                            <th>Download</th>
                            <th>Upload</th>
                            {!isMobile && <th>Packets</th>}
                            {!isMobile && <th>Connections</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {protocols.slice(0, isMobile ? 5 : 10).map((proto, i) => (
                            <motion.tr
                              key={i}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: i * 0.05 }}
                            >
                              <td>
                                <span className="badge badge-info">
                                  {proto.protocol}{isMobile && proto.port ? `:${proto.port}` : ''}
                                </span>
                              </td>
                              {!isMobile && <td>{proto.port}</td>}
                              <td>{formatBytes(proto.downloaded)}</td>
                              <td>{formatBytes(proto.uploaded)}</td>
                              {!isMobile && <td>{formatNumber(proto.rx_packets + proto.tx_packets)}</td>}
                              {!isMobile && <td>{formatNumber(proto.connections)}</td>}
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

export default Dashboard
