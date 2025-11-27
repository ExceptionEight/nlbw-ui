package achievements

import "time"

// Achievement представляет определение достижения
type Achievement struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Category    string  `json:"category"`
	Threshold   float64 `json:"threshold"` // Пороговое значение для разблокировки
}

// AchievementStatus представляет статус достижения для всей сети
type AchievementStatus struct {
	Achievement  Achievement `json:"achievement"`
	Unlocked     bool        `json:"unlocked"`
	UnlockedAt   *time.Time  `json:"unlocked_at,omitempty"` // Дата первого выполнения условия
	Progress     float64     `json:"progress"`              // 0.0-1.0
	CurrentValue float64     `json:"current_value"`
	TargetValue  float64     `json:"target_value"`
}

// NetworkAchievements представляет все достижения для всей сети
type NetworkAchievements struct {
	Achievements  []AchievementStatus `json:"achievements"`
	TotalUnlocked int                 `json:"total_unlocked"`
	TotalProgress float64             `json:"total_progress"` // Средний прогресс по всем достижениям
}

// Category константы для категорий достижений
const (
	CategoryData     = "data"
	CategoryActivity = "activity"
	CategoryNetwork  = "network"
	CategoryProtocol = "protocol"
)
