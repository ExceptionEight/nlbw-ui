package main

import (
	"embed"
	"flag"
	"fmt"
	"log"
	"time"

	"nlbw-ui/internal/api"
	"nlbw-ui/internal/cache"
	"nlbw-ui/internal/config"
	"nlbw-ui/internal/demo"
	"nlbw-ui/internal/scanner"
)

//go:embed frontend/dist
var frontendFS embed.FS

func main() {
	// Определяем флаги
	configPath := flag.String("config", "config.yaml", "Path to config file")
	flag.StringVar(configPath, "c", "config.yaml", "Path to config file (shorthand)")
	demoFlag := flag.String("demo", "", "Generate demo data for date range (format: DD.MM.YYYY-DD.MM.YYYY)")
	flag.Parse()

	cfg, err := config.Load(*configPath)
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	dataCache := cache.New()

	// Проверяем, включен ли demo режим
	if *demoFlag != "" {
		fmt.Println("Demo mode enabled!")
		fmt.Printf("Generating demo data for range: %s\n", *demoFlag)

		// Парсим диапазон дат
		dateRange, err := demo.ParseDateRange(*demoFlag)
		if err != nil {
			log.Fatalf("Invalid date range: %v", err)
		}

		// Создаем генератор
		generator := demo.NewGenerator()

		// Генерируем данные для каждого дня в диапазоне
		dates := dateRange.GetAllDates()
		fmt.Printf("Generating data for %d days...\n", len(dates))

		for _, date := range dates {
			trafficData := generator.GenerateForDate(date)

			// Формируем имя "файла" для кэша
			filename := demo.FormatDateForFilename(date) + ".db.gz"
			virtualPath := fmt.Sprintf("demo/%s", filename)

			dataCache.Set(virtualPath, trafficData)
		}

		fmt.Printf("Generated data for %d days\n", len(dates))
	} else {
		// Обычный режим - сканирование файлов
		fileScanner := scanner.New(cfg.DataDir)
		fileScanner.OnNewFile(func(path, hash string) {
			fmt.Printf("New file detected: %s (hash: %s)\n", path, hash[:8])
			if err := dataCache.LoadFile(path); err != nil {
				fmt.Printf("Error loading file %s: %v\n", path, err)
			}
		})
		fileScanner.OnModified(func(path, hash string) {
			fmt.Printf("File modified: %s (new hash: %s)\n", path, hash[:8])
			if err := dataCache.LoadFile(path); err != nil {
				fmt.Printf("Error reloading file %s: %v\n", path, err)
			}
		})

		fmt.Println("Performing initial scan...")
		if _, err := fileScanner.Scan(); err != nil {
			log.Fatalf("Initial scan failed: %v", err)
		}

		go func() {
			ticker := time.NewTicker(cfg.ScanInterval)
			defer ticker.Stop()

			for range ticker.C {
				if _, err := fileScanner.Scan(); err != nil {
					fmt.Printf("Scan error: %v\n", err)
				}
			}
		}()
	}

	server := api.New(dataCache, cfg, frontendFS)
	addr := fmt.Sprintf("%s:%d", cfg.ServerAddress, cfg.ServerPort)

	fmt.Printf("\nNLBW-UI is running!\n")
	fmt.Printf("- Web UI: http://localhost:%d\n", cfg.ServerPort)
	fmt.Printf("- API: http://localhost:%d/api\n", cfg.ServerPort)
	if *demoFlag != "" {
		fmt.Printf("- Mode: DEMO (data range: %s)\n\n", *demoFlag)
	} else {
		fmt.Printf("- Scanning: %s every %v\n\n", cfg.DataDir, cfg.ScanInterval)
	}

	if err := server.Start(addr); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
