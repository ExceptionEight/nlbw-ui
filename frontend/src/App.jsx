import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Calendar,
  Laptop,
  LineChart,
  GitCompare,
  Wifi
} from 'lucide-react'
import dayjs from 'dayjs'

import Dashboard from './components/Dashboard'
import ActivityMatrix from './components/ActivityMatrix'
import Devices from './components/Devices'
import Charts from './components/Charts'
import Comparison from './components/Comparison'
import DateRangePicker from './components/DateRangePicker'

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [dateRange, setDateRange] = useState([
    dayjs().subtract(30, 'days'),
    dayjs(),
  ])
  const [availableDates, setAvailableDates] = useState([])
  const [minMaxDates, setMinMaxDates] = useState(null)

  useEffect(() => {
    fetch('/api/calendar')
      .then(res => res.json())
      .then(data => {
        const dates = data.filter(d => d.value > 0).map(d => d.date).sort()
        setAvailableDates(dates)

        if (dates.length > 0) {
          const min = dayjs(dates[0])
          const max = dayjs(dates[dates.length - 1])
          setMinMaxDates({ min, max })
          // Set default date range to all available dates
          setDateRange([min, max])
        }
      })
      .catch(err => console.error('Failed to fetch available dates:', err))
  }, [])

  const tabs = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'activity', label: 'Activity', icon: Calendar },
    { key: 'devices', label: 'Devices', icon: Laptop },
    { key: 'charts', label: 'Charts', icon: LineChart },
    { key: 'comparison', label: 'Compare', icon: GitCompare },
  ]

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard dateRange={dateRange} />
      case 'activity':
        return <ActivityMatrix setActiveTab={setActiveTab} setDateRange={setDateRange} />
      case 'devices':
        return <Devices dateRange={dateRange} />
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
          padding: '20px 40px',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Wifi size={32} color="#00f5ff" />
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
          </div>

          {/* Date Range Picker */}
          {activeTab !== 'activity' && activeTab !== 'comparison' && (
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
        </div>
      </motion.header>

      {/* Navigation Tabs */}
      <motion.nav
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        style={{
          padding: '30px 40px 0',
          maxWidth: '1400px',
          margin: '0 auto',
        }}
      >
        <div style={{
          display: 'flex',
          gap: '12px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          paddingBottom: '0',
        }}>
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.key

            return (
              <motion.button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  position: 'relative',
                  background: 'transparent',
                  border: 'none',
                  padding: '16px 24px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: isActive ? '#00f5ff' : '#7a8ba3',
                  fontSize: '15px',
                  fontWeight: isActive ? '600' : '500',
                  transition: 'color 0.3s ease',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                <Icon size={20} />
                <span>{tab.label}</span>

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
        padding: '40px',
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
