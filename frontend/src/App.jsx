import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Calendar,
  LineChart,
  GitCompare,
  Trophy
} from 'lucide-react'
import logo from './assets/icon.svg'
import dayjs from 'dayjs'

import Dashboard from './components/Dashboard'
import ActivityMatrix from './components/ActivityMatrix'
import Charts from './components/Charts'
import Comparison from './components/Comparison'
import Achievements from './components/Achievements'
import DateRangePicker from './components/DateRangePicker'
import DeviceFilterPicker from './components/DeviceFilterPicker'

// Mobile breakpoint - covers phones and small tablets
export const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= MOBILE_BREAKPOINT)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return isMobile
}

function App() {
  const isMobile = useIsMobile()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [dateRange, setDateRange] = useState([
    dayjs().subtract(30, 'days'),
    dayjs(),
  ])
  const [availableDates, setAvailableDates] = useState([])
  const [minMaxDates, setMinMaxDates] = useState(null)
  
  // Activity filter state
  const [activitySelectedMacs, setActivitySelectedMacs] = useState([])
  const [activityDevices, setActivityDevices] = useState([])

  useEffect(() => {
    const init = async () => {
      try {
        // Load calendar first
        const calendarRes = await fetch('/api/calendar')
        const calendarData = await calendarRes.json()
        
        const dates = calendarData.filter(d => d.value > 0).map(d => d.date).sort()
        setAvailableDates(dates)

        if (dates.length > 0) {
          const min = dayjs(dates[0])
          const max = dayjs(dates[dates.length - 1])
          setMinMaxDates({ min, max })
          setDateRange([min, max])

          // Immediately fetch devices (no extra render cycle)
          const from = min.format('YYYY-MM-DD')
          const to = max.format('YYYY-MM-DD')
          const summaryRes = await fetch(`/api/summary?from=${from}&to=${to}`)
          const summaryData = await summaryRes.json()
          
          // Используем готовые агрегированные данные с сервера
          const devicesArray = Object.values(summaryData.devices || {})
            .map(device => ({
              mac: device.mac,
              friendly_name: device.friendly_name,
              total: device.downloaded + device.uploaded,
            }))
            .sort((a, b) => b.total - a.total)
          setActivityDevices(devicesArray)
        }
      } catch (err) {
        console.error('Failed to initialize:', err)
      }
    }
    
    init()
  }, [])

  const tabs = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'activity', label: 'Activity', icon: Calendar },
    { key: 'charts', label: 'Charts', icon: LineChart },
    { key: 'comparison', label: 'Compare', icon: GitCompare },
    { key: 'achievements', label: 'Achievements', icon: Trophy },
  ]

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard dateRange={dateRange} />
      case 'activity':
        return <ActivityMatrix setActiveTab={setActiveTab} setDateRange={setDateRange} selectedMacs={activitySelectedMacs} />
      case 'achievements':
        return <Achievements />
      case 'charts':
        return <Charts dateRange={dateRange} />
      case 'comparison':
        return <Comparison />
      default:
        return <Dashboard dateRange={dateRange} />
    }
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '40px' }}>
      {/* Header */}
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 1000,
          padding: isMobile ? '12px 16px' : '20px 40px',
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px' }}>
            <img
              src={logo}
              alt="NLBW Logo"
              style={{
                height: isMobile ? '32px' : '40px',
                width: 'auto',
                filter: 'drop-shadow(0 0 8px rgba(0, 245, 255, 0.3))',
              }}
            />
            {!isMobile && (
              <h1 style={{
                margin: 0,
                fontSize: '28px',
                fontWeight: '800',
                background: 'linear-gradient(135deg, #00f5ff, #b24bf3)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                NLBW UI
              </h1>
            )}
          </div>

          {/* Date Range Picker */}
          {activeTab !== 'activity' && activeTab !== 'comparison' && activeTab !== 'achievements' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <DateRangePicker
                dateRange={dateRange}
                onChange={setDateRange}
                availableDates={availableDates}
              />
            </motion.div>
          )}

          {/* Device Filter for Activity */}
          {activeTab === 'activity' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <DeviceFilterPicker
                selectedMacs={activitySelectedMacs}
                onChange={setActivitySelectedMacs}
                availableDevices={activityDevices}
              />
            </motion.div>
          )}
        </div>
      </motion.header>

      {/* Navigation Tabs */}
      <motion.nav
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        style={{
          padding: isMobile ? '16px 16px 0' : '30px 40px 0',
          maxWidth: '1400px',
          margin: '0 auto',
        }}
      >
        <div style={{
          display: 'flex',
          gap: isMobile ? '4px' : '12px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          paddingBottom: '0',
          justifyContent: isMobile ? 'space-around' : 'flex-start',
        }}>
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.key

            return (
              <motion.button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                whileHover={isMobile ? {} : { y: -2 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  position: 'relative',
                  background: 'transparent',
                  border: 'none',
                  padding: isMobile ? '12px 16px' : '16px 24px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  color: isActive ? '#00f5ff' : '#7a8ba3',
                  fontSize: '15px',
                  fontWeight: isActive ? '600' : '500',
                  transition: 'color 0.3s ease',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                <Icon size={isMobile ? 22 : 20} />
                {!isMobile && <span>{tab.label}</span>}

                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: '3px',
                      background: 'linear-gradient(90deg, #00f5ff, #b24bf3)',
                      borderRadius: '3px 3px 0 0',
                    }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.button>
            )
          })}
        </div>
      </motion.nav>

      {/* Content */}
      <main style={{
        padding: isMobile ? '20px 16px' : '40px',
        maxWidth: '1400px',
        margin: '0 auto',
      }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}

export default App
