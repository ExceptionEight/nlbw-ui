package achievements

import (
	"time"

	"nlbw-ui/internal/aggregator"
	"nlbw-ui/internal/cache"
	"nlbw-ui/internal/config"
)

// Calculator вычисляет статусы достижений на основе данных из aggregator
type Calculator struct {
	cache      *cache.Cache
	aggregator *aggregator.Aggregator
	config     *config.Config
}

// NewCalculator создаёт новый калькулятор достижений
func NewCalculator(c *cache.Cache, agg *aggregator.Aggregator, cfg *config.Config) *Calculator {
	return &Calculator{
		cache:      c,
		aggregator: agg,
		config:     cfg,
	}
}

// GetNetworkAchievements возвращает все достижения для всей сети
func (c *Calculator) GetNetworkAchievements() *NetworkAchievements {
	achievements := AllAchievements()
	statuses := make([]AchievementStatus, 0, len(achievements))
	unlockedCount := 0
	totalProgress := 0.0

	for _, achievement := range achievements {
		status := c.checkAchievement(achievement)
		statuses = append(statuses, status)
		if status.Unlocked {
			unlockedCount++
		}
		totalProgress += status.Progress
	}

	if len(achievements) > 0 {
		totalProgress /= float64(len(achievements))
	}

	return &NetworkAchievements{
		Achievements:  statuses,
		TotalUnlocked: unlockedCount,
		TotalProgress: totalProgress,
	}
}

// checkAchievement проверяет конкретное достижение для всей сети
func (c *Calculator) checkAchievement(achievement Achievement) AchievementStatus {
	status := AchievementStatus{
		Achievement:  achievement,
		Unlocked:     false,
		Progress:     0.0,
		TargetValue:  achievement.Threshold,
		CurrentValue: 0.0,
	}

	switch achievement.ID {
	case AchievementFirstGigabyte, AchievementDataHoarder, AchievementTerabyteClub:
		return c.checkTotalTrafficAchievement(achievement)
	case AchievementDailyBurner:
		return c.checkDailyBurnerAchievement(achievement)
	case AchievementWeekWarrior, AchievementMonthlyActive:
		return c.checkConsecutiveDaysAchievement(achievement)
	case AchievementNetworkGrowth:
		return c.checkNetworkGrowthAchievement(achievement)
	}

	return status
}

// checkTotalTrafficAchievement проверяет достижения на общий объём трафика во всей сети
func (c *Calculator) checkTotalTrafficAchievement(achievement Achievement) AchievementStatus {
	status := AchievementStatus{
		Achievement: achievement,
		TargetValue: achievement.Threshold,
	}

	totalTraffic := uint64(0)
	var unlockedDate *time.Time

	// Получаем все дни с данными, отсортированные по дате
	calendarData := c.aggregator.GetCalendarData()

	for _, day := range calendarData {
		dayStats := c.aggregator.GetDayStats(day.Date)
		if dayStats == nil {
			continue
		}

		// Суммируем трафик со всех устройств за день
		dayTraffic := dayStats.Downloaded + dayStats.Uploaded
		totalTraffic += dayTraffic

		// Проверяем, когда достижение было разблокировано
		if !status.Unlocked && float64(totalTraffic) >= achievement.Threshold {
			parsedDate, err := time.Parse("2006-01-02", day.Date)
			if err == nil {
				unlockedDate = &parsedDate
				status.Unlocked = true
				status.UnlockedAt = unlockedDate
			}
		}
	}

	status.CurrentValue = float64(totalTraffic)
	status.Progress = status.CurrentValue / status.TargetValue
	if status.Progress > 1.0 {
		status.Progress = 1.0
	}

	return status
}

// checkDailyBurnerAchievement проверяет достижение "Daily Burner" - максимальный трафик за день во всей сети
func (c *Calculator) checkDailyBurnerAchievement(achievement Achievement) AchievementStatus {
	status := AchievementStatus{
		Achievement: achievement,
		TargetValue: achievement.Threshold,
	}

	maxDailyTraffic := uint64(0)
	var unlockedDate *time.Time

	calendarData := c.aggregator.GetCalendarData()

	for _, day := range calendarData {
		dayStats := c.aggregator.GetDayStats(day.Date)
		if dayStats == nil {
			continue
		}

		dailyTraffic := dayStats.Downloaded + dayStats.Uploaded
		if dailyTraffic > maxDailyTraffic {
			maxDailyTraffic = dailyTraffic
		}

		// Проверяем разблокировку
		if !status.Unlocked && float64(dailyTraffic) >= achievement.Threshold {
			parsedDate, err := time.Parse("2006-01-02", day.Date)
			if err == nil {
				unlockedDate = &parsedDate
				status.Unlocked = true
				status.UnlockedAt = unlockedDate
			}
		}
	}

	status.CurrentValue = float64(maxDailyTraffic)
	status.Progress = status.CurrentValue / status.TargetValue
	if status.Progress > 1.0 {
		status.Progress = 1.0
	}

	return status
}

// checkConsecutiveDaysAchievement проверяет достижения на последовательные дни активности в сети
func (c *Calculator) checkConsecutiveDaysAchievement(achievement Achievement) AchievementStatus {
	status := AchievementStatus{
		Achievement: achievement,
		TargetValue: achievement.Threshold,
	}

	calendarData := c.aggregator.GetCalendarData()
	maxStreak := 0
	currentStreak := 0
	var unlockedDate *time.Time
	var lastDate time.Time

	for _, day := range calendarData {
		dayStats := c.aggregator.GetDayStats(day.Date)
		if dayStats == nil {
			continue
		}

		currentDate, err := time.Parse("2006-01-02", day.Date)
		if err != nil {
			continue
		}

		// Проверяем, есть ли активность в этот день (любой трафик)
		if dayStats.Downloaded+dayStats.Uploaded > 0 {
			// Проверяем, последовательный ли это день
			if lastDate.IsZero() || currentDate.Sub(lastDate).Hours() == 24 {
				currentStreak++
				if currentStreak > maxStreak {
					maxStreak = currentStreak
				}

				// Проверяем разблокировку
				if !status.Unlocked && currentStreak >= int(achievement.Threshold) {
					unlockedDate = &currentDate
					status.Unlocked = true
					status.UnlockedAt = unlockedDate
				}
			} else {
				currentStreak = 1
			}
			lastDate = currentDate
		} else {
			currentStreak = 0
			lastDate = time.Time{}
		}
	}

	status.CurrentValue = float64(maxStreak)
	status.Progress = status.CurrentValue / status.TargetValue
	if status.Progress > 1.0 {
		status.Progress = 1.0
	}

	return status
}

// checkNetworkGrowthAchievement проверяет достижение "Network Growth" - количество активных устройств
func (c *Calculator) checkNetworkGrowthAchievement(achievement Achievement) AchievementStatus {
	status := AchievementStatus{
		Achievement: achievement,
		TargetValue: achievement.Threshold,
	}

	calendarData := c.aggregator.GetCalendarData()
	maxDevices := 0
	var unlockedDate *time.Time

	// Проходим по всем дням и находим максимальное количество уникальных устройств
	for _, day := range calendarData {
		dayStats := c.aggregator.GetDayStats(day.Date)
		if dayStats == nil {
			continue
		}

		deviceCount := len(dayStats.Devices)
		if deviceCount > maxDevices {
			maxDevices = deviceCount
		}

		// Проверяем разблокировку
		if !status.Unlocked && float64(deviceCount) >= achievement.Threshold {
			parsedDate, err := time.Parse("2006-01-02", day.Date)
			if err == nil {
				unlockedDate = &parsedDate
				status.Unlocked = true
				status.UnlockedAt = unlockedDate
			}
		}
	}

	status.CurrentValue = float64(maxDevices)
	status.Progress = status.CurrentValue / status.TargetValue
	if status.Progress > 1.0 {
		status.Progress = 1.0
	}

	return status
}
