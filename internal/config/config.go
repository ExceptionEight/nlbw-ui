package config

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"gopkg.in/yaml.v3"
)

type Config struct {
	DataDir       string            `yaml:"data_dir"`
	ScanInterval  time.Duration     `yaml:"scan_interval"`
	ServerAddress string            `yaml:"server_address"`
	ServerPort    int               `yaml:"server_port"`
	FriendlyNames map[string]string `yaml:"friendly_names"`
}

const defaultConfig = `# NLBW Monitor Configuration
# Directory containing *.db.gz files
data_dir: ./data

# Scan interval for detecting new or modified files (e.g., 5s, 1m, 5m)
scan_interval: 10s

# Web server settings
server_address: 0.0.0.0
server_port: 8080

# Friendly names for devices (MAC address -> human-readable name)
friendly_names:
  "4a:bd:24:cf:07:5d": "iPhone 13"
  "bc:24:11:72:be:55": "MacBook Pro"
  "ea:fa:e9:d2:67:f4": "iPad Air"
`

func Load(path string) (*Config, error) {
	if _, err := os.Stat(path); os.IsNotExist(err) {
		fmt.Printf("Warning: config.yaml not found. Creating default config at %s\n", path)
		if err := createDefaultConfig(path); err != nil {
			return nil, fmt.Errorf("failed to create default config: %w", err)
		}
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read config: %w", err)
	}

	var cfg Config
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("failed to parse config: %w", err)
	}

	if err := cfg.validate(); err != nil {
		return nil, fmt.Errorf("invalid config: %w", err)
	}

	cfg.DataDir, err = filepath.Abs(cfg.DataDir)
	if err != nil {
		return nil, fmt.Errorf("failed to resolve data_dir path: %w", err)
	}

	// Normalize MAC addresses in friendly_names to lowercase
	cfg.normalizeMACAddresses()

	return &cfg, nil
}

func createDefaultConfig(path string) error {
	dir := filepath.Dir(path)
	if dir != "." && dir != "" {
		if err := os.MkdirAll(dir, 0755); err != nil {
			return err
		}
	}

	return os.WriteFile(path, []byte(defaultConfig), 0644)
}

func (c *Config) validate() error {
	if c.DataDir == "" {
		return fmt.Errorf("data_dir cannot be empty")
	}

	if c.ScanInterval <= 0 {
		return fmt.Errorf("scan_interval must be positive")
	}

	if c.ServerPort <= 0 || c.ServerPort > 65535 {
		return fmt.Errorf("server_port must be between 1 and 65535")
	}

	return nil
}

func (c *Config) GetFriendlyName(mac string) string {
	// Normalize MAC address to lowercase for case-insensitive lookup
	normalizedMAC := strings.ToLower(mac)
	if name, ok := c.FriendlyNames[normalizedMAC]; ok {
		return name
	}
	return mac
}

// normalizeMACAddresses converts all MAC address keys in FriendlyNames to lowercase
func (c *Config) normalizeMACAddresses() {
	if c.FriendlyNames == nil {
		return
	}

	normalized := make(map[string]string, len(c.FriendlyNames))
	for mac, name := range c.FriendlyNames {
		normalized[strings.ToLower(mac)] = name
	}
	c.FriendlyNames = normalized
}
