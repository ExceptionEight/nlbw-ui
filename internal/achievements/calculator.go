package achievements

import (
	"strings"
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
	achCache   *AchievementCache
}

// NewCalculator создаёт новый калькулятор достижений
func NewCalculator(c *cache.Cache, agg *aggregator.Aggregator, cfg *config.Config) *Calculator {
	return &Calculator{
		cache:      c,
		aggregator: agg,
		config:     cfg,
		achCache:   NewAchievementCache(),
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
	// Сначала проверяем кэш: если ачивка уже разблокирована, возвращаем из кэша
	if cached, ok := c.achCache.Get(achievement.ID); ok {
		unlockedAt := cached.UnlockedAt
		return AchievementStatus{
			Achievement:  achievement,
			Unlocked:     true,
			UnlockedAt:   &unlockedAt,
			Progress:     1.0,
			CurrentValue: cached.CurrentValue,
			TargetValue:  cached.TargetValue,
		}
	}

	status := AchievementStatus{
		Achievement:  achievement,
		Unlocked:     false,
		Progress:     0.0,
		TargetValue:  achievement.Threshold,
		CurrentValue: 0.0,
	}

	switch achievement.ID {
	case AchievementFirstGigabyte, AchievementDataHoarder, AchievementTerabyteClub,
		AchievementHundredTerabyte, AchievementPetabyteClub, AchievementWhatTheFuck:
		status = c.checkTotalTrafficAchievement(achievement)
	case AchievementDailyBurner:
		status = c.checkDailyBurnerAchievement(achievement)
	case AchievementWeekWarrior, AchievementMonthlyActive:
		status = c.checkConsecutiveDaysAchievement(achievement)
	case AchievementNetworkGrowth:
		status = c.checkNetworkGrowthAchievement(achievement)
	case AchievementPingOfDeath, AchievementUptimeKuma, AchievementSmurfAttack:
		status = c.checkICMPPacketsAchievement(achievement)
	case AchievementRedEyed:
		status = c.checkSSHTrafficAchievement(achievement)
	case AchievementWhatYear:
		status = c.checkFTPTrafficAchievement(achievement)
	case AchievementISeekYou:
		status = c.checkDNSQueriesAchievement(achievement)
	case AchievementGhost:
		status = c.checkGhostMacAchievement(achievement)
	case AchievementSlumberParty:
		status = c.checkSlumberPartyAchievement(achievement)
	case AchievementILoveYou:
		status = c.checkILoveYouAchievement(achievement)
	case AchievementMissMe:
		status = c.checkMissMeAchievement(achievement)
	case AchievementThreeBody:
		status = c.checkThreeBodyAchievement(achievement)
	case AchievementOnFire:
		status = c.checkOnFireAchievement(achievement)
	case AchievementPuddingLane:
		status = c.checkHTTPTrafficAchievement(achievement)
	}

	// Если ачивка разблокирована - сохраняем в кэш
	if status.Unlocked && status.UnlockedAt != nil {
		c.achCache.Set(achievement.ID, *status.UnlockedAt, status.CurrentValue, status.TargetValue)
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

	// Получаем все дни с данными, отсортированные по дате
	calendarData := c.aggregator.GetCalendarData(nil)

	for _, day := range calendarData {
		dayStats := c.aggregator.GetDayStats(day.Date)
		if dayStats == nil {
			continue
		}

		// Суммируем трафик со всех устройств за день
		dayTraffic := dayStats.Downloaded + dayStats.Uploaded
		totalTraffic += dayTraffic

		// Проверяем, когда достижение было разблокировано
		if float64(totalTraffic) >= achievement.Threshold {
			parsedDate, err := time.Parse("2006-01-02", day.Date)
			if err == nil {
				status.Unlocked = true
				status.UnlockedAt = &parsedDate
				status.CurrentValue = float64(totalTraffic)
				status.Progress = 1.0
				return status
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

// checkOnFireAchievement проверяет 451 ГБ upload трафика
func (c *Calculator) checkOnFireAchievement(achievement Achievement) AchievementStatus {
	status := AchievementStatus{
		Achievement: achievement,
		TargetValue: achievement.Threshold,
	}

	totalUploaded := uint64(0)

	calendarData := c.aggregator.GetCalendarData(nil)

	for _, day := range calendarData {
		dayStats := c.aggregator.GetDayStats(day.Date)
		if dayStats == nil {
			continue
		}

		totalUploaded += dayStats.Uploaded

		if float64(totalUploaded) >= achievement.Threshold {
			parsedDate, err := time.Parse("2006-01-02", day.Date)
			if err == nil {
				status.Unlocked = true
				status.UnlockedAt = &parsedDate
				status.CurrentValue = float64(totalUploaded)
				status.Progress = 1.0
				return status
			}
		}
	}

	status.CurrentValue = float64(totalUploaded)
	status.Progress = status.CurrentValue / status.TargetValue
	if status.Progress > 1.0 {
		status.Progress = 1.0
	}

	return status
}

// checkThreeBodyAchievement проверяет ровно 3 устройства за день
func (c *Calculator) checkThreeBodyAchievement(achievement Achievement) AchievementStatus {
	status := AchievementStatus{
		Achievement: achievement,
		TargetValue: 1,
	}

	calendarData := c.aggregator.GetCalendarData(nil)

	for _, day := range calendarData {
		dayStats := c.aggregator.GetDayStats(day.Date)
		if dayStats == nil {
			continue
		}

		if len(dayStats.Devices) == 3 {
			parsedDate, err := time.Parse("2006-01-02", day.Date)
			if err == nil {
				status.Unlocked = true
				status.UnlockedAt = &parsedDate
				status.CurrentValue = 1
				status.Progress = 1.0
				return status
			}
		}
	}

	status.CurrentValue = 0
	status.Progress = 0

	return status
}

// checkMissMeAchievement проверяет возвращение устройства после 90+ дней отсутствия
func (c *Calculator) checkMissMeAchievement(achievement Achievement) AchievementStatus {
	status := AchievementStatus{
		Achievement: achievement,
		TargetValue: 1,
	}

	// Собираем даты активности для каждого MAC
	macDates := make(map[string][]time.Time)

	calendarData := c.aggregator.GetCalendarData(nil)

	for _, day := range calendarData {
		dayStats := c.aggregator.GetDayStats(day.Date)
		if dayStats == nil {
			continue
		}

		parsedDate, err := time.Parse("2006-01-02", day.Date)
		if err != nil {
			continue
		}

		for mac := range dayStats.Devices {
			macDates[mac] = append(macDates[mac], parsedDate)
		}
	}

	// Проверяем каждый MAC на наличие gap'a >= 90 дней
	for _, dates := range macDates {
		if len(dates) < 2 {
			continue
		}

		for i := 1; i < len(dates); i++ {
			gap := int(dates[i].Sub(dates[i-1]).Hours() / 24)

			if gap >= int(achievement.Threshold) {
				returnDate := dates[i]
				status.Unlocked = true
				status.UnlockedAt = &returnDate
				status.CurrentValue = 1
				status.Progress = 1.0
				return status
			}
		}
	}

	status.CurrentValue = 0
	status.Progress = 0

	return status
}

// checkSlumberPartyAchievement проверяет 20+ устройств за один день
func (c *Calculator) checkSlumberPartyAchievement(achievement Achievement) AchievementStatus {
	status := AchievementStatus{
		Achievement: achievement,
		TargetValue: achievement.Threshold,
	}

	maxDevices := 0

	calendarData := c.aggregator.GetCalendarData(nil)

	for _, day := range calendarData {
		dayStats := c.aggregator.GetDayStats(day.Date)
		if dayStats == nil {
			continue
		}

		deviceCount := len(dayStats.Devices)
		if deviceCount > maxDevices {
			maxDevices = deviceCount
		}

		if float64(deviceCount) >= achievement.Threshold {
			parsedDate, err := time.Parse("2006-01-02", day.Date)
			if err == nil {
				status.Unlocked = true
				status.UnlockedAt = &parsedDate
				status.CurrentValue = float64(deviceCount)
				status.Progress = 1.0
				return status
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

// checkILoveYouAchievement проверяет 143 ГБ за один день
func (c *Calculator) checkILoveYouAchievement(achievement Achievement) AchievementStatus {
	status := AchievementStatus{
		Achievement: achievement,
		TargetValue: achievement.Threshold,
	}

	maxDailyTraffic := uint64(0)

	calendarData := c.aggregator.GetCalendarData(nil)

	for _, day := range calendarData {
		dayStats := c.aggregator.GetDayStats(day.Date)
		if dayStats == nil {
			continue
		}

		dailyTraffic := dayStats.Downloaded + dayStats.Uploaded
		if dailyTraffic > maxDailyTraffic {
			maxDailyTraffic = dailyTraffic
		}

		if float64(dailyTraffic) >= achievement.Threshold {
			parsedDate, err := time.Parse("2006-01-02", day.Date)
			if err == nil {
				status.Unlocked = true
				status.UnlockedAt = &parsedDate
				status.CurrentValue = float64(dailyTraffic)
				status.Progress = 1.0
				return status
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

// checkFTPTrafficAchievement проверяет достижения на трафик по FTP (порт 21)
func (c *Calculator) checkFTPTrafficAchievement(achievement Achievement) AchievementStatus {
	status := AchievementStatus{
		Achievement: achievement,
		TargetValue: achievement.Threshold,
	}

	totalTraffic := uint64(0)

	calendarData := c.aggregator.GetCalendarData(nil)
	allData := c.cache.GetAll()

	for _, day := range calendarData {
		for path, data := range allData {
			fileDate := c.aggregator.ExtractDateFromFilename(path)
			if fileDate != day.Date {
				continue
			}

			for _, row := range data.Data {
				if len(row) < 9 {
					continue
				}

				port, ok := row[2].(uint16)
				if !ok {
					continue
				}

				// FTP порт 21
				if port == 21 {
					rxBytes, _ := row[6].(uint64)
					txBytes, _ := row[8].(uint64)
					totalTraffic += rxBytes + txBytes
				}
			}

			if float64(totalTraffic) >= achievement.Threshold {
				parsedDate, err := time.Parse("2006-01-02", day.Date)
				if err == nil {
					status.Unlocked = true
					status.UnlockedAt = &parsedDate
					status.CurrentValue = float64(totalTraffic)
					status.Progress = 1.0
					return status
				}
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

// checkHTTPTrafficAchievement проверяет достижения на трафик по HTTP (порт 80)
func (c *Calculator) checkHTTPTrafficAchievement(achievement Achievement) AchievementStatus {
	status := AchievementStatus{
		Achievement: achievement,
		TargetValue: achievement.Threshold,
	}

	totalTraffic := uint64(0)

	calendarData := c.aggregator.GetCalendarData(nil)
	allData := c.cache.GetAll()

	for _, day := range calendarData {
		for path, data := range allData {
			fileDate := c.aggregator.ExtractDateFromFilename(path)
			if fileDate != day.Date {
				continue
			}

			for _, row := range data.Data {
				if len(row) < 9 {
					continue
				}

				proto, ok := row[1].(string)
				if !ok {
					continue
				}

				port, ok := row[2].(uint16)
				if !ok {
					continue
				}

				// HTTP порт 80 по TCP
				if port == 80 && strings.ToLower(proto) == "tcp" {
					rxBytes, _ := row[6].(uint64)
					txBytes, _ := row[8].(uint64)
					totalTraffic += rxBytes + txBytes
				}
			}

			if float64(totalTraffic) >= achievement.Threshold {
				parsedDate, err := time.Parse("2006-01-02", day.Date)
				if err == nil {
					status.Unlocked = true
					status.UnlockedAt = &parsedDate
					status.CurrentValue = float64(totalTraffic)
					status.Progress = 1.0
					return status
				}
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

// checkDNSQueriesAchievement проверяет достижения на количество DNS запросов (порт 53)
func (c *Calculator) checkDNSQueriesAchievement(achievement Achievement) AchievementStatus {
	status := AchievementStatus{
		Achievement: achievement,
		TargetValue: achievement.Threshold,
	}

	totalQueries := uint64(0)

	calendarData := c.aggregator.GetCalendarData(nil)
	allData := c.cache.GetAll()

	for _, day := range calendarData {
		for path, data := range allData {
			fileDate := c.aggregator.ExtractDateFromFilename(path)
			if fileDate != day.Date {
				continue
			}

			for _, row := range data.Data {
				if len(row) < 10 {
					continue
				}

				port, ok := row[2].(uint16)
				if !ok {
					continue
				}

				// DNS порт 53 - считаем пакеты как запросы
				if port == 53 {
					rxPkts, _ := row[7].(uint64)
					txPkts, _ := row[9].(uint64)
					totalQueries += rxPkts + txPkts
				}
			}

			if float64(totalQueries) >= achievement.Threshold {
				parsedDate, err := time.Parse("2006-01-02", day.Date)
				if err == nil {
					status.Unlocked = true
					status.UnlockedAt = &parsedDate
					status.CurrentValue = float64(totalQueries)
					status.Progress = 1.0
					return status
				}
			}
		}
	}

	status.CurrentValue = float64(totalQueries)
	status.Progress = status.CurrentValue / status.TargetValue
	if status.Progress > 1.0 {
		status.Progress = 1.0
	}

	return status
}

// checkGhostMacAchievement проверяет наличие устройства с MAC 00:00:00:00:00:00
func (c *Calculator) checkGhostMacAchievement(achievement Achievement) AchievementStatus {
	status := AchievementStatus{
		Achievement: achievement,
		TargetValue: achievement.Threshold,
	}

	var unlockedDate *time.Time

	calendarData := c.aggregator.GetCalendarData(nil)
	allData := c.cache.GetAll()

	for _, day := range calendarData {
		if status.Unlocked {
			break
		}

		for path, data := range allData {
			fileDate := c.aggregator.ExtractDateFromFilename(path)
			if fileDate != day.Date {
				continue
			}

			for _, row := range data.Data {
				if len(row) < 4 {
					continue
				}

				mac, ok := row[3].(string)
				if !ok {
					continue
				}

				// Призрак!
				if mac == "00:00:00:00:00:00" {
					parsedDate, err := time.Parse("2006-01-02", day.Date)
					if err == nil {
						unlockedDate = &parsedDate
						status.Unlocked = true
						status.UnlockedAt = unlockedDate
						status.CurrentValue = 1
						status.Progress = 1.0
						return status
					}
				}
			}
		}
	}

	status.CurrentValue = 0
	status.Progress = 0

	return status
}

// checkDailyBurnerAchievement проверяет достижение "Daily Burner" - максимальный трафик за день во всей сети
func (c *Calculator) checkDailyBurnerAchievement(achievement Achievement) AchievementStatus {
	status := AchievementStatus{
		Achievement: achievement,
		TargetValue: achievement.Threshold,
	}

	maxDailyTraffic := uint64(0)

	calendarData := c.aggregator.GetCalendarData(nil)

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
		if float64(dailyTraffic) >= achievement.Threshold {
			parsedDate, err := time.Parse("2006-01-02", day.Date)
			if err == nil {
				status.Unlocked = true
				status.UnlockedAt = &parsedDate
				status.CurrentValue = float64(dailyTraffic)
				status.Progress = 1.0
				return status
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

	calendarData := c.aggregator.GetCalendarData(nil)
	maxStreak := 0
	currentStreak := 0
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
				if currentStreak >= int(achievement.Threshold) {
					status.Unlocked = true
					status.UnlockedAt = &currentDate
					status.CurrentValue = float64(currentStreak)
					status.Progress = 1.0
					return status
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

	calendarData := c.aggregator.GetCalendarData(nil)
	maxDevices := 0

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
		if float64(deviceCount) >= achievement.Threshold {
			parsedDate, err := time.Parse("2006-01-02", day.Date)
			if err == nil {
				status.Unlocked = true
				status.UnlockedAt = &parsedDate
				status.CurrentValue = float64(deviceCount)
				status.Progress = 1.0
				return status
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

// checkICMPPacketsAchievement проверяет достижения на количество ICMP пакетов
func (c *Calculator) checkICMPPacketsAchievement(achievement Achievement) AchievementStatus {
	status := AchievementStatus{
		Achievement: achievement,
		TargetValue: achievement.Threshold,
	}

	totalPackets := uint64(0)

	calendarData := c.aggregator.GetCalendarData(nil)
	allData := c.cache.GetAll()

	for _, day := range calendarData {
		// Находим данные для этого дня
		for path, data := range allData {
			fileDate := c.aggregator.ExtractDateFromFilename(path)
			if fileDate != day.Date {
				continue
			}

			// Считаем ICMP пакеты
			for _, row := range data.Data {
				if len(row) < 10 {
					continue
				}

				proto, ok := row[1].(string)
				if !ok {
					continue
				}

				// ICMP протокол
				if strings.ToLower(proto) == "icmp" {
					rxPkts, _ := row[7].(uint64)
					txPkts, _ := row[9].(uint64)
					totalPackets += rxPkts + txPkts
				}
			}

			// Проверяем разблокировку
			if float64(totalPackets) >= achievement.Threshold {
				parsedDate, err := time.Parse("2006-01-02", day.Date)
				if err == nil {
					status.Unlocked = true
					status.UnlockedAt = &parsedDate
					status.CurrentValue = float64(totalPackets)
					status.Progress = 1.0
					return status
				}
			}
		}
	}

	status.CurrentValue = float64(totalPackets)
	status.Progress = status.CurrentValue / status.TargetValue
	if status.Progress > 1.0 {
		status.Progress = 1.0
	}

	return status
}

// checkSSHTrafficAchievement проверяет достижения на трафик по SSH (порт 22)
func (c *Calculator) checkSSHTrafficAchievement(achievement Achievement) AchievementStatus {
	status := AchievementStatus{
		Achievement: achievement,
		TargetValue: achievement.Threshold,
	}

	totalTraffic := uint64(0)

	calendarData := c.aggregator.GetCalendarData(nil)
	allData := c.cache.GetAll()

	for _, day := range calendarData {
		// Находим данные для этого дня
		for path, data := range allData {
			fileDate := c.aggregator.ExtractDateFromFilename(path)
			if fileDate != day.Date {
				continue
			}

			// Считаем SSH трафик
			for _, row := range data.Data {
				if len(row) < 9 {
					continue
				}

				port, ok := row[2].(uint16)
				if !ok {
					continue
				}

				// SSH порт 22
				if port == 22 {
					rxBytes, _ := row[6].(uint64)
					txBytes, _ := row[8].(uint64)
					totalTraffic += rxBytes + txBytes
				}
			}

			// Проверяем разблокировку
			if float64(totalTraffic) >= achievement.Threshold {
				parsedDate, err := time.Parse("2006-01-02", day.Date)
				if err == nil {
					status.Unlocked = true
					status.UnlockedAt = &parsedDate
					status.CurrentValue = float64(totalTraffic)
					status.Progress = 1.0
					return status
				}
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
