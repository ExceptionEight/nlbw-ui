import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, X } from 'lucide-react'
import DatePicker from 'react-datepicker'
import dayjs from 'dayjs'
import 'react-datepicker/dist/react-datepicker.css'

function DateRangePicker({ dateRange, onChange, availableDates = [], usePortal = false }) {
  const [isOpen, setIsOpen] = useState(false)
  const [startDate, setStartDate] = useState(dateRange[0].toDate())
  const [endDate, setEndDate] = useState(dateRange[1].toDate())

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

  // Portal modal content with animations
  const portalModalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
              {/* Backdrop with blur */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  console.log('Backdrop clicked')
                  setIsOpen(false)
                }}
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

              {/* Date Picker Modal - with animation wrapper */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', duration: 0.4, bounce: 0.3 }}
                style={{
                  position: 'fixed',
                  top: '50%',
                  left: '50%',
                  marginLeft: '-200px',
                  marginTop: '-250px',
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

  // Regular modal content (no backdrop, positioned relative to parent)
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

  return (
    <>
      <div
        onClick={(e) => {
          console.log('DateRangePicker button clicked!')
          e.preventDefault()
          e.stopPropagation()
          setIsOpen(!isOpen)
          console.log('isOpen will be:', !isOpen)
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'rgba(255, 255, 255, 0.05)',
          padding: '10px 20px',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: '#b8c5d6',
          fontSize: '14px',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          width: '100%',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 10,
          pointerEvents: 'auto',
        }}
      >
        <Calendar size={18} color="#00f5ff" />
        <span>
          {dateRange[0].format('MMM DD, YYYY')} - {dateRange[1].format('MMM DD, YYYY')}
        </span>
      </div>

      {usePortal ? createPortal(portalModalContent, document.body) : regularModalContent}
    </>
  )
}

export default DateRangePicker
