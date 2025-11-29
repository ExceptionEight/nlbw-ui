package achievements

const (
	// Data achievements
	AchievementFirstGigabyte   = "first_gigabyte"
	AchievementDataHoarder     = "data_hoarder"
	AchievementTerabyteClub    = "terabyte_club"
	AchievementHundredTerabyte = "hundred_terabyte"
	AchievementPetabyteClub    = "petabyte_club"
	AchievementWhatTheFuck     = "what_the_fuck"
	AchievementDailyBurner     = "daily_burner"

	// Activity achievements
	AchievementWeekWarrior   = "week_warrior"
	AchievementMonthlyActive = "monthly_active"

	// Network achievements
	AchievementNetworkGrowth = "network_growth"

	// Protocol achievements - ICMP
	AchievementPingOfDeath = "ping_of_death"
	AchievementUptimeKuma  = "uptime_kuma"
	AchievementSmurfAttack = "smurf_attack"

	// Protocol achievements - SSH
	AchievementRedEyed = "red_eyed"

	// Protocol achievements - FTP
	AchievementWhatYear = "what_year"

	// Protocol achievements - DNS
	AchievementISeekYou = "i_seek_you"

	// Special achievements
	AchievementGhost = "ghost"

	// Party achievements
	AchievementSlumberParty = "slumber_party"

	// Legendary daily achievements
	AchievementILoveYou = "i_love_you"
)

// Пороговые значения в байтах
const (
	OneGigabyte     = 1024 * 1024 * 1024
	TenGigabytes    = 10 * OneGigabyte
	HundredGB       = 100 * OneGigabyte
	OneTerabyte     = 1024 * OneGigabyte
	HundredTerabyte = 100 * OneTerabyte
	OnePetabyte     = 1024 * OneTerabyte
	FivePetabyte    = 5 * OnePetabyte
)

// Пороговые значения для ICMP пакетов
const (
	PingOfDeathPackets = 65_535
	OneMillionPackets  = 1_000_000
	OneBillionPackets  = 1_000_000_000
)

// Прочие пороговые значения
const (
	HundredMegabytes     = 100 * 1024 * 1024
	OneHundredFortyThreeGB = 143 * OneGigabyte
	TwentyDevices        = 20
)

// AllAchievements возвращает список всех доступных достижений
func AllAchievements() []Achievement {
	return []Achievement{
		// Категория: Объём данных
		{
			ID:          AchievementFirstGigabyte,
			Name:        "First Gigabyte",
			Description: "Transfer 1 GB of data total",
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
			ID:          AchievementHundredTerabyte,
			Name:        "Data Center",
			Description: "Transfer 100 TB of data total",
			Category:    CategoryData,
			Threshold:   HundredTerabyte,
		},
		{
			ID:          AchievementPetabyteClub,
			Name:        "Oh my gosh..",
			Description: "Transfer 1 PB of data total",
			Category:    CategoryData,
			Threshold:   OnePetabyte,
		},
		{
			ID:          AchievementWhatTheFuck,
			Name:        "WHAT THE FUCK!!?!?!???!??",
			Description: "Transfer 5 PB of data total",
			Category:    CategoryData,
			Threshold:   FivePetabyte,
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

		// Категория: Протоколы - ICMP
		{
			ID:          AchievementPingOfDeath,
			Name:        "Ping of Death",
			Description: "Send or receive 65,535 ICMP packets",
			Category:    CategoryProtocol,
			Threshold:   PingOfDeathPackets,
		},
		{
			ID:          AchievementUptimeKuma,
			Name:        "Uptime Kuma",
			Description: "Send or receive 1,000,000 ICMP packets",
			Category:    CategoryProtocol,
			Threshold:   OneMillionPackets,
		},
		{
			ID:          AchievementSmurfAttack,
			Name:        "Smurf Attack",
			Description: "Send or receive 1,000,000,000 ICMP packets",
			Category:    CategoryProtocol,
			Threshold:   OneBillionPackets,
		},

		// Категория: Протоколы - SSH
		{
			ID:          AchievementRedEyed,
			Name:        "Red-Eyed",
			Description: "Transfer 1 GB of data via SSH",
			Category:    CategoryProtocol,
			Threshold:   OneGigabyte,
		},

		// Категория: Протоколы - FTP
		{
			ID:          AchievementWhatYear,
			Name:        "What year is it?",
			Description: "Transfer 100 MB of data via FTP",
			Category:    CategoryProtocol,
			Threshold:   HundredMegabytes,
		},

		// Категория: Протоколы - DNS
		{
			ID:          AchievementISeekYou,
			Name:        "I Seek You",
			Description: "One less digit, and it would have been a legend",
			Category:    CategoryProtocol,
			Threshold:   OneMillionPackets,
		},

		// Категория: Специальные
		{
			ID:          AchievementGhost,
			Name:        "???",
			Description: "Detect a device with MAC 00:00:00:00:00:00",
			Category:    CategoryNetwork,
			Threshold:   1,
		},

		// Категория: Сеть - вечеринка
		{
			ID:          AchievementSlumberParty,
			Name:        "Slumber Party",
			Description: "Have 20 or more devices active in a single day",
			Category:    CategoryNetwork,
			Threshold:   TwentyDevices,
		},

		// Категория: Легендарный дневной трафик
		{
			ID:          AchievementILoveYou,
			Name:        "ILOVEYOU",
			Description: "Transfer 143 GB of data in a single day",
			Category:    CategoryData,
			Threshold:   OneHundredFortyThreeGB,
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
