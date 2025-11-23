import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Calendar, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react'
import dayjs from 'dayjs'
import { formatBytes } from '../utils/format'
import DateRangePicker from './DateRangePicker'

function Comparison() {
  const [period1, setPeriod1] = useState([dayjs().subtract(60, 'days'), dayjs().subtract(31, 'days')])
  const [period2, setPeriod2] = useState([dayjs().subtract(30, 'days'), dayjs()])
  const [data1, setData1] = useState(null)
  const [data2, setData2] = useState(null)
  const [loading, setLoading] = useState(false)
  const [availableDates, setAvailableDates] = useState([])

  useEffect(() => {
    fetch('/api/calendar')
      .then(res => res.json())
      .then(data => {
        const dates = data.filter(d => d.value > 0).map(d => d.date)
        setAvailableDates(dates)
      })
      .catch(err => console.error('Failed to fetch available dates:', err))
  }, [])

  const fetchData = async (from, to) => {
    const response = await fetch(`/api/summary?from=${from}&to=${to}`)
    return await response.json()
  }

  const handleCompare = async () => {
    setLoading(true)
    try {
      const [d1, d2] = await Promise.all([
        fetchData(period1[0].format('YYYY-MM-DD'), period1[1].format('YYYY-MM-DD')),
        fetchData(period2[0].format('YYYY-MM-DD'), period2[1].format('YYYY-MM-DD')),
      ])
      setData1(d1)
      setData2(d2)
    } catch (error) {
      console.error('Failed to compare:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateChange = (val1, val2) => {
    if (val1 === 0) return val2 > 0 ? 100 : 0
    return ((val2 - val1) / val1) * 100
  }

  const renderComparison = () => {
    if (!data1 || !data2) return null

    const downloadedChange = calculateChange(data1.total_downloaded, data2.total_downloaded)
    const uploadedChange = calculateChange(data1.total_uploaded, data2.total_uploaded)
    const totalChange = calculateChange(
      data1.total_downloaded + data1.total_uploaded,
      data2.total_downloaded + data2.total_uploaded
    )

    const stats = [
      {
        label: 'Downloaded',
        value1: data1.total_downloaded,
        value2: data2.total_downloaded,
        change: downloadedChange,
        gradient: 'linear-gradient(135deg, #4facfe, #00f2fe)',
      },
      {
        label: 'Uploaded',
        value1: data1.total_uploaded,
        value2: data2.total_uploaded,
        change: uploadedChange,
        gradient: 'linear-gradient(135deg, #fa709a, #fee140)',
      },
      {
        label: 'Total Traffic',
        value1: data1.total_downloaded + data1.total_uploaded,
        value2: data2.total_downloaded + data2.total_uploaded,
        change: totalChange,
        gradient: 'linear-gradient(135deg, #667eea, #764ba2)',
      },
    ]

    return (
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Stats Comparison */}
        {stats.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="glass-card"
            style={{ marginBottom: '24px' }}
          >
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              gap: '32px',
              alignItems: 'center',
            }}>
              {/* Period 1 */}
              <div>
                <div style={{
                  fontSize: '14px',
                  color: 'var(--text-secondary)',
                  marginBottom: '12px',
                  fontWeight: '500',
                }}>
                  {stat.label} - Period 1
                </div>
                <div style={{
                  fontSize: '36px',
                  fontWeight: '800',
                  background: stat.gradient,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                  {formatBytes(stat.value1)}
                </div>
                <div style={{
                  fontSize: '13px',
                  color: 'var(--text-muted)',
                  marginTop: '8px',
                }}>
                  {period1[0].format('MMM DD')} - {period1[1].format('MMM DD, YYYY')}
                </div>
              </div>

              {/* Arrow & Change */}
              <div style={{ textAlign: 'center', minWidth: '120px' }}>
                <motion.div
                  animate={{ x: [0, 10, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  <ArrowRight size={32} color="#00f5ff" />
                </motion.div>
                <div style={{
                  marginTop: '12px',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  background: stat.change >= 0
                    ? 'rgba(57, 255, 20, 0.15)'
                    : 'rgba(255, 16, 240, 0.15)',
                  border: `1px solid ${stat.change >= 0 ? 'rgba(57, 255, 20, 0.3)' : 'rgba(255, 16, 240, 0.3)'}`,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '16px',
                  fontWeight: '700',
                  color: stat.change >= 0 ? '#39ff14' : '#ff10f0',
                }}>
                  {stat.change >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                  {Math.abs(stat.change).toFixed(1)}%
                </div>
              </div>

              {/* Period 2 */}
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontSize: '14px',
                  color: 'var(--text-secondary)',
                  marginBottom: '12px',
                  fontWeight: '500',
                }}>
                  {stat.label} - Period 2
                </div>
                <div style={{
                  fontSize: '36px',
                  fontWeight: '800',
                  background: stat.gradient,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                  {formatBytes(stat.value2)}
                </div>
                <div style={{
                  fontSize: '13px',
                  color: 'var(--text-muted)',
                  marginTop: '8px',
                }}>
                  {period2[0].format('MMM DD')} - {period2[1].format('MMM DD, YYYY')}
                </div>
              </div>
            </div>
          </motion.div>
        ))}

        {/* Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card"
        >
          <h4 style={{
            marginBottom: '20px',
            fontSize: '20px',
            fontWeight: '700',
            background: 'linear-gradient(135deg, #00f5ff, #b24bf3)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Period Summary
          </h4>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '20px',
          }}>
            <div className="stat-card">
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Period 1 Days
              </div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#00f5ff' }}>
                {data1.days.length}
              </div>
            </div>

            <div className="stat-card">
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Period 2 Days
              </div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#00f5ff' }}>
                {data2.days.length}
              </div>
            </div>

            <div className="stat-card">
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Avg Daily Traffic P1
              </div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#fa709a' }}>
                {formatBytes((data1.total_downloaded + data1.total_uploaded) / data1.days.length)}
              </div>
            </div>

            <div className="stat-card">
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Avg Daily Traffic P2
              </div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#fa709a' }}>
                {formatBytes((data2.total_downloaded + data2.total_uploaded) / data2.days.length)}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    )
  }

  return (
    <div>
      {/* Period Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card"
        style={{ marginBottom: '40px' }}
      >
        <h3 style={{
          marginBottom: '32px',
          fontSize: '28px',
          fontWeight: '800',
          background: 'linear-gradient(135deg, #00f5ff, #b24bf3)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          textAlign: 'center',
        }}>
          Compare Two Periods
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '32px',
          marginBottom: '32px',
        }}>
          {/* Period 1 */}
          <div className="gradient-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <Calendar size={24} color="#00f5ff" />
              <h4 style={{
                fontSize: '18px',
                fontWeight: '700',
                color: '#00f5ff',
                margin: 0,
              }}>
                Period 1
              </h4>
            </div>

            <DateRangePicker
              dateRange={period1}
              onChange={setPeriod1}
              availableDates={availableDates}
              usePortal={true}
            />
          </div>

          {/* Period 2 */}
          <div className="gradient-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <Calendar size={24} color="#b24bf3" />
              <h4 style={{
                fontSize: '18px',
                fontWeight: '700',
                color: '#b24bf3',
                margin: 0,
              }}>
                Period 2
              </h4>
            </div>

            <DateRangePicker
              dateRange={period2}
              onChange={setPeriod2}
              availableDates={availableDates}
              usePortal={true}
            />
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleCompare}
          disabled={loading}
          className="modern-button"
          style={{
            width: '100%',
            padding: '16px',
            fontSize: '16px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
              <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }} />
              Comparing...
            </div>
          ) : (
            'Compare Periods'
          )}
        </motion.button>
      </motion.div>

      {/* Results */}
      {renderComparison()}
    </div>
  )
}

export default Comparison
