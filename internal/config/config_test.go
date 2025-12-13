package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestGetFriendlyName_CaseInsensitive(t *testing.T) {
	cfg := &Config{
		FriendlyNames: map[string]string{
			"aa:bb:cc:dd:ee:ff": "Test Device",
			"11:22:33:44:55:66": "Another Device",
		},
	}

	tests := []struct {
		name     string
		mac      string
		expected string
	}{
		{
			name:     "lowercase mac matches lowercase config",
			mac:      "aa:bb:cc:dd:ee:ff",
			expected: "Test Device",
		},
		{
			name:     "uppercase mac matches lowercase config",
			mac:      "AA:BB:CC:DD:EE:FF",
			expected: "Test Device",
		},
		{
			name:     "mixed case mac matches lowercase config",
			mac:      "Aa:Bb:Cc:Dd:Ee:Ff",
			expected: "Test Device",
		},
		{
			name:     "unknown mac returns original",
			mac:      "99:99:99:99:99:99",
			expected: "99:99:99:99:99:99",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := cfg.GetFriendlyName(tt.mac)
			if result != tt.expected {
				t.Errorf("GetFriendlyName(%s) = %s; want %s", tt.mac, result, tt.expected)
			}
		})
	}
}

func TestNormalizeMACAddresses(t *testing.T) {
	cfg := &Config{
		FriendlyNames: map[string]string{
			"AA:BB:CC:DD:EE:FF": "Device 1",
			"11:22:33:44:55:66": "Device 2",
			"FF:EE:DD:CC:BB:AA": "Device 3",
		},
	}

	cfg.normalizeMACAddresses()

	// Check that all keys are normalized to lowercase
	for mac := range cfg.FriendlyNames {
		for _, char := range mac {
			if char >= 'A' && char <= 'F' {
				t.Errorf("MAC address %s still contains uppercase characters", mac)
			}
		}
	}

	// Check that values are preserved
	if cfg.FriendlyNames["aa:bb:cc:dd:ee:ff"] != "Device 1" {
		t.Error("Device 1 name not preserved after normalization")
	}
	if cfg.FriendlyNames["11:22:33:44:55:66"] != "Device 2" {
		t.Error("Device 2 name not preserved after normalization")
	}
	if cfg.FriendlyNames["ff:ee:dd:cc:bb:aa"] != "Device 3" {
		t.Error("Device 3 name not preserved after normalization")
	}
}

func TestLoad_NormalizesMACAddresses(t *testing.T) {
	// Create temporary config file
	tempDir := t.TempDir()
	configPath := filepath.Join(tempDir, "config.yaml")

	configContent := `data_dir: ./data
server_address: 0.0.0.0
server_port: 8080
friendly_names:
  "AA:BB:CC:DD:EE:FF": "Uppercase Device"
  "11:22:33:44:55:66": "Numeric Device"
`

	err := os.WriteFile(configPath, []byte(configContent), 0644)
	if err != nil {
		t.Fatalf("Failed to write test config: %v", err)
	}

	cfg, err := Load(configPath)
	if err != nil {
		t.Fatalf("Failed to load config: %v", err)
	}

	// Test that MAC addresses were normalized
	if cfg.GetFriendlyName("aa:bb:cc:dd:ee:ff") != "Uppercase Device" {
		t.Error("Failed to get friendly name with lowercase MAC after normalization")
	}

	if cfg.GetFriendlyName("AA:BB:CC:DD:EE:FF") != "Uppercase Device" {
		t.Error("Failed to get friendly name with uppercase MAC after normalization")
	}

	if cfg.GetFriendlyName("11:22:33:44:55:66") != "Numeric Device" {
		t.Error("Failed to get friendly name for numeric MAC")
	}
}

func TestConfig_Validate(t *testing.T) {
	tests := []struct {
		name      string
		config    Config
		expectErr bool
	}{
		{
			name: "valid config",
			config: Config{
				DataDir:    "./data",
				ServerPort: 8080,
			},
			expectErr: false,
		},
		{
			name: "empty data_dir",
			config: Config{
				DataDir:    "",
				ServerPort: 8080,
			},
			expectErr: true,
		},
		{
			name: "invalid port",
			config: Config{
				DataDir:    "./data",
				ServerPort: 99999,
			},
			expectErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.config.validate()
			if tt.expectErr && err == nil {
				t.Error("Expected error but got none")
			}
			if !tt.expectErr && err != nil {
				t.Errorf("Expected no error but got: %v", err)
			}
		})
	}
}
