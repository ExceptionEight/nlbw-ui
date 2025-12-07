package achievements

import (
	"sync"
	"time"
)

// CachedAchievement хранит закэшированное разблокированное достижение
type CachedAchievement struct {
	ID           string
	UnlockedAt   time.Time
	CurrentValue float64
	TargetValue  float64
}

// AchievementCache кэш для разблокированных достижений (in-memory)
type AchievementCache struct {
	mu       sync.RWMutex
	unlocked map[string]*CachedAchievement
}

// NewAchievementCache создаёт новый кэш достижений
func NewAchievementCache() *AchievementCache {
	return &AchievementCache{
		unlocked: make(map[string]*CachedAchievement),
	}
}

// Get возвращает закэшированное достижение, если оно есть
func (c *AchievementCache) Get(id string) (*CachedAchievement, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	cached, ok := c.unlocked[id]
	return cached, ok
}

// Set сохраняет разблокированное достижение в кэш
func (c *AchievementCache) Set(id string, unlockedAt time.Time, currentValue, targetValue float64) {
	c.mu.Lock()
	defer c.mu.Unlock()
	
	c.unlocked[id] = &CachedAchievement{
		ID:           id,
		UnlockedAt:   unlockedAt,
		CurrentValue: currentValue,
		TargetValue:  targetValue,
	}
}

// IsUnlocked проверяет, разблокировано ли достижение
func (c *AchievementCache) IsUnlocked(id string) bool {
	c.mu.RLock()
	defer c.mu.RUnlock()
	_, ok := c.unlocked[id]
	return ok
}
