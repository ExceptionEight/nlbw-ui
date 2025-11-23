package main

import (
	"embed"
	"fmt"
	"log"
	"os"
	"time"

	"nlbw-ui/internal/api"
	"nlbw-ui/internal/cache"
	"nlbw-ui/internal/config"
	"nlbw-ui/internal/scanner"
)

//go:embed frontend/dist
var frontendFS embed.FS

func main() {
	cfg, err := config.Load("config.yaml")
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	if _, err := os.Stat(cfg.DataDir); os.IsNotExist(err) {
		fmt.Printf("Warning: data directory does not exist: %s\n", cfg.DataDir)
		fmt.Println("Creating data directory...")
		if err := os.MkdirAll(cfg.DataDir, 0755); err != nil {
			log.Fatalf("Failed to create data directory: %v", err)
		}
	}

	dataCache := cache.New()

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

	server := api.New(dataCache, cfg, frontendFS)
	addr := fmt.Sprintf("%s:%d", cfg.ServerAddress, cfg.ServerPort)

	fmt.Printf("\nNLBW-UI is running!\n")
	fmt.Printf("- Web UI: http://localhost:%d\n", cfg.ServerPort)
	fmt.Printf("- API: http://localhost:%d/api\n", cfg.ServerPort)
	fmt.Printf("- Scanning: %s every %v\n\n", cfg.DataDir, cfg.ScanInterval)

	if err := server.Start(addr); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
