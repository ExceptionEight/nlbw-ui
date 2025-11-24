import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, X, ChevronLeft, ChevronRight } from 'lucide-react'
import DatePicker from 'react-datepicker'
import dayjs from 'dayjs'
import 'react-datepicker/dist/react-datepicker.css'
import { useIsMobile } from '../App'

function DateRangePicker({ dateRange, onChange, availableDates = [], usePortal = false }) {
  const isMobile = useIsMobile()
  const [isOpen, setIsOpen] = useState(false)
  const [startDate, setStartDate] = useState(dateRange[0].toDate())
  const [endDate, setEndDate] = useState(dateRange[1].toDate())
  
  // For mobile custom calendar
  const [currentMonth, setCurrentMonth] = useState(dayjs())
  const [selectingStart, setSelectingStart] = useState(true)

  // Sync with dateRange prop
  useEffect(() => {
    setStartDate(dateRange[0].toDate())
    setEndDate(dateRange[1].toDate())
  }, [dateRange])

  const handleDateChange = (dates) => {
    const [start, end] = dates
    setStartDate(start)
    setEndDate(end)
  }

  const handleApply = () => {
    if (startDate && endDate) {
      onChange([dayjs(startDate), dayjs(endDate)])
      setIsOpen(false)
    }
  }

  const handleCancel = () => {
    setStartDate(dateRange[0].toDate())
    setEndDate(dateRange[1].toDate())
    setIsOpen(false)
  }

  // Create set of available dates for fast lookup
  const availableDateSet = new Set(availableDates)

  // Custom day class name function
  const getDayClassName = (date) => {
    const dateStr = dayjs(date).format('YYYY-MM-DD')
    const hasData = availableDateSet.has(dateStr)

    if (!hasData) {
      return 'no-data-day'
    }
    return 'has-data-day'
  }

  // Mobile calendar helpers
  const handleMobileDayClick = (date) => {
    const dateStr = date.format('YYYY-MM-DD')
    if (!availableDateSet.has(dateStr)) return
    
    const dateObj = date.toDate()
    
    if (selectingStart) {
      setStartDate(dateObj)
      setEndDate(null)
      setSelectingStart(false)
    } else {
      if (date.isBefore(dayjs(startDate))) {
        setStartDate(dateObj)
        setEndDate(null)
      } else {
        setEndDate(dateObj)
        setSelectingStart(true)
      }
    }
  }

  const isDateInRange = (date) => {
    if (!startDate || !endDate) return false
    const d = date.valueOf()
    return d >= dayjs(startDate).startOf('day').valueOf() && d <= dayjs(endDate).endOf('day').valueOf()
  }

  const isDateSelected = (date) => {
    const dateStr = date.format('YYYY-MM-DD')
    const startStr = startDate ? dayjs(startDate).format('YYYY-MM-DD') : null
    const endStr = endDate ? dayjs(endDate).format('YYYY-MM-DD') : null
    return dateStr === startStr || dateStr === endStr
  }

  // Mobile calendar component
  const MobileCalendar = () => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const firstDay = currentMonth.startOf('month')
    const daysInMonth = currentMonth.daysInMonth()
    const startDayOfWeek = firstDay.day()
    
    const weeks = []
    let currentWeek = new Array(7).fill(null)
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = currentMonth.date(day)
      const dayOfWeek = (startDayOfWeek + day - 1) % 7
      
      if (day === 1) {
        currentWeek = new Array(7).fill(null)
      }
      
      currentWeek[dayOfWeek] = date
      
      if (dayOfWeek === 6 || day === daysInMonth) {
        weeks.push([...currentWeek])
        currentWeek = new Array(7).fill(null)
      }
    }
    
    return (
      <div>
        {/* Month navigation */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
        }}>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setCurrentMonth(currentMonth.subtract(1, 'month'))}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              width: '44px',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#fff',
            }}
          >
            <ChevronLeft size={24} />
          </motion.button>
          
          <div style={{
            fontSize: '18px',
            fontWeight: '700',
            color: '#fff',
          }}>
            {currentMonth.format('MMMM YYYY')}
          </div>
          
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setCurrentMonth(currentMonth.add(1, 'month'))}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              width: '44px',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#fff',
            }}
          >
            <ChevronRight size={24} />
          </motion.button>
        </div>
        
        {/* Day names */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '4px',
          marginBottom: '8px',
        }}>
          {dayNames.map((name, i) => (
            <div key={i} style={{
              fontSize: '12px',
              fontWeight: '600',
              color: 'var(--text-muted)',
              textAlign: 'center',
              padding: '8px 0',
            }}>
              {name}
            </div>
          ))}
        </div>
        
        {/* Weeks */}
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '4px',
            marginBottom: '4px',
          }}>
            {week.map((date, dayIdx) => {
              if (!date) {
                return <div key={dayIdx} style={{ aspectRatio: '1' }} />
              }
              
              const dateStr = date.format('YYYY-MM-DD')
              const hasData = availableDateSet.has(dateStr)
              const selected = isDateSelected(date)
              const inRange = isDateInRange(date)
              
              return (
                <motion.div
                  key={dayIdx}
                  whileTap={hasData ? { scale: 0.9 } : {}}
                  onClick={() => handleMobileDayClick(date)}
                  style={{
                    aspectRatio: '1',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '15px',
                    fontWeight: selected ? '700' : '500',
                    cursor: hasData ? 'pointer' : 'default',
                    background: selected 
                      ? 'linear-gradient(135deg, #00f5ff, #00c2cc)'
                      : inRange 
                        ? 'rgba(0, 245, 255, 0.2)'
                        : hasData 
                          ? 'rgba(255, 255, 255, 0.05)'
                          : 'transparent',
                    color: selected 
                      ? '#0a0e27'
                      : hasData 
                        ? '#fff'
                        : 'rgba(255, 255, 255, 0.2)',
                    border: selected 
                      ? 'none'
                      : hasData 
                        ? '1px solid rgba(255, 255, 255, 0.1)'
                        : '1px solid transparent',
                  }}
                >
                  {date.date()}
                </motion.div>
              )
            })}
          </div>
        ))}
        
        {/* Selection hint */}
        <div style={{
          marginTop: '16px',
          padding: '12px',
          background: 'rgba(0, 245, 255, 0.1)',
          borderRadius: '10px',
          fontSize: '13px',
          color: 'var(--text-secondary)',
          textAlign: 'center',
        }}>
          {selectingStart 
            ? 'Tap to select start date'
            : 'Tap to select end date'}
        </div>
      </div>
    )
  }

  // Mobile fullscreen modal
  const mobileModalContent = (
    <AnimatePresence>
      {isOpen && (
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
            background: 'var(--bg-primary)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Calendar size={24} color="#00f5ff" />
              <h3 style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: '700',
                color: '#fff',
              }}>
                Select Dates
              </h3>
            </div>

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleCancel}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
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
          
          {/* Selected range display */}
          <div style={{
            padding: '16px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          }}>
            <div style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <div style={{
                flex: 1,
                padding: '12px',
                background: selectingStart ? 'rgba(0, 245, 255, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                border: selectingStart ? '2px solid #00f5ff' : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  FROM
                </div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff' }}>
                  {startDate ? dayjs(startDate).format('MMM DD, YYYY') : '—'}
                </div>
              </div>
              
              <div style={{ color: 'var(--text-muted)' }}>→</div>
              
              <div style={{
                flex: 1,
                padding: '12px',
                background: !selectingStart ? 'rgba(0, 245, 255, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                border: !selectingStart ? '2px solid #00f5ff' : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  TO
                </div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff' }}>
                  {endDate ? dayjs(endDate).format('MMM DD, YYYY') : '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Calendar */}
          <div style={{
            flex: 1,
            padding: '16px',
            overflowY: 'auto',
          }}>
            <MobileCalendar />
          </div>

          {/* Actions */}
          <div style={{
            display: 'flex',
            gap: '12px',
            padding: '16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(255, 255, 255, 0.02)',
          }}>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleCancel}
              style={{
                flex: 1,
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.03)',
                color: '#fff',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Cancel
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleApply}
              disabled={!startDate || !endDate}
              style={{
                flex: 1,
                padding: '16px',
                fontSize: '16px',
                borderRadius: '12px',
                border: 'none',
                background: (startDate && endDate)
                  ? 'linear-gradient(135deg, #00f5ff, #00c2cc)'
                  : 'rgba(255, 255, 255, 0.1)',
                color: '#fff',
                fontWeight: '600',
                cursor: (startDate && endDate) ? 'pointer' : 'not-allowed',
                opacity: (startDate && endDate) ? 1 : 0.5,
              }}
            >
              Apply
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  // Desktop portal modal content with animations
  const portalModalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop with blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.8)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              zIndex: 9998,
            }}
          />

          {/* Date Picker Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', duration: 0.4, bounce: 0.3 }}
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 9999,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                padding: '32px',
                minWidth: '400px',
                background: 'rgba(15, 20, 35, 0.95)',
                backdropFilter: 'blur(30px)',
                WebkitBackdropFilter: 'blur(30px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '20px',
                boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
              }}
            >
              {/* Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '24px',
                paddingBottom: '16px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Calendar size={24} color="#00f5ff" />
                  <h3 style={{
                    margin: 0,
                    fontSize: '20px',
                    fontWeight: '700',
                    color: '#fff',
                  }}>
                    Select Date Range
                  </h3>
                </div>

                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsOpen(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#fff',
                  }}
                >
                  <X size={16} />
                </motion.button>
              </div>

              {/* Date Picker */}
              <div style={{ marginBottom: '24px' }}>
                <DatePicker
                  selected={startDate}
                  onChange={handleDateChange}
                  startDate={startDate}
                  endDate={endDate}
                  selectsRange
                  inline
                  monthsShown={2}
                  calendarClassName="custom-datepicker"
                  dayClassName={getDayClassName}
                  filterDate={(date) => {
                    const dateStr = dayjs(date).format('YYYY-MM-DD')
                    return availableDateSet.has(dateStr)
                  }}
                />
              </div>

              {/* Actions */}
              <div style={{
                display: 'flex',
                gap: '12px',
                paddingTop: '16px',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              }}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCancel}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(255, 255, 255, 0.03)',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  Cancel
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleApply}
                  disabled={!startDate || !endDate}
                  style={{
                    flex: 1,
                    padding: '12px',
                    fontSize: '14px',
                    borderRadius: '10px',
                    border: 'none',
                    background: (startDate && endDate)
                      ? 'linear-gradient(135deg, #00f5ff, #00c2cc)'
                      : 'rgba(255, 255, 255, 0.1)',
                    color: '#fff',
                    fontWeight: '600',
                    cursor: (startDate && endDate) ? 'pointer' : 'not-allowed',
                    opacity: (startDate && endDate) ? 1 : 0.5,
                    transition: 'all 0.2s ease',
                  }}
                >
                  Apply
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )

  // Desktop regular modal content (no backdrop)
  const regularModalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: '8px',
            zIndex: 9999,
            padding: '32px',
            minWidth: '400px',
            background: 'rgba(15, 20, 35, 0.95)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '20px',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px',
            paddingBottom: '16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Calendar size={24} color="#00f5ff" />
              <h3 style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: '700',
                color: '#fff',
              }}>
                Select Date Range
              </h3>
            </div>

            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsOpen(false)}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#fff',
              }}
            >
              <X size={16} />
            </motion.button>
          </div>

          {/* Date Picker */}
          <div style={{ marginBottom: '24px' }}>
            <DatePicker
              selected={startDate}
              onChange={handleDateChange}
              startDate={startDate}
              endDate={endDate}
              selectsRange
              inline
              monthsShown={2}
              calendarClassName="custom-datepicker"
              dayClassName={getDayClassName}
              filterDate={(date) => {
                const dateStr = dayjs(date).format('YYYY-MM-DD')
                return availableDateSet.has(dateStr)
              }}
            />
          </div>

          {/* Actions */}
          <div style={{
            display: 'flex',
            gap: '12px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          }}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCancel}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.03)',
                color: '#fff',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              Cancel
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleApply}
              disabled={!startDate || !endDate}
              style={{
                flex: 1,
                padding: '12px',
                fontSize: '14px',
                borderRadius: '10px',
                border: 'none',
                background: (startDate && endDate)
                  ? 'linear-gradient(135deg, #00f5ff, #00c2cc)'
                  : 'rgba(255, 255, 255, 0.1)',
                color: '#fff',
                fontWeight: '600',
                cursor: (startDate && endDate) ? 'pointer' : 'not-allowed',
                opacity: (startDate && endDate) ? 1 : 0.5,
                transition: 'all 0.2s ease',
              }}
            >
              Apply
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  // Handle open - reset mobile calendar to start date month
  const handleOpen = () => {
    if (isMobile) {
      setCurrentMonth(dayjs(startDate || new Date()))
      setSelectingStart(true)
    }
    setIsOpen(true)
  }

  return (
    <>
      <div
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          handleOpen()
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? '8px' : '12px',
          background: 'rgba(255, 255, 255, 0.05)',
          padding: isMobile ? '8px 12px' : '10px 20px',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: '#b8c5d6',
          fontSize: isMobile ? '12px' : '14px',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          width: '100%',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 10,
          pointerEvents: 'auto',
        }}
      >
        <Calendar size={isMobile ? 16 : 18} color="#00f5ff" />
        <span>
          {dateRange[0].format(isMobile ? 'MMM DD' : 'MMM DD, YYYY')} - {dateRange[1].format(isMobile ? 'MMM DD' : 'MMM DD, YYYY')}
        </span>
      </div>

      {isMobile 
        ? createPortal(mobileModalContent, document.body)
        : (usePortal ? createPortal(portalModalContent, document.body) : regularModalContent)
      }
    </>
  )
}

export default DateRangePicker
