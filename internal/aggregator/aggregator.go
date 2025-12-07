package aggregator

import (
	"fmt"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"nlbw-ui/internal/cache"
	"nlbw-ui/internal/config"
	"nlbw-ui/internal/converter"
)

type DeviceStats struct {
	MAC         string `json:"mac"`
	FriendlyName string `json:"friendly_name"`
	IP          string `json:"ip"`
	Downloaded  uint64 `json:"downloaded"`
	Uploaded    uint64 `json:"uploaded"`
	RxPackets   uint64 `json:"rx_packets"`
	TxPackets   uint64 `json:"tx_packets"`
	Connections uint64 `json:"connections"`
}

type ProtocolStats struct {
	Protocol    string `json:"protocol"`
	Port        uint16 `json:"port"`
	Downloaded  uint64 `json:"downloaded"`
	Uploaded    uint64 `json:"uploaded"`
	RxPackets   uint64 `json:"rx_packets"`
	TxPackets   uint64 `json:"tx_packets"`
	Connections uint64 `json:"connections"`
}

type DayStats struct {
	Date       string                  `json:"date"`
	Downloaded uint64                  `json:"downloaded"`
	Uploaded   uint64                  `json:"uploaded"`
	Devices    map[string]*DeviceStats `json:"devices,omitempty"`
}

type CalendarDay struct {
	Date       string `json:"date"`
	Value      uint64 `json:"value"`      // total traffic
	Downloaded uint64 `json:"downloaded"` // rx bytes
	Uploaded   uint64 `json:"uploaded"`   // tx bytes
}

type Aggregator struct {
	cache  *cache.Cache
	config *config.Config
}

func New(c *cache.Cache, cfg *config.Config) *Aggregator {
	return &Aggregator{
		cache:  c,
		config: cfg,
	}
}

// ExtractDateFromFilename извлекает дату из имени файла (YYYYMMDD.db.gz)
func (a *Aggregator) ExtractDateFromFilename(filename string) string {
	base := filepath.Base(filename)
	dateStr := strings.TrimSuffix(base, ".db.gz")

	if len(dateStr) == 8 {
		// YYYYMMDD -> YYYY-MM-DD
		return dateStr[0:4] + "-" + dateStr[4:6] + "-" + dateStr[6:8]
	}
	return dateStr
}

// GetCalendarData возвращает данные для матрицы активности
// Если macs не пуст, то фильтрует по устройствам
func (a *Aggregator) GetCalendarData(macs []string) []CalendarDay {
	allData := a.cache.GetAll()
	result := make([]CalendarDay, 0)

	// Создаём set для быстрого поиска MAC-адресов
	macSet := make(map[string]bool)
	for _, mac := range macs {
		macSet[strings.ToLower(mac)] = true
	}
	filterByMacs := len(macs) > 0

	for path, data := range allData {
		date := a.ExtractDateFromFilename(path)
		var downloaded, uploaded uint64

		if filterByMacs {
			// Фильтруем только по выбранным устройствам
			downloaded, uploaded = a.calculateTrafficSplitFiltered(data, macSet)
		} else {
			// Все устройства
			downloaded, uploaded = a.calculateTrafficSplit(data)
		}
		total := downloaded + uploaded

		result = append(result, CalendarDay{
			Date:       date,
			Value:      total,
			Downloaded: downloaded,
			Uploaded:   uploaded,
		})
	}

	sort.Slice(result, func(i, j int) bool {
		return result[i].Date < result[j].Date
	})

	return result
}

// GetDayStats возвращает детальную статистику за конкретный день
func (a *Aggregator) GetDayStats(date string) *DayStats {
	allData := a.cache.GetAll()

	for path, data := range allData {
		fileDate := a.ExtractDateFromFilename(path)
		if fileDate == date {
			return a.aggregateDayData(date, data)
		}
	}

	return nil
}

// GetDeviceProtocols возвращает разбивку по протоколам для устройства
func (a *Aggregator) GetDeviceProtocols(date, mac string) []ProtocolStats {
	allData := a.cache.GetAll()

	for path, data := range allData {
		fileDate := a.ExtractDateFromFilename(path)
		if fileDate == date {
			return a.aggregateDeviceProtocols(mac, data)
		}
	}

	return nil
}

// DaySummary - облегчённая структура для списка дней (без devices)
type DaySummary struct {
	Date       string `json:"date"`
	Downloaded uint64 `json:"downloaded"`
	Uploaded   uint64 `json:"uploaded"`
}

// GetSummary возвращает агрегированную статистику за период
// devices агрегируются за весь период, days содержит только даты и трафик
func (a *Aggregator) GetSummary(from, to string) map[string]interface{} {
	allData := a.cache.GetAll()

	var totalDownloaded, totalUploaded uint64
	daySummaries := make([]DaySummary, 0)
	aggregatedDevices := make(map[string]*DeviceStats)

	fromTime, _ := time.Parse("2006-01-02", from)
	toTime, _ := time.Parse("2006-01-02", to)

	for path, data := range allData {
		fileDate := a.ExtractDateFromFilename(path)
		fileTime, err := time.Parse("2006-01-02", fileDate)
		if err != nil {
			continue
		}

		if (fileTime.Equal(fromTime) || fileTime.After(fromTime)) &&
		   (fileTime.Equal(toTime) || fileTime.Before(toTime)) {
			dayData := a.aggregateDayData(fileDate, data)
			totalDownloaded += dayData.Downloaded
			totalUploaded += dayData.Uploaded

			// Добавляем облегчённую запись дня
			daySummaries = append(daySummaries, DaySummary{
				Date:       dayData.Date,
				Downloaded: dayData.Downloaded,
				Uploaded:   dayData.Uploaded,
			})

			// Агрегируем devices за весь период
			for mac, device := range dayData.Devices {
				if _, exists := aggregatedDevices[mac]; !exists {
					aggregatedDevices[mac] = &DeviceStats{
						MAC:          device.MAC,
						FriendlyName: device.FriendlyName,
						IP:           device.IP,
					}
				}
				agg := aggregatedDevices[mac]
				agg.Downloaded += device.Downloaded
				agg.Uploaded += device.Uploaded
				agg.RxPackets += device.RxPackets
				agg.TxPackets += device.TxPackets
				agg.Connections += device.Connections
				// Обновляем IP на самый свежий
				if device.IP != "" {
					agg.IP = device.IP
				}
			}
		}
	}

	sort.Slice(daySummaries, func(i, j int) bool {
		return daySummaries[i].Date < daySummaries[j].Date
	})

	return map[string]interface{}{
		"from":             from,
		"to":               to,
		"total_downloaded": totalDownloaded,
		"total_uploaded":   totalUploaded,
		"devices":          aggregatedDevices,
		"days":             daySummaries,
	}
}

// GetTimeseries возвращает данные для графиков
func (a *Aggregator) GetTimeseries(from, to string, macs []string) []DayStats {
	allData := a.cache.GetAll()
	result := make([]DayStats, 0)

	fromTime, _ := time.Parse("2006-01-02", from)
	toTime, _ := time.Parse("2006-01-02", to)

	for path, data := range allData {
		fileDate := a.ExtractDateFromFilename(path)
		fileTime, err := time.Parse("2006-01-02", fileDate)
		if err != nil {
			continue
		}

		if (fileTime.Equal(fromTime) || fileTime.After(fromTime)) &&
		   (fileTime.Equal(toTime) || fileTime.Before(toTime)) {
			dayData := a.aggregateDayData(fileDate, data)

			// Фильтрация по устройствам если указаны
			if len(macs) > 0 {
				dayData = a.filterByDevices(dayData, macs)
			}

			result = append(result, *dayData)
		}
	}

	sort.Slice(result, func(i, j int) bool {
		return result[i].Date < result[j].Date
	})

	return result
}

func (a *Aggregator) calculateTotalTraffic(data *converter.TrafficData) uint64 {
	downloaded, uploaded := a.calculateTrafficSplit(data)
	return downloaded + uploaded
}

func (a *Aggregator) calculateTrafficSplit(data *converter.TrafficData) (uint64, uint64) {
	var downloaded, uploaded uint64
	for _, row := range data.Data {
		if len(row) > 8 {
			if rxBytes, ok := row[6].(uint64); ok {
				downloaded += rxBytes
			}
			if txBytes, ok := row[8].(uint64); ok {
				uploaded += txBytes
			}
		}
	}
	return downloaded, uploaded
}

func (a *Aggregator) calculateTrafficSplitFiltered(data *converter.TrafficData, macSet map[string]bool) (uint64, uint64) {
	var downloaded, uploaded uint64
	for _, row := range data.Data {
		if len(row) > 8 {
			// Проверяем MAC-адрес (row[3])
			if mac, ok := row[3].(string); ok {
				if !macSet[strings.ToLower(mac)] {
					continue
				}
			}
			if rxBytes, ok := row[6].(uint64); ok {
				downloaded += rxBytes
			}
			if txBytes, ok := row[8].(uint64); ok {
				uploaded += txBytes
			}
		}
	}
	return downloaded, uploaded
}

func (a *Aggregator) aggregateDayData(date string, data *converter.TrafficData) *DayStats {
	stats := &DayStats{
		Date:    date,
		Devices: make(map[string]*DeviceStats),
	}

	for _, row := range data.Data {
		if len(row) < 11 {
			continue
		}

		mac := row[3].(string)
		ip := row[4].(string)
		rxBytes := row[6].(uint64)
		rxPkts := row[7].(uint64)
		txBytes := row[8].(uint64)
		txPkts := row[9].(uint64)
		conns := row[5].(uint64)

		stats.Downloaded += rxBytes
		stats.Uploaded += txBytes

		if _, exists := stats.Devices[mac]; !exists {
			stats.Devices[mac] = &DeviceStats{
				MAC:          mac,
				FriendlyName: a.config.GetFriendlyName(mac),
				IP:           ip,
			}
		}

		device := stats.Devices[mac]
		device.Downloaded += rxBytes
		device.Uploaded += txBytes
		device.RxPackets += rxPkts
		device.TxPackets += txPkts
		device.Connections += conns
	}

	return stats
}

func (a *Aggregator) aggregateDeviceProtocols(mac string, data *converter.TrafficData) []ProtocolStats {
	protoMap := make(map[string]*ProtocolStats)
	normalizedMAC := strings.ToLower(mac)

	for _, row := range data.Data {
		if len(row) < 11 {
			continue
		}

		rowMac := strings.ToLower(row[3].(string))
		if rowMac != normalizedMAC {
			continue
		}

		proto := row[1].(string)
		port := row[2].(uint16)
		key := fmt.Sprintf("%s:%d", proto, port)

		if _, exists := protoMap[key]; !exists {
			protoMap[key] = &ProtocolStats{
				Protocol: proto,
				Port:     port,
			}
		}

		ps := protoMap[key]
		ps.Downloaded += row[6].(uint64)
		ps.Uploaded += row[8].(uint64)
		ps.RxPackets += row[7].(uint64)
		ps.TxPackets += row[9].(uint64)
		ps.Connections += row[5].(uint64)
	}

	result := make([]ProtocolStats, 0, len(protoMap))
	for _, ps := range protoMap {
		result = append(result, *ps)
	}

	sort.Slice(result, func(i, j int) bool {
		return result[i].Downloaded > result[j].Downloaded
	})

	return result
}

// GetDeviceProtocolsRange возвращает агрегированные протоколы устройства за диапазон дат
func (a *Aggregator) GetDeviceProtocolsRange(from, to, mac string) []ProtocolStats {
	allData := a.cache.GetAll()
	protoMap := make(map[string]*ProtocolStats)

	fromTime, _ := time.Parse("2006-01-02", from)
	toTime, _ := time.Parse("2006-01-02", to)
	normalizedMAC := strings.ToLower(mac)

	for path, data := range allData {
		fileDate := a.ExtractDateFromFilename(path)
		fileTime, err := time.Parse("2006-01-02", fileDate)
		if err != nil {
			continue
		}

		if (fileTime.Equal(fromTime) || fileTime.After(fromTime)) &&
		   (fileTime.Equal(toTime) || fileTime.Before(toTime)) {
			// Агрегируем протоколы за этот день
			for _, row := range data.Data {
				if len(row) < 11 {
					continue
				}

				rowMac := strings.ToLower(row[3].(string))
				if rowMac != normalizedMAC {
					continue
				}

				proto := row[1].(string)
				port := row[2].(uint16)
				key := fmt.Sprintf("%s:%d", proto, port)

				if _, exists := protoMap[key]; !exists {
					protoMap[key] = &ProtocolStats{
						Protocol: proto,
						Port:     port,
					}
				}

				ps := protoMap[key]
				ps.Downloaded += row[6].(uint64)
				ps.Uploaded += row[8].(uint64)
				ps.RxPackets += row[7].(uint64)
				ps.TxPackets += row[9].(uint64)
				ps.Connections += row[5].(uint64)
			}
		}
	}

	result := make([]ProtocolStats, 0, len(protoMap))
	for _, ps := range protoMap {
		result = append(result, *ps)
	}

	sort.Slice(result, func(i, j int) bool {
		return result[i].Downloaded > result[j].Downloaded
	})

	return result
}

func (a *Aggregator) filterByDevices(dayData *DayStats, macs []string) *DayStats {
	filtered := &DayStats{
		Date:    dayData.Date,
		Devices: make(map[string]*DeviceStats),
	}

	macSet := make(map[string]bool)
	for _, mac := range macs {
		macSet[strings.ToLower(mac)] = true
	}

	for mac, device := range dayData.Devices {
		if macSet[strings.ToLower(mac)] {
			filtered.Downloaded += device.Downloaded
			filtered.Uploaded += device.Uploaded
			filtered.Devices[mac] = device
		}
	}

	return filtered
}
