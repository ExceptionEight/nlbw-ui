import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Calendar, TrendingUp } from 'lucide-react'
import HeatMap from '@uiw/react-heat-map'
import dayjs from 'dayjs'
import { formatBytes } from '../utils/format'

function ActivityMatrix({ setActiveTab, setDateRange }) {
  const [loading, setLoading] = useState(true)
  const [calendarData, setCalendarData] = useState([])

  useEffect(() => {
    fetchCalendarData()
  }, [])

  const fetchCalendarData = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/calendar')
      const data = await response.json()
      setCalendarData(data)
    } catch (error) {
      console.error('Failed to fetch calendar data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDayClick = (date) => {
    const dayDate = dayjs(date)
    setDateRange([dayDate, dayDate])
    setActiveTab('devices')
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <div className="spinner" />
      </div>
    )
  }

  if (!calendarData || calendarData.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--text-muted)' }}>
        <Calendar size={64} style={{ marginBottom: '20px', opacity: 0.3 }} />
        <p>No data available</p>
      </div>
    )
  }

  // Группировка по годам
  const dataByYear = {}
  let totalTraffic = 0
  let activeDays = 0

  calendarData.forEach((item) => {
    if (item.value > 0) {
      const year = item.date.substring(0, 4)
      if (!dataByYear[year]) {
        dataByYear[year] = []
      }
      dataByYear[year].push({
        date: item.date,
        count: item.value,
      })
      totalTraffic += item.value
      activeDays++
    }
  })

  const years = Object.keys(dataByYear).sort()
  const avgTraffic = activeDays > 0 ? totalTraffic / activeDays : 0

  // Helper function to get color level based on traffic
  const getColorLevel = (value) => {
    if (!value || value === 0) return 0
    const GB = 1024 * 1024 * 1024
    const level =
      value < 1 * GB ? 1 :
      value < 5 * GB ? 2 :
      value < 15 * GB ? 3 : 4

    // Debug log
    if (value > 5 * GB) {
      console.log(`Traffic: ${(value / GB).toFixed(2)} GB -> Level ${level}`)
    }

    return level
  }

  return (
    <div>
      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '24px',
          marginBottom: '40px',
        }}
      >
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '500' }}>
              Total Days
            </span>
            <Calendar size={20} color="#00f5ff" />
          </div>
          <div style={{
            fontSize: '32px',
            fontWeight: '800',
            background: 'linear-gradient(135deg, #00f5ff, #b24bf3)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            {activeDays}
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '500' }}>
              Total Traffic
            </span>
            <TrendingUp size={20} color="#fa709a" />
          </div>
          <div style={{
            fontSize: '32px',
            fontWeight: '800',
            background: 'linear-gradient(135deg, #fa709a, #fee140)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            {formatBytes(totalTraffic)}
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '500' }}>
              Avg per Day
            </span>
            <TrendingUp size={20} color="#667eea" />
          </div>
          <div style={{
            fontSize: '32px',
            fontWeight: '800',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            {formatBytes(avgTraffic)}
          </div>
        </div>
      </motion.div>

      {/* Heatmaps by Year */}
      {years.map((year, yearIndex) => (
        <motion.div
          key={year}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: yearIndex * 0.2 }}
          className="glass-card"
          style={{ marginBottom: '40px' }}
        >
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{
              fontSize: '24px',
              fontWeight: '700',
              background: 'linear-gradient(135deg, #00f5ff, #b24bf3)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '8px',
            }}>
              Activity Matrix {year}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
              Click any day to view detailed statistics
            </p>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '20px 0',
            overflowX: 'auto',
          }}>
            <HeatMap
              value={dataByYear[year].map(item => {
                const level = getColorLevel(item.count)
                const gb = (item.count / (1024 * 1024 * 1024)).toFixed(2)
                console.log(`Date: ${item.date}, Traffic: ${gb} GB, Level: ${level}`)
                return {
                  date: item.date,
                  count: level,
                  content: item.count,
                }
              })}
              width={1100}
              rectSize={14}
              legendCellSize={0}
              startDate={new Date(`${year}-01-01`)}
              endDate={new Date(`${year}-12-31`)}
              rectProps={{
                rx: 3,
              }}
              panelColors={{
                0: 'rgba(255, 255, 255, 0.05)',
                1: 'rgba(0, 245, 255, 0.2)',
                2: 'rgba(0, 245, 255, 0.4)',
                3: 'rgba(178, 75, 243, 0.5)',
                4: 'rgba(255, 16, 240, 0.7)',
              }}
              monthLabels={['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']}
              weekLabels={['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']}
              style={{
                color: '#fff',
              }}
              rectRender={(props, data) => {
                const hasData = data.count > 0

                // Get color based on level
                const colorMap = {
                  0: 'rgba(255, 255, 255, 0.05)',
                  1: 'rgba(0, 245, 255, 0.2)',
                  2: 'rgba(0, 245, 255, 0.4)',
                  3: 'rgba(178, 75, 243, 0.5)',
                  4: 'rgba(255, 16, 240, 0.7)',
                }
                const fillColor = colorMap[data.count] || colorMap[0]

                return (
                  <g>
                    <rect
                      {...props}
                      fill={fillColor}
                      onClick={() => {
                        if (hasData) {
                          handleDayClick(data.date)
                        }
                      }}
                      style={{
                        cursor: hasData ? 'pointer' : 'default',
                        transition: 'all 0.2s ease',
                        filter: hasData ? 'none' : 'none',
                      }}
                      onMouseEnter={(e) => {
                        if (hasData) {
                          e.target.style.filter = 'brightness(1.3)'
                          e.target.style.strokeWidth = '2'
                          e.target.style.stroke = '#00f5ff'
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.filter = 'brightness(1)'
                        e.target.style.strokeWidth = '0'
                      }}
                    />
                    {hasData && (
                      <title>
                        {data.date}
                        {'\n'}
                        Total Traffic: {formatBytes(data.content || 0)}
                      </title>
                    )}
                  </g>
                )
              }}
            />
          </div>

          {/* Legend */}
          <div style={{
            marginTop: '24px',
            paddingTop: '20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Less</span>
            {[
              'rgba(255, 255, 255, 0.05)',
              'rgba(0, 245, 255, 0.2)',
              'rgba(0, 245, 255, 0.4)',
              'rgba(178, 75, 243, 0.5)',
              'rgba(255, 16, 240, 0.7)',
            ].map((color, i) => (
              <div key={i} style={{
                width: '14px',
                height: '14px',
                borderRadius: '3px',
                background: color,
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }} />
            ))}
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>More</span>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

export default ActivityMatrix
