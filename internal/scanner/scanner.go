package scanner

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"sync"
	"time"
)

type FileInfo struct {
	Path    string
	Size    int64
	ModTime time.Time
}

type fileState struct {
	Size    int64
	ModTime time.Time
	Frozen  bool // true = файл больше не будет меняться
}

type Scanner struct {
	dataDir    string
	files      map[string]*fileState
	mu         sync.RWMutex
	onNewFile  func(path string)
	onModified func(path string)
}

func New(dataDir string) *Scanner {
	return &Scanner{
		dataDir: dataDir,
		files:   make(map[string]*fileState),
	}
}

func (s *Scanner) OnNewFile(fn func(path string)) {
	s.onNewFile = fn
}

func (s *Scanner) OnModified(fn func(path string)) {
	s.onModified = fn
}

// Scan проверяет файлы на изменения
// При первом запуске сканирует все файлы
// При последующих - только последние 2 (сегодня + вчера)
func (s *Scanner) Scan() ([]FileInfo, error) {
	pattern := filepath.Join(s.dataDir, "*.db.gz")
	matches, err := filepath.Glob(pattern)
	if err != nil {
		return nil, fmt.Errorf("failed to scan directory: %w", err)
	}

	// Сортируем по имени (YYYYMMDD.db.gz) - новые в конце
	sort.Strings(matches)

	s.mu.RLock()
	isFirstScan := len(s.files) == 0
	s.mu.RUnlock()

	var filesToCheck []string

	if isFirstScan {
		// Первый запуск - проверяем все файлы
		filesToCheck = matches
	} else {
		// Последующие запуски - только последние 2 файла
		if len(matches) >= 2 {
			filesToCheck = matches[len(matches)-2:]
		} else {
			filesToCheck = matches
		}
	}

	var changes []FileInfo

	for _, path := range filesToCheck {
		info, err := os.Stat(path)
		if err != nil {
			fmt.Printf("Warning: failed to stat %s: %v\n", path, err)
			continue
		}

		size := info.Size()
		modTime := info.ModTime()

		s.mu.RLock()
		state, exists := s.files[path]
		s.mu.RUnlock()

		if !exists {
			// Новый файл
			s.mu.Lock()
			s.files[path] = &fileState{
				Size:    size,
				ModTime: modTime,
				Frozen:  false,
			}
			s.mu.Unlock()

			changes = append(changes, FileInfo{Path: path, Size: size, ModTime: modTime})

			if s.onNewFile != nil {
				s.onNewFile(path)
			}
		} else if !state.Frozen && (state.Size != size || !state.ModTime.Equal(modTime)) {
			// Файл изменился
			s.mu.Lock()
			s.files[path] = &fileState{
				Size:    size,
				ModTime: modTime,
				Frozen:  false,
			}
			s.mu.Unlock()

			changes = append(changes, FileInfo{Path: path, Size: size, ModTime: modTime})

			if s.onModified != nil {
				s.onModified(path)
			}
		}
	}

	// После первого скана замораживаем все файлы кроме последних 2
	if isFirstScan && len(matches) > 2 {
		s.mu.Lock()
		for i := 0; i < len(matches)-2; i++ {
			if state, ok := s.files[matches[i]]; ok {
				state.Frozen = true
			}
		}
		s.mu.Unlock()
	}

	return changes, nil
}

func (s *Scanner) GetFiles() map[string]FileInfo {
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := make(map[string]FileInfo, len(s.files))
	for path, state := range s.files {
		result[path] = FileInfo{
			Path:    path,
			Size:    state.Size,
			ModTime: state.ModTime,
		}
	}
	return result
}
