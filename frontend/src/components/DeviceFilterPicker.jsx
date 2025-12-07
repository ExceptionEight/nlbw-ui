import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Filter, X, Check, Trash2 } from 'lucide-react'
import { formatBytes } from '../utils/format'
import { useIsMobile } from '../App'

function DeviceFilterPicker({ selectedMacs, onChange, availableDevices = [] }) {
  const isMobile = useIsMobile()
  const [isOpen, setIsOpen] = useState(false)
  const [localSelected, setLocalSelected] = useState(selectedMacs)

  // Sync with prop
  useEffect(() => {
    setLocalSelected(selectedMacs)
  }, [selectedMacs])

  const handleDeviceToggle = (mac) => {
    setLocalSelected((prev) => {
      if (prev.includes(mac)) {
        return prev.filter((m) => m !== mac)
      } else {
        return [...prev, mac]
      }
    })
  }

  const handleApply = () => {
    onChange(localSelected)
    setIsOpen(false)
  }

  const handleCancel = () => {
    setLocalSelected(selectedMacs)
    setIsOpen(false)
  }

  const handleClearAll = () => {
    setLocalSelected([])
  }

  // Button label
  const getButtonLabel = () => {
    if (selectedMacs.length === 0) {
      return 'All Devices'
    } else if (selectedMacs.length === 1) {
      const device = availableDevices.find(d => d.mac === selectedMacs[0])
      return device?.friendly_name || '1 Device'
    } else {
      return `${selectedMacs.length} Devices`
    }
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
              <Filter size={24} color="#b24bf3" />
              <div>
                <h3 style={{
                  margin: 0,
                  fontSize: '18px',
                  fontWeight: '700',
                  color: '#fff',
                }}>
                  Filter Devices
                </h3>
                <p style={{ 
                  color: 'var(--text-secondary)', 
                  fontSize: '12px', 
                  margin: '2px 0 0 0' 
                }}>
                  {localSelected.length > 0 
                    ? `${localSelected.length} selected`
                    : 'Select devices to filter'}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {localSelected.length > 0 && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleClearAll}
                  style={{
                    background: 'rgba(255, 16, 240, 0.1)',
                    border: '1px solid rgba(255, 16, 240, 0.3)',
                    borderRadius: '10px',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#ff10f0',
                  }}
                >
                  <Trash2 size={18} />
                </motion.button>
              )}
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
          </div>

          {/* Device List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 16px' }}>
            {availableDevices.map((device, index) => {
              const isSelected = localSelected.includes(device.mac)

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

                  <AnimatePresence mode="wait">
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
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
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </div>

          {/* Actions */}
          <div style={{
            display: 'flex',
            gap: '12px',
            padding: '16px',
            paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
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
              style={{
                flex: 1,
                padding: '16px',
                fontSize: '16px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #b24bf3, #ff10f0)',
                color: '#fff',
                fontWeight: '600',
                cursor: 'pointer',
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
      <div style={{ position: 'relative' }}>
        <div
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setIsOpen(true)
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? '8px' : '12px',
            background: selectedMacs.length > 0 
              ? 'rgba(178, 75, 243, 0.15)'
              : 'rgba(255, 255, 255, 0.05)',
            padding: isMobile ? '8px 12px' : '10px 20px',
            borderRadius: '12px',
            border: selectedMacs.length > 0 
              ? '1px solid rgba(178, 75, 243, 0.3)'
              : '1px solid rgba(255, 255, 255, 0.1)',
            color: selectedMacs.length > 0 ? '#b24bf3' : '#b8c5d6',
            fontSize: isMobile ? '12px' : '14px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            width: '100%',
            justifyContent: 'center',
          }}
        >
          <Filter size={isMobile ? 16 : 18} color="#b24bf3" />
          <span>{getButtonLabel()}</span>
        </div>

        {/* Desktop dropdown */}
        {!isMobile && (
          <AnimatePresence>
            {isOpen && (
              <>
                {/* Backdrop */}
                <div
                  onClick={() => setIsOpen(false)}
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 9998,
                  }}
                />
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '8px',
                    zIndex: 9999,
                    padding: '20px',
                    width: '380px',
                    background: 'rgba(15, 20, 35, 0.95)',
                    backdropFilter: 'blur(30px)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '20px',
                    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '16px',
                    paddingBottom: '16px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Filter size={22} color="#b24bf3" />
                      <div>
                        <h3 style={{
                          margin: 0,
                          fontSize: '18px',
                          fontWeight: '700',
                          color: '#fff',
                        }}>
                          Filter Devices
                        </h3>
                        <p style={{ 
                          color: 'var(--text-secondary)', 
                          fontSize: '12px', 
                          margin: '4px 0 0 0' 
                        }}>
                          {localSelected.length > 0 
                            ? `${localSelected.length} selected`
                            : 'Select devices to filter'}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {localSelected.length > 0 && (
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={handleClearAll}
                          title="Clear all"
                          style={{
                            background: 'rgba(255, 16, 240, 0.1)',
                            border: '1px solid rgba(255, 16, 240, 0.3)',
                            borderRadius: '8px',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#ff10f0',
                          }}
                        >
                          <Trash2 size={14} />
                        </motion.button>
                      )}
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
                  </div>

                  {/* Device List */}
                  <div style={{ maxHeight: '340px', overflowY: 'auto', marginBottom: '16px' }}>
                    {availableDevices.map((device) => {
                      const isSelected = localSelected.includes(device.mac)

                      return (
                        <div
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
                            transition: 'background 0.2s ease, border-color 0.2s ease',
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{
                              fontSize: '14px',
                              fontWeight: '600',
                              color: isSelected ? '#00f5ff' : '#fff',
                              marginBottom: '4px',
                              transition: 'color 0.2s ease',
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
                        </div>
                      )
                    })}
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
                      }}
                    >
                      Cancel
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleApply}
                      style={{
                        flex: 1,
                        padding: '12px',
                        fontSize: '14px',
                        borderRadius: '10px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #b24bf3, #ff10f0)',
                        color: '#fff',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      Apply
                    </motion.button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Mobile fullscreen - portal */}
      {isMobile && createPortal(mobileModalContent, document.body)}
    </>
  )
}

export default DeviceFilterPicker
