package scanner

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sync"
)

type FileInfo struct {
	Path string
	Hash string
}

type Scanner struct {
	dataDir    string
	files      map[string]string
	mu         sync.RWMutex
	onNewFile  func(path, hash string)
	onModified func(path, hash string)
}

func New(dataDir string) *Scanner {
	return &Scanner{
		dataDir: dataDir,
		files:   make(map[string]string),
	}
}

func (s *Scanner) OnNewFile(fn func(path, hash string)) {
	s.onNewFile = fn
}

func (s *Scanner) OnModified(fn func(path, hash string)) {
	s.onModified = fn
}

func (s *Scanner) Scan() ([]FileInfo, error) {
	pattern := filepath.Join(s.dataDir, "*.db.gz")
	matches, err := filepath.Glob(pattern)
	if err != nil {
		return nil, fmt.Errorf("failed to scan directory: %w", err)
	}

	var changes []FileInfo

	for _, path := range matches {
		hash, err := s.calculateHash(path)
		if err != nil {
			fmt.Printf("Warning: failed to calculate hash for %s: %v\n", path, err)
			continue
		}

		s.mu.RLock()
		oldHash, exists := s.files[path]
		s.mu.RUnlock()

		if !exists {
			s.mu.Lock()
			s.files[path] = hash
			s.mu.Unlock()

			changes = append(changes, FileInfo{Path: path, Hash: hash})

			if s.onNewFile != nil {
				s.onNewFile(path, hash)
			}
		} else if oldHash != hash {
			s.mu.Lock()
			s.files[path] = hash
			s.mu.Unlock()

			changes = append(changes, FileInfo{Path: path, Hash: hash})

			if s.onModified != nil {
				s.onModified(path, hash)
			}
		}
	}

	return changes, nil
}

func (s *Scanner) calculateHash(path string) (string, error) {
	file, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer file.Close()

	hash := sha256.New()
	if _, err := io.Copy(hash, file); err != nil {
		return "", err
	}

	return hex.EncodeToString(hash.Sum(nil)), nil
}

func (s *Scanner) GetFiles() map[string]string {
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := make(map[string]string, len(s.files))
	for k, v := range s.files {
		result[k] = v
	}
	return result
}
