import React, { useState, useEffect } from 'react'
import { Card, Spin, Empty, Tooltip } from 'antd'
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
    // Переходим на вкладку Devices и устанавливаем дату
    const dayDate = dayjs(date)
    setDateRange([dayDate, dayDate])
    setActiveTab('devices')
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!calendarData || calendarData.length === 0) {
    return <Empty description="No data available" />
  }

  // Группировка по годам (только дни с трафиком > 0)
  const dataByYear = {}
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
    }
  })

  const years = Object.keys(dataByYear).sort()

  return (
    <div>
      {years.map((year) => (
        <Card
          key={year}
          title={`Activity Matrix ${year}`}
          style={{ marginBottom: 24 }}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '20px 0'
          }}>
            <HeatMap
              value={dataByYear[year]}
              width={1100}
              rectSize={14}
              legendCellSize={0}
              startDate={new Date(`${year}-01-01`)}
              endDate={new Date(`${year}-12-31`)}
              rectProps={{
                rx: 3,
              }}
              panelColors={{
                0: '#333',       // темно-серый для дней без данных
                1: '#0e4429',
                8: '#006d32',
                16: '#26a641',
                32: '#39d353',
              }}
              monthLabels={['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']}
              weekLabels={['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']}
              style={{
                color: '#fff',
              }}
              rectRender={(props, data) => {
                return (
                  <Tooltip
                    title={
                      <div>
                        <div><strong>{data.date}</strong></div>
                        <div style={{ color: '#52c41a' }}>
                          Total Traffic: {formatBytes(data.count || 0)}
                        </div>
                      </div>
                    }
                  >
                    <rect
                      {...props}
                      onClick={() => {
                        if (data.count > 0) {
                          handleDayClick(data.date)
                        }
                      }}
                      style={{
                        cursor: data.count > 0 ? 'pointer' : 'default',
                        transition: 'opacity 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (data.count > 0) {
                          e.target.style.opacity = '0.7'
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.opacity = '1'
                      }}
                    />
                  </Tooltip>
                )
              }}
            />
          </div>
        </Card>
      ))}
    </div>
  )
}

export default ActivityMatrix
