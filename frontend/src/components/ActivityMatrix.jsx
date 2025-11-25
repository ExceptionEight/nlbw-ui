import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Calendar, TrendingUp, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import HeatMap from '@uiw/react-heat-map'
import dayjs from 'dayjs'
import { formatBytes } from '../utils/format'
import { useIsMobile } from '../App'

// Helper to format bytes compactly (1.2G, 456M)
function formatBytesCompact(bytes) {
  if (!bytes || bytes === 0) return '0'
  const GB = 1024 * 1024 * 1024
  const MB = 1024 * 1024
  if (bytes >= GB) {
    return `${(bytes / GB).toFixed(1)}G`
  } else if (bytes >= MB) {
    return `${Math.round(bytes / MB)}M`
  } else {
    return `${Math.round(bytes / 1024)}K`
  }
}

// Mobile month calendar component - compact grid
function MobileMonthCalendar({ year, month, data, onDayClick, getColorLevel, monthStats }) {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  
  const firstDay = dayjs(`${year}-${String(month + 1).padStart(2, '0')}-01`)
  const daysInMonth = firstDay.daysInMonth()
  const startDayOfWeek = firstDay.day()
  
  const colorMap = {
    0: 'rgba(255, 255, 255, 0.05)',
    1: 'rgba(0, 245, 255, 0.25)',
    2: 'rgba(0, 245, 255, 0.45)',
    3: 'rgba(178, 75, 243, 0.55)',
    4: 'rgba(255, 16, 240, 0.75)',
  }
  
  const weeks = []
  let currentWeek = new Array(7).fill(null)
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const dayData = data.find(d => d.date === date)
    const dayOfWeek = (startDayOfWeek + day - 1) % 7
    
    if (day === 1) {
      currentWeek = new Array(7).fill(null)
    }
    
    currentWeek[dayOfWeek] = {
      day,
      date,
      value: dayData?.count || 0,
      traffic: dayData?.traffic || 0,
    }
    
    if (dayOfWeek === 6 || day === daysInMonth) {
      weeks.push([...currentWeek])
      currentWeek = new Array(7).fill(null)
    }
  }

  const hasTraffic = monthStats && (monthStats.downloaded > 0 || monthStats.uploaded > 0)
  
  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.02)',
      borderRadius: '10px',
      padding: '8px',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    }}>
      <div style={{
        fontSize: '11px',
        fontWeight: '600',
        color: '#00f5ff',
        marginBottom: '6px',
        textAlign: 'center',
      }}>
        {monthNames[month]}
      </div>
      
      <div style={{ flex: 1 }}>
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '2px',
            marginBottom: '2px',
          }}>
            {week.map((dayData, dayIdx) => (
              <motion.div
                key={dayIdx}
                whileTap={dayData && dayData.value > 0 ? { scale: 0.8 } : {}}
                onClick={() => dayData && dayData.value > 0 && onDayClick(dayData.date)}
                style={{
                  aspectRatio: '1',
                  borderRadius: '2px',
                  background: dayData ? colorMap[getColorLevel(dayData.traffic)] : 'transparent',
                  cursor: dayData && dayData.value > 0 ? 'pointer' : 'default',
                }}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Month traffic stats - always at bottom */}
      <div style={{
        marginTop: 'auto',
        paddingTop: '6px',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        fontSize: '10px',
        minHeight: '20px',
      }}>
        {hasTraffic ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#00f2fe' }}>
              <ArrowDownCircle size={10} />
              <span>{formatBytesCompact(monthStats.downloaded)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#fee140' }}>
              <ArrowUpCircle size={10} />
              <span>{formatBytesCompact(monthStats.uploaded)}</span>
            </div>
          </>
        ) : (
          <span style={{ color: 'var(--text-muted)', opacity: 0.3 }}>—</span>
        )}
      </div>
    </div>
  )
}

function ActivityMatrix({ setActiveTab, setDateRange }) {
  const isMobile = useIsMobile()
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
  const dataByYearForMobile = {}
  const monthlyStats = {} // { 'YYYY-MM': { downloaded, uploaded } }
  let totalTraffic = 0
  let activeDays = 0

  calendarData.forEach((item) => {
    const year = item.date.substring(0, 4)
    
    // For mobile view - include all days
    if (!dataByYearForMobile[year]) {
      dataByYearForMobile[year] = []
    }
    dataByYearForMobile[year].push({
      date: item.date,
      count: item.value > 0 ? 1 : 0,
      traffic: item.value,
    })

    // Aggregate monthly stats
    const monthKey = item.date.substring(0, 7) // YYYY-MM
    if (!monthlyStats[monthKey]) {
      monthlyStats[monthKey] = { downloaded: 0, uploaded: 0 }
    }
    monthlyStats[monthKey].downloaded += item.downloaded || 0
    monthlyStats[monthKey].uploaded += item.uploaded || 0
    
    // For desktop view - only days with data
    if (item.value > 0) {
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
    return value < 1 * GB ? 1 :
           value < 5 * GB ? 2 :
           value < 15 * GB ? 3 : 4
  }

  // Find min and max dates with data
  const datesWithData = calendarData.filter(d => d.value > 0).map(d => d.date).sort()
  const minDate = datesWithData.length > 0 ? dayjs(datesWithData[0]) : null
  const maxDate = datesWithData.length > 0 ? dayjs(datesWithData[datesWithData.length - 1]) : null

  // Helper to check if month should be displayed (within data range)
  const isMonthInRange = (year, month) => {
    if (!minDate || !maxDate) return false
    // Simple string comparison for YYYY-MM format
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`
    const minMonthKey = minDate.format('YYYY-MM')
    const maxMonthKey = maxDate.format('YYYY-MM')
    return monthKey >= minMonthKey && monthKey <= maxMonthKey
  }

  // Get month stats helper
  const getMonthStats = (year, month) => {
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`
    return monthlyStats[monthKey] || { downloaded: 0, uploaded: 0 }
  }

  // Mobile year view - grid of months (only months in data range)
  const MobileYearView = ({ year }) => {
    const monthsInRange = Array.from({ length: 12 }, (_, i) => i).filter(month => isMonthInRange(year, month))
    
    if (monthsInRange.length === 0) return null
    
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '8px',
      }}>
        {monthsInRange.map((month) => (
          <MobileMonthCalendar
            key={month}
            year={year}
            month={month}
            data={dataByYearForMobile[year] || []}
            onDayClick={handleDayClick}
            getColorLevel={getColorLevel}
            monthStats={getMonthStats(year, month)}
          />
        ))}
      </div>
    )
  }

  return (
    <div>
      {/* Stats */}
      <motion.div
        initial={{ y: 20 }}
        animate={{ y: 0 }}
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: isMobile ? '12px' : '24px',
          marginBottom: isMobile ? '24px' : '40px',
        }}
      >
        <div className="stat-card">
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            marginBottom: isMobile ? '8px' : '12px' 
          }}>
            <span style={{ 
              fontSize: isMobile ? '11px' : '14px', 
              color: 'var(--text-secondary)', 
              fontWeight: '500' 
            }}>
              {isMobile ? 'Days' : 'Total Days'}
            </span>
            {!isMobile && <Calendar size={20} color="#00f5ff" />}
          </div>
          <div style={{
            fontSize: isMobile ? '22px' : '32px',
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
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            marginBottom: isMobile ? '8px' : '12px' 
          }}>
            <span style={{ 
              fontSize: isMobile ? '11px' : '14px', 
              color: 'var(--text-secondary)', 
              fontWeight: '500' 
            }}>
              {isMobile ? 'Total' : 'Total Traffic'}
            </span>
            {!isMobile && <TrendingUp size={20} color="#fa709a" />}
          </div>
          <div style={{
            fontSize: isMobile ? '22px' : '32px',
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
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            marginBottom: isMobile ? '8px' : '12px' 
          }}>
            <span style={{ 
              fontSize: isMobile ? '11px' : '14px', 
              color: 'var(--text-secondary)', 
              fontWeight: '500' 
            }}>
              {isMobile ? 'Avg/Day' : 'Avg per Day'}
            </span>
            {!isMobile && <TrendingUp size={20} color="#667eea" />}
          </div>
          <div style={{
            fontSize: isMobile ? '22px' : '32px',
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
          initial={{ y: 30 }}
          animate={{ y: 0 }}
          transition={{ delay: yearIndex * 0.2 }}
          className="glass-card"
          style={{ marginBottom: isMobile ? '24px' : '40px' }}
        >
          <div style={{ marginBottom: isMobile ? '16px' : '24px' }}>
            <h3 style={{
              fontSize: isMobile ? '18px' : '24px',
              fontWeight: '700',
              background: 'linear-gradient(135deg, #00f5ff, #b24bf3)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '8px',
            }}>
              {year}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: isMobile ? '12px' : '14px', margin: 0 }}>
              Tap any day to view details
            </p>
          </div>

          {isMobile ? (
            <MobileYearView year={year} />
          ) : (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              padding: '20px 0',
              overflowX: 'auto',
            }}>
              <HeatMap
                value={dataByYear[year].map(item => {
                  const level = getColorLevel(item.count)
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
          )}

          {/* Legend */}
          <div style={{
            marginTop: isMobile ? '16px' : '24px',
            paddingTop: isMobile ? '12px' : '20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: isMobile ? '6px' : '8px',
          }}>
            <span style={{ fontSize: isMobile ? '11px' : '13px', color: 'var(--text-secondary)' }}>Less</span>
            {[
              'rgba(255, 255, 255, 0.05)',
              'rgba(0, 245, 255, 0.25)',
              'rgba(0, 245, 255, 0.45)',
              'rgba(178, 75, 243, 0.55)',
              'rgba(255, 16, 240, 0.75)',
            ].map((color, i) => (
              <div key={i} style={{
                width: isMobile ? '12px' : '14px',
                height: isMobile ? '12px' : '14px',
                borderRadius: '3px',
                background: color,
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }} />
            ))}
            <span style={{ fontSize: isMobile ? '11px' : '13px', color: 'var(--text-secondary)' }}>More</span>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

export default ActivityMatrix
