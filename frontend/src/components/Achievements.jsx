import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Award, Lock, Database, Calendar, Network, TrendingUp, CheckCircle2, Circle } from 'lucide-react'
import { formatBytes, formatMegabytes } from '../utils/format'
import { useIsMobile } from '../App'

// Category icons mapping
const CATEGORY_ICONS = {
  data: Database,
  activity: Calendar,
  network: Network,
  protocol: TrendingUp,
}

// Category colors
const CATEGORY_COLORS = {
  data: {
    gradient: 'linear-gradient(135deg, #4facfe, #00f2fe)',
    color: '#00f2fe',
    bg: 'rgba(0, 245, 255, 0.1)',
  },
  activity: {
    gradient: 'linear-gradient(135deg, #fa709a, #fee140)',
    color: '#fa709a',
    bg: 'rgba(250, 112, 154, 0.1)',
  },
  network: {
    gradient: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: '#667eea',
    bg: 'rgba(102, 126, 234, 0.1)',
  },
  protocol: {
    gradient: 'linear-gradient(135deg, #f093fb, #f5576c)',
    color: '#f5576c',
    bg: 'rgba(245, 87, 108, 0.1)',
  },
}

function Achievements() {
  const isMobile = useIsMobile()
  const [loading, setLoading] = useState(true)
  const [achievementsData, setAchievementsData] = useState(null)

  useEffect(() => {
    fetchAchievements()
  }, [])

  const fetchAchievements = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/achievements')
      const data = await response.json()
      setAchievementsData(data)
    } catch (error) {
      console.error('Failed to fetch achievements:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <div className="spinner" />
      </div>
    )
  }

  if (!achievementsData) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--text-muted)' }}>
        <Trophy size={64} style={{ marginBottom: '20px', opacity: 0.3 }} />
        <p>No achievements data available</p>
      </div>
    )
  }

  const { achievements, total_unlocked, total_progress } = achievementsData

  // Sort achievements: unlocked first (newest to oldest), then locked
  const sortedAchievements = [...achievements].sort((a, b) => {
    // If both unlocked or both locked
    if (a.unlocked === b.unlocked) {
      // If both unlocked, sort by unlock date (newest first)
      if (a.unlocked && a.unlocked_at && b.unlocked_at) {
        return new Date(b.unlocked_at) - new Date(a.unlocked_at)
      }
      // If both locked, keep original order
      return 0
    }
    // Unlocked first
    return a.unlocked ? -1 : 1
  })

  // Find the index where locked achievements start
  const firstLockedIndex = sortedAchievements.findIndex(a => !a.unlocked)

  // Format value based on category and achievement type
  const formatValue = (value, category, achievementId, isTarget = false) => {
    if (category === 'data') {
      return formatBytes(value)
    }
    // SSH, FTP, and Imposter achievements show bytes
    if (achievementId === 'red_eyed' || achievementId === 'what_year' || achievementId === 'imposter') {
      return formatBytes(value)
    }
    // HTTP achievement shows megabytes
    if (achievementId === 'pudding_lane') {
      return formatMegabytes(value)
    }
    // Ghost achievement - binary status
    if (achievementId === 'ghost') {
      return value >= 1 ? 'Detected' : 'Not seen'
    }
    // Miss me achievement - binary
    if (achievementId === 'miss_me') {
      if (isTarget) return 'Maybe'
      return value >= 1 ? 'Yes' : 'No'
    }
    // Three body achievement - binary
    if (achievementId === 'three_body') {
      return value >= 1 ? 'Solved' : 'Unsolved'
    }
    // ICMP and DNS achievements show packet counts with formatting
    return value.toLocaleString()
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  }

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  }

  return (
    <div>
      {/* Header Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
          gap: isMobile ? '12px' : '24px',
          marginBottom: isMobile ? '24px' : '40px',
        }}
      >
        <div className="stat-card">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: isMobile ? '8px' : '12px',
          }}>
            <span style={{
              fontSize: isMobile ? '11px' : '14px',
              color: 'var(--text-secondary)',
              fontWeight: '500',
            }}>
              Total Unlocked
            </span>
            <Trophy size={isMobile ? 18 : 20} color="#00f5ff" />
          </div>
          <div style={{
            fontSize: isMobile ? '24px' : '32px',
            fontWeight: '800',
            background: 'linear-gradient(135deg, #00f5ff, #b24bf3)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            {total_unlocked} / {achievements.length}
          </div>
        </div>

        <div className="stat-card">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: isMobile ? '8px' : '12px',
          }}>
            <span style={{
              fontSize: isMobile ? '11px' : '14px',
              color: 'var(--text-secondary)',
              fontWeight: '500',
            }}>
              Overall Progress
            </span>
            <Award size={isMobile ? 18 : 20} color="#fa709a" />
          </div>
          <div style={{
            fontSize: isMobile ? '24px' : '32px',
            fontWeight: '800',
            background: 'linear-gradient(135deg, #fa709a, #fee140)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            {Math.round(total_progress * 100)}%
          </div>
        </div>

        {!isMobile && (
          <div className="stat-card">
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
            }}>
              <span style={{
                fontSize: '14px',
                color: 'var(--text-secondary)',
                fontWeight: '500',
              }}>
                Completion Rate
              </span>
              <CheckCircle2 size={20} color="#667eea" />
            </div>
            <div style={{
              fontSize: '32px',
              fontWeight: '800',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              {achievements.length > 0 ? Math.round((total_unlocked / achievements.length) * 100) : 0}%
            </div>
          </div>
        )}
      </motion.div>

      {/* Achievements Grid */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: isMobile ? '16px' : '24px',
        }}
      >
        {sortedAchievements.map((achievementStatus, index) => {
          const isFirstLocked = index === firstLockedIndex
          const { achievement, unlocked, unlocked_at, progress, current_value, target_value } = achievementStatus
          const categoryColor = CATEGORY_COLORS[achievement.category] || CATEGORY_COLORS.data
          const CategoryIcon = CATEGORY_ICONS[achievement.category] || Database

          return (
            <React.Fragment key={achievement.id}>
              {/* Separator between unlocked and locked */}
              {isFirstLocked && firstLockedIndex > 0 && (
                <div style={{
                  gridColumn: '1 / -1',
                  display: 'flex',
                  alignItems: 'center',
                  gap: isMobile ? '12px' : '16px',
                  margin: isMobile ? '8px 0' : '16px 0',
                }}>
                  <div style={{
                    flex: 1,
                    height: '2px',
                    background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)',
                  }} />
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: isMobile ? '6px 12px' : '8px 16px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '20px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}>
                    <Lock size={isMobile ? 14 : 16} color="var(--text-muted)" />
                    <span style={{
                      fontSize: isMobile ? '12px' : '13px',
                      color: 'var(--text-secondary)',
                      fontWeight: '500',
                    }}>
                      Locked Achievements
                    </span>
                  </div>
                  <div style={{
                    flex: 1,
                    height: '2px',
                    background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)',
                  }} />
                </div>
              )}

              <motion.div
                variants={item}
                whileHover={unlocked ? { scale: 1.02, y: -4 } : {}}
                className="glass-card"
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  opacity: unlocked ? 1 : 0.7,
                  cursor: unlocked ? 'default' : 'default',
                }}
              >
              {/* Background gradient */}
              <div style={{
                position: 'absolute',
                top: -50,
                right: -50,
                width: 150,
                height: 150,
                background: categoryColor.gradient,
                borderRadius: '50%',
                opacity: unlocked ? 0.15 : 0.05,
                filter: 'blur(40px)',
              }} />

              <div style={{ position: 'relative', zIndex: 1 }}>
                {/* Header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  marginBottom: isMobile ? '12px' : '16px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '12px', flex: 1 }}>
                    <div style={{
                      width: isMobile ? '40px' : '48px',
                      height: isMobile ? '40px' : '48px',
                      borderRadius: '12px',
                      background: unlocked ? categoryColor.bg : 'rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <CategoryIcon size={isMobile ? 20 : 24} color={unlocked ? categoryColor.color : 'var(--text-muted)'} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{
                        fontSize: isMobile ? '15px' : '18px',
                        fontWeight: '700',
                        margin: '0 0 4px 0',
                        color: unlocked ? '#fff' : 'var(--text-secondary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {achievement.name}
                      </h4>
                      <p style={{
                        fontSize: isMobile ? '11px' : '12px',
                        color: 'var(--text-secondary)',
                        margin: 0,
                        textTransform: 'capitalize',
                      }}>
                        {achievement.category}
                      </p>
                    </div>
                  </div>

                  {unlocked ? (
                    <CheckCircle2 size={isMobile ? 20 : 24} color={categoryColor.color} style={{ flexShrink: 0 }} />
                  ) : (
                    <Lock size={isMobile ? 20 : 24} color="var(--text-muted)" style={{ flexShrink: 0, opacity: 0.5 }} />
                  )}
                </div>

                {/* Description */}
                <p style={{
                  fontSize: isMobile ? '13px' : '14px',
                  color: 'var(--text-secondary)',
                  lineHeight: '1.5',
                  marginBottom: isMobile ? '12px' : '16px',
                }}>
                  {achievement.description}
                </p>

                {/* Progress Bar */}
                <div style={{ marginBottom: isMobile ? '8px' : '12px' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                    fontSize: isMobile ? '11px' : '12px',
                    color: 'var(--text-secondary)',
                  }}>
                    <span>Progress</span>
                    <span style={{ fontWeight: '600', color: unlocked ? categoryColor.color : 'var(--text-secondary)' }}>
                      {Math.round(progress * 100)}%
                    </span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '4px',
                    overflow: 'hidden',
                  }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress * 100}%` }}
                      transition={{ duration: 1, delay: index * 0.05 }}
                      style={{
                        height: '100%',
                        background: unlocked ? categoryColor.gradient : 'rgba(255, 255, 255, 0.2)',
                        borderRadius: '4px',
                      }}
                    />
                  </div>
                </div>

                {/* Stats */}
                {unlocked ? (
                  // Only show unlock date for unlocked achievements
                  unlocked_at && (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      paddingTop: isMobile ? '8px' : '12px',
                      borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                    }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{
                          fontSize: isMobile ? '10px' : '11px',
                          color: 'var(--text-secondary)',
                          marginBottom: '2px',
                        }}>
                          Unlocked
                        </div>
                        <div style={{
                          fontSize: isMobile ? '12px' : '13px',
                          fontWeight: '600',
                          color: categoryColor.color,
                        }}>
                          {new Date(unlocked_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  // Show current/target for locked achievements
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingTop: isMobile ? '8px' : '12px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        fontSize: isMobile ? '10px' : '11px',
                        color: 'var(--text-secondary)',
                        marginBottom: '2px',
                      }}>
                        Current / Target
                      </div>
                      <div style={{
                        fontSize: isMobile ? '13px' : '14px',
                        fontWeight: '600',
                        color: '#fff',
                      }}>
                        {formatValue(current_value, achievement.category, achievement.id, false)} / {formatValue(target_value, achievement.category, achievement.id, true)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
            </React.Fragment>
          )
        })}
      </motion.div>
    </div>
  )
}

export default Achievements
