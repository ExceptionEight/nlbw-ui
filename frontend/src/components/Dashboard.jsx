import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Download, Upload, Laptop, Activity, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatBytes, formatNumber } from '../utils/format'
import { useIsMobile } from '../App'

function Dashboard({ dateRange }) {
  const isMobile = useIsMobile()
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

  const maxNameLength = isMobile ? 8 : 15
  const topDevicesChart = topDevices.map((d) => ({
    name: d.friendly_name.length > maxNameLength ? d.friendly_name.substring(0, maxNameLength) + '...' : d.friendly_name,
    Downloaded: d.downloaded,
    Uploaded: d.uploaded,
  }))

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
          <BarChart data={topDevicesChart}>
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
            />
            <YAxis
              stroke="var(--text-secondary)"
              fontSize={12}
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
              {topDevices.map((device, index) => (
                <motion.tr
                  key={device.mac}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.05 }}
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
      </motion.div>
    </div>
  )
}

export default Dashboard
