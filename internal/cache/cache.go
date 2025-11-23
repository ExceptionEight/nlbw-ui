package cache

import (
	"fmt"
	"path/filepath"
	"sync"

	"nlbw-ui/internal/converter"
)

type Cache struct {
	data      map[string]*converter.TrafficData
	mu        sync.RWMutex
	converter *converter.Converter
}

func New() *Cache {
	return &Cache{
		data:      make(map[string]*converter.TrafficData),
		converter: converter.New(),
	}
}

func (c *Cache) Set(path string, data *converter.TrafficData) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.data[path] = data
}

func (c *Cache) Get(path string) (*converter.TrafficData, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	data, ok := c.data[path]
	return data, ok
}

func (c *Cache) LoadFile(path string) error {
	data, err := c.converter.ConvertFile(path)
	if err != nil {
		return fmt.Errorf("failed to convert file: %w", err)
	}

	c.Set(path, data)
	fmt.Printf("Loaded and cached: %s\n", filepath.Base(path))
	return nil
}

func (c *Cache) GetAll() map[string]*converter.TrafficData {
	c.mu.RLock()
	defer c.mu.RUnlock()

	result := make(map[string]*converter.TrafficData, len(c.data))
	for k, v := range c.data {
		result[k] = v
	}
	return result
}

func (c *Cache) GetFilesList() []string {
	c.mu.RLock()
	defer c.mu.RUnlock()

	files := make([]string, 0, len(c.data))
	for path := range c.data {
		files = append(files, filepath.Base(path))
	}
	return files
}
