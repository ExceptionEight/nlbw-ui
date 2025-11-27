package achievements

const (
	// Data achievements
	AchievementFirstGigabyte = "first_gigabyte"
	AchievementDataHoarder   = "data_hoarder"
	AchievementTerabyteClub  = "terabyte_club"
	AchievementDailyBurner   = "daily_burner"

	// Activity achievements
	AchievementWeekWarrior   = "week_warrior"
	AchievementMonthlyActive = "monthly_active"

	// Network achievements
	AchievementNetworkGrowth = "network_growth"
)

// Пороговые значения в байтах
const (
	OneGigabyte  = 1024 * 1024 * 1024
	HundredGB    = 100 * OneGigabyte
	OneTerabyte  = 1024 * OneGigabyte
	TenGigabytes = 10 * OneGigabyte
)

// AllAchievements возвращает список всех доступных достижений
func AllAchievements() []Achievement {
	return []Achievement{
		// Категория: Объём данных
		{
			ID:          AchievementFirstGigabyte,
			Name:        "First Gigabyte",
			Description: "Download or upload 1 GB of data total",
			Category:    CategoryData,
			Threshold:   OneGigabyte,
		},
		{
			ID:          AchievementDataHoarder,
			Name:        "Data Hoarder",
			Description: "Transfer 100 GB of data total",
			Category:    CategoryData,
			Threshold:   HundredGB,
		},
		{
			ID:          AchievementTerabyteClub,
			Name:        "Terabyte Club",
			Description: "Transfer 1 TB of data total",
			Category:    CategoryData,
			Threshold:   OneTerabyte,
		},
		{
			ID:          AchievementDailyBurner,
			Name:        "Daily Burner",
			Description: "Transfer more than 10 GB in a single day",
			Category:    CategoryData,
			Threshold:   TenGigabytes,
		},

		// Категория: Активность
		{
			ID:          AchievementWeekWarrior,
			Name:        "Week Warrior",
			Description: "Be active for 7 consecutive days",
			Category:    CategoryActivity,
			Threshold:   7,
		},
		{
			ID:          AchievementMonthlyActive,
			Name:        "Monthly Active",
			Description: "Be active for 30 consecutive days",
			Category:    CategoryActivity,
			Threshold:   30,
		},

		// Категория: Сеть
		{
			ID:          AchievementNetworkGrowth,
			Name:        "Network Growth",
			Description: "Have 5 or more active devices in the network",
			Category:    CategoryNetwork,
			Threshold:   5,
		},
	}
}

// GetAchievementByID возвращает достижение по ID
func GetAchievementByID(id string) *Achievement {
	for _, achievement := range AllAchievements() {
		if achievement.ID == id {
			return &achievement
		}
	}
	return nil
}
