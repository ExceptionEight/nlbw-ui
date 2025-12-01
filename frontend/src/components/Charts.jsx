import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LineChart as ChartIcon, Filter, Check, X } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatBytes } from '../utils/format'
import { useIsMobile } from '../App'

function Charts({ dateRange }) {
  const isMobile = useIsMobile()
  const [loading, setLoading] = useState(true)
  const [timeseries, setTimeseries] = useState([])
  const [devices, setDevices] = useState([])
  const [selectedMacs, setSelectedMacs] = useState([])
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterMounted, setFilterMounted] = useState(false)

  useEffect(() => {
    fetchDevices()
  }, [dateRange])

  useEffect(() => {
    fetchTimeseries()
  }, [dateRange, selectedMacs])

  useEffect(() => {
    if (filterOpen && !filterMounted) {
      setFilterMounted(true)
    }
  }, [filterOpen, filterMounted])

  const fetchDevices = async () => {
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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <div className="spinner" />
      </div>
    )
  }

  if (!timeseries || timeseries.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--text-muted)' }}>
        <ChartIcon size={64} style={{ marginBottom: '20px', opacity: 0.3 }} />
        <p>No data available</p>
      </div>
    )
  }

  const chartData = timeseries.map((day) => ({
    date: day.date,
    Downloaded: day.downloaded,
    Uploaded: day.uploaded,
  }))

  return (
    <div style={{ position: 'relative' }}>
      {/* Filter Panel - Desktop: сидит под графиком справа */}
      {!isMobile && filterMounted && (
        <div
          className="glass-card"
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: '300px',
            zIndex: 1,
            opacity: filterOpen ? 1 : 0,
            transform: filterOpen ? 'translateX(0)' : 'translateX(30px)',
            transition: 'opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1), transform 0.45s cubic-bezier(0.34, 1.3, 0.64, 1)',
            pointerEvents: filterOpen ? 'auto' : 'none',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{
              fontSize: '18px',
              fontWeight: '700',
              background: 'linear-gradient(135deg, #b24bf3, #ff10f0)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '8px',
            }}>
              Filter Devices
            </h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
              Select devices to visualize
            </p>
          </div>

          {selectedMacs.length > 0 && (
            <button
              onClick={() => setSelectedMacs([])}
              className="modern-button"
              style={{
                width: '100%',
                marginBottom: '16px',
                background: 'rgba(255, 16, 240, 0.1)',
                border: '1px solid rgba(255, 16, 240, 0.3)',
              }}
            >
              Clear All
            </button>
          )}

          <div style={{ flex: 1, overflowY: 'auto', marginRight: '-10px', paddingRight: '10px' }}>
            {devices.map((device) => {
              const isSelected = selectedMacs.includes(device.mac)

              return (
                <motion.div
                  key={device.mac}
                  onClick={() => handleDeviceToggle(device.mac)}
                  style={{
                    background: isSelected ? 'rgba(0, 245, 255, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${isSelected ? 'rgba(0, 245, 255, 0.3)' : 'rgba(255, 255, 255, 0.05)'}`,
                    borderRadius: '12px',
                    padding: '12px',
                    marginBottom: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                  whileHover={{
                    backgroundColor: isSelected ? 'rgba(0, 245, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  }}
                  transition={{ duration: 0 }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: isSelected ? '#00f5ff' : '#fff',
                      marginBottom: '4px',
                    }}>
                      {device.friendly_name}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: 'var(--text-muted)',
                    }}>
                      {formatBytes(device.total)}
                    </div>
                  </div>

                  {isSelected && (
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #00f5ff, #b24bf3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Check size={14} color="#fff" />
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>
      )}

      {/* Main Chart - поверх, сужается влево при открытии фильтра */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="glass-card"
        style={{
          position: 'relative',
          zIndex: 2,
          width: !isMobile && filterOpen ? 'calc(100% - 324px)' : '100%',
          transition: 'width 0.45s cubic-bezier(0.34, 1.3, 0.64, 1)',
        }}
      >
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{
              fontSize: '24px',
              fontWeight: '700',
              background: 'linear-gradient(135deg, #00f5ff, #b24bf3)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '8px',
            }}>
              Traffic Over Time
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
              {selectedMacs.length === 0
                ? 'Showing all devices'
                : `Showing ${selectedMacs.length} selected device${selectedMacs.length > 1 ? 's' : ''}`}
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setFilterOpen(!filterOpen)}
            className="modern-button"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
            }}
          >
            <Filter size={18} />
            Filter
          </motion.button>
        </div>

        <ResponsiveContainer width="100%" height={500}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorDownloaded" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00f2fe" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#4facfe" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="colorUploaded" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#fee140" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#fa709a" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
            <XAxis
              dataKey="date"
              stroke="var(--text-secondary)"
              fontSize={12}
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
            <Area
              type="monotone"
              dataKey="Downloaded"
              stroke="#00f2fe"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorDownloaded)"
            />
            <Area
              type="monotone"
              dataKey="Uploaded"
              stroke="#fee140"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorUploaded)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Filter Panel - Mobile Fullscreen */}
      {isMobile && (
        <AnimatePresence>
          {filterOpen && (
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
                background: 'rgba(10, 14, 39, 0.95)',
                backdropFilter: 'blur(20px)',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Header */}
              <div style={{
                padding: '20px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div>
                  <h4 style={{
                    fontSize: '20px',
                    fontWeight: '700',
                    background: 'linear-gradient(135deg, #b24bf3, #ff10f0)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    marginBottom: '4px',
                  }}>
                    Filter Devices
                  </h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
                    {selectedMacs.length > 0 ? `${selectedMacs.length} selected` : 'Select devices to filter'}
                  </p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setFilterOpen(false)}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <X size={20} color="#fff" />
                </motion.button>
              </div>

              {/* Clear All */}
              {selectedMacs.length > 0 && (
                <div style={{ padding: '12px 20px' }}>
                  <button
                    onClick={() => setSelectedMacs([])}
                    className="modern-button"
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'rgba(255, 16, 240, 0.1)',
                      border: '1px solid rgba(255, 16, 240, 0.3)',
                    }}
                  >
                    Clear All ({selectedMacs.length})
                  </button>
                </div>
              )}

              {/* Device List */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 20px' }}>
                {devices.map((device, index) => {
                  const isSelected = selectedMacs.includes(device.mac)

                  return (
                    <motion.div
                      key={device.mac}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      onClick={() => handleDeviceToggle(device.mac)}
                      style={{
                        background: isSelected ? 'rgba(0, 245, 255, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                        border: `1px solid ${isSelected ? 'rgba(0, 245, 255, 0.3)' : 'rgba(255, 255, 255, 0.05)'}`,
                        borderRadius: '12px',
                        padding: '14px 16px',
                        marginBottom: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '15px',
                          fontWeight: '600',
                          color: isSelected ? '#00f5ff' : '#fff',
                          marginBottom: '4px',
                        }}>
                          {device.friendly_name}
                        </div>
                        <div style={{
                          fontSize: '13px',
                          color: 'var(--text-muted)',
                        }}>
                          {formatBytes(device.total)}
                        </div>
                      </div>

                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #00f5ff, #b24bf3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Check size={16} color="#fff" />
                        </motion.div>
                      )}
                    </motion.div>
                  )
                })}
              </div>

              {/* Apply Button */}
              <div style={{
                padding: '16px 20px',
                paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              }}>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setFilterOpen(false)}
                  className="modern-button"
                  style={{
                    width: '100%',
                    padding: '14px',
                    fontSize: '15px',
                  }}
                >
                  Apply Filter
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  )
}

export default Charts
