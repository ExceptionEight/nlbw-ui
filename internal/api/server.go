package api

import (
	"embed"
	"encoding/json"
	"fmt"
	"io/fs"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"nlbw-ui/internal/aggregator"
	"nlbw-ui/internal/cache"
	"nlbw-ui/internal/config"
)

type Server struct {
	cache      *cache.Cache
	aggregator *aggregator.Aggregator
	frontendFS embed.FS
}

func New(c *cache.Cache, cfg *config.Config, frontendFS embed.FS) *Server {
	return &Server{
		cache:      c,
		aggregator: aggregator.New(c, cfg),
		frontendFS: frontendFS,
	}
}

func (s *Server) setupRoutes() *http.ServeMux {
	mux := http.NewServeMux()

	// New API endpoints
	mux.HandleFunc("/api/calendar", s.handleGetCalendar)
	mux.HandleFunc("/api/summary", s.handleGetSummary)
	mux.HandleFunc("/api/day/", s.handleGetDay)
	mux.HandleFunc("/api/device/", s.handleGetDevice)
	mux.HandleFunc("/api/timeseries", s.handleGetTimeseries)

	// Old endpoints (keep for compatibility)
	mux.HandleFunc("/api/files", s.handleGetFiles)
	mux.HandleFunc("/api/data/", s.handleGetData)
	mux.HandleFunc("/api/data", s.handleGetAllData)

	staticFS, err := fs.Sub(s.frontendFS, "frontend/dist")
	if err == nil {
		mux.Handle("/", http.FileServer(http.FS(staticFS)))
	} else {
		mux.HandleFunc("/", s.handleFallback)
	}

	return mux
}

func (s *Server) Start(addr string) error {
	mux := s.setupRoutes()
	fmt.Printf("Starting server on %s\n", addr)
	return http.ListenAndServe(addr, s.corsMiddleware(mux))
}

func (s *Server) corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// GET /api/calendar - данные для матрицы активности
func (s *Server) handleGetCalendar(w http.ResponseWriter, r *http.Request) {
	data := s.aggregator.GetCalendarData()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

// GET /api/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
func (s *Server) handleGetSummary(w http.ResponseWriter, r *http.Request) {
	from := r.URL.Query().Get("from")
	to := r.URL.Query().Get("to")

	// Defaults: last 30 days
	if from == "" || to == "" {
		now := time.Now()
		to = now.Format("2006-01-02")
		from = now.AddDate(0, 0, -30).Format("2006-01-02")
	}

	summary := s.aggregator.GetSummary(from, to)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(summary)
}

// GET /api/day/YYYY-MM-DD
func (s *Server) handleGetDay(w http.ResponseWriter, r *http.Request) {
	date := strings.TrimPrefix(r.URL.Path, "/api/day/")
	if date == "" {
		http.Error(w, "date is required", http.StatusBadRequest)
		return
	}

	dayStats := s.aggregator.GetDayStats(date)
	if dayStats == nil {
		http.Error(w, "data not found for this date", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(dayStats)
}

// GET /api/device/YYYY-MM-DD/MAC
func (s *Server) handleGetDevice(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/device/")
	parts := strings.SplitN(path, "/", 2)

	if len(parts) != 2 {
		http.Error(w, "invalid format, use /api/device/YYYY-MM-DD/MAC", http.StatusBadRequest)
		return
	}

	date := parts[0]
	mac := parts[1]

	protocols := s.aggregator.GetDeviceProtocols(date, mac)
	if protocols == nil {
		http.Error(w, "data not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(protocols)
}

// GET /api/timeseries?from=...&to=...&macs=mac1,mac2
func (s *Server) handleGetTimeseries(w http.ResponseWriter, r *http.Request) {
	from := r.URL.Query().Get("from")
	to := r.URL.Query().Get("to")
	macsParam := r.URL.Query().Get("macs")

	// Defaults: last 30 days
	if from == "" || to == "" {
		now := time.Now()
		to = now.Format("2006-01-02")
		from = now.AddDate(0, 0, -30).Format("2006-01-02")
	}

	var macs []string
	if macsParam != "" {
		macs = strings.Split(macsParam, ",")
	}

	timeseries := s.aggregator.GetTimeseries(from, to, macs)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(timeseries)
}

// Old endpoints below

func (s *Server) handleGetFiles(w http.ResponseWriter, r *http.Request) {
	files := s.cache.GetFilesList()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"files": files,
	})
}

func (s *Server) handleGetData(w http.ResponseWriter, r *http.Request) {
	filename := strings.TrimPrefix(r.URL.Path, "/api/data/")
	if filename == "" {
		http.Error(w, "filename is required", http.StatusBadRequest)
		return
	}

	allData := s.cache.GetAll()
	for path, data := range allData {
		if filepath.Base(path) == filename {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(data)
			return
		}
	}

	http.Error(w, "file not found", http.StatusNotFound)
}

func (s *Server) handleGetAllData(w http.ResponseWriter, r *http.Request) {
	allData := s.cache.GetAll()
	result := make(map[string]interface{})
	for path, data := range allData {
		result[filepath.Base(path)] = data
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

func (s *Server) handleFallback(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html")
	fmt.Fprintf(w, `<!DOCTYPE html>
<html>
<head>
	<title>NLBW Monitor</title>
	<style>
		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
			max-width: 800px;
			margin: 50px auto;
			padding: 20px;
			background: #0d1117;
			color: #c9d1d9;
		}
		h1 { color: #58a6ff; }
		code {
			background: #161b22;
			padding: 2px 6px;
			border-radius: 3px;
			color: #f0883e;
		}
		.status {
			padding: 10px;
			background: #161b22;
			border-radius: 6px;
			margin: 20px 0;
		}
		a { color: #58a6ff; text-decoration: none; }
		a:hover { text-decoration: underline; }
	</style>
</head>
<body>
	<h1>NLBW Monitor</h1>
	<div class="status">
		<p>Frontend not built yet. Build the React app first:</p>
		<code>cd frontend && npm install && npm run build</code>
	</div>
	<h2>API Endpoints:</h2>
	<ul>
		<li><a href="/api/calendar">/api/calendar</a> - Calendar heatmap data</li>
		<li><a href="/api/summary">/api/summary</a> - Summary statistics (last 30 days)</li>
		<li>/api/day/YYYY-MM-DD - Day details</li>
		<li>/api/device/YYYY-MM-DD/MAC - Device protocol breakdown</li>
		<li>/api/timeseries - Timeseries data for charts</li>
		<li><a href="/api/files">/api/files</a> - List of files</li>
	</ul>
</body>
</html>`)
}
