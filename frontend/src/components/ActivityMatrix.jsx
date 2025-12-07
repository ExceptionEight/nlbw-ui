import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Calendar, TrendingUp, ArrowDown, ArrowUp, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
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

// Desktop year heatmap with month hover
function DesktopYearHeatmap({ year, dataByYear, monthlyStats, getColorLevel, handleDayClick }) {
  const [hoveredMonth, setHoveredMonth] = useState(null)
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  const getMonthFromDate = (dateStr) => {
    if (!dateStr) return null
    // Handle both 'YYYY-MM-DD' and 'YYYY/M/D' formats
    const parts = dateStr.includes('/') ? dateStr.split('/') : dateStr.split('-')
    const year = parts[0]
    const month = parts[1]?.padStart(2, '0')
    return `${year}-${month}`
  }

  const hoveredMonthStats = hoveredMonth ? monthlyStats[hoveredMonth] : null
  const hasMonthStats = hoveredMonthStats && (hoveredMonthStats.downloaded > 0 || hoveredMonthStats.uploaded > 0)

  return (
    <div>
      <div 
        style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '20px 0',
          overflowX: 'auto',
        }}
      >
        <div 
          style={{ 
            width: 'fit-content',
          }}
          onMouseLeave={() => setHoveredMonth(null)}
        >
          <HeatMap
          value={dataByYear[year].map(item => {
            const level = getColorLevel(item.count)
            return {
              date: item.date,
              count: level,
              content: item.count,
            }
          })}
          width={900}
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
          monthLabels={monthNames}
          weekLabels={['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']}
          style={{
            color: '#fff',
          }}
          rectRender={(props, data) => {
            const hasData = data.count > 0
            const cellMonth = getMonthFromDate(data.date)
            const isDimmed = hoveredMonth && cellMonth !== hoveredMonth

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
                  opacity={isDimmed ? 0.35 : 1}
                  onClick={() => {
                    if (hasData) {
                      handleDayClick(data.date)
                    }
                  }}
                  style={{
                    cursor: hasData ? 'pointer' : 'default',
                    transition: 'opacity 0.25s ease, filter 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    setHoveredMonth(cellMonth)
                    if (hasData) {
                      e.target.style.filter = 'brightness(1.3)'
                      e.target.style.strokeWidth = '2'
                      e.target.style.stroke = '#00f5ff'
                    }
                  }}
                  onMouseLeave={(e) => {
                    // Don't reset hoveredMonth here - let the container handle it
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
      </div>

      {/* Legend with month stats */}
      <div style={{
        marginTop: '24px',
        paddingTop: '20px',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}>
        {/* Month stats - left side */}
        {hasMonthStats && (
          <div style={{
            position: 'absolute',
            left: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '12px',
            opacity: 1,
            transition: 'opacity 0.25s ease',
            pointerEvents: 'none',
          }}>
            <span style={{ 
              fontWeight: '600',
              color: '#00f5ff',
            }}>
              {monthNames[parseInt(hoveredMonth.split('-')[1]) - 1]}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#00f2fe' }}>
              <ArrowDownCircle size={12} />
              <span>{formatBytes(hoveredMonthStats.downloaded)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#fee140' }}>
              <ArrowUpCircle size={12} />
              <span>{formatBytes(hoveredMonthStats.uploaded)}</span>
            </div>
          </div>
        )}

        {/* Less...More - center */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Less</span>
          {[
            'rgba(255, 255, 255, 0.05)',
            'rgba(0, 245, 255, 0.25)',
            'rgba(0, 245, 255, 0.45)',
            'rgba(178, 75, 243, 0.55)',
            'rgba(255, 16, 240, 0.75)',
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
    setActiveTab('dashboard')
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
  const yearlyStats = {} // { 'YYYY': { downloaded, uploaded } }
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

    // Aggregate yearly stats
    if (!yearlyStats[year]) {
      yearlyStats[year] = { downloaded: 0, uploaded: 0 }
    }
    yearlyStats[year].downloaded += item.downloaded || 0
    yearlyStats[year].uploaded += item.uploaded || 0
    
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
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
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
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: yearIndex * 0.2 }}
          className="glass-card"
          style={{ marginBottom: isMobile ? '24px' : '40px' }}
        >
          <div style={{ 
            marginBottom: isMobile ? '16px' : '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}>
            <div>
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
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: isMobile ? '2px' : '4px',
              fontSize: isMobile ? '12px' : '14px',
              fontWeight: '500',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#23d2ee' }}>
                <ArrowDown size={isMobile ? 12 : 14} />
                <span>{formatBytes(yearlyStats[year]?.downloaded || 0)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#c084fc' }}>
                <ArrowUp size={isMobile ? 12 : 14} />
                <span>{formatBytes(yearlyStats[year]?.uploaded || 0)}</span>
              </div>
            </div>
          </div>

          {isMobile ? (
            <MobileYearView year={year} />
          ) : (
            <DesktopYearHeatmap
              year={year}
              dataByYear={dataByYear}
              monthlyStats={monthlyStats}
              getColorLevel={getColorLevel}
              handleDayClick={handleDayClick}
            />
          )}

          {/* Legend - only for mobile, desktop has it inside DesktopYearHeatmap */}
          {isMobile && (
            <div style={{
              marginTop: '16px',
              paddingTop: '12px',
              borderTop: '1px solid rgba(255, 255, 255, 0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Less</span>
              {[
                'rgba(255, 255, 255, 0.05)',
                'rgba(0, 245, 255, 0.25)',
                'rgba(0, 245, 255, 0.45)',
                'rgba(178, 75, 243, 0.55)',
                'rgba(255, 16, 240, 0.75)',
              ].map((color, i) => (
                <div key={i} style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '3px',
                  background: color,
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }} />
              ))}
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>More</span>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  )
}

export default ActivityMatrix
