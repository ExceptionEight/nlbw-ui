package demo

import (
	"fmt"
	"math"
	"math/rand"
	"strings"
	"time"

	"nlbw-ui/internal/converter"
)

// DateRange представляет диапазон дат для генерации
type DateRange struct {
	From time.Time
	To   time.Time
}

// ParseDateRange парсит строку вида "10.04.2024-29.11.2025"
func ParseDateRange(dateStr string) (*DateRange, error) {
	parts := strings.Split(dateStr, "-")
	if len(parts) != 2 {
		return nil, fmt.Errorf("invalid date range format, expected DD.MM.YYYY-DD.MM.YYYY")
	}

	from, err := time.Parse("02.01.2006", strings.TrimSpace(parts[0]))
	if err != nil {
		return nil, fmt.Errorf("invalid from date: %w", err)
	}

	to, err := time.Parse("02.01.2006", strings.TrimSpace(parts[1]))
	if err != nil {
		return nil, fmt.Errorf("invalid to date: %w", err)
	}

	if to.Before(from) {
		return nil, fmt.Errorf("to date must be after from date")
	}

	return &DateRange{From: from, To: to}, nil
}

// Device представляет виртуальное устройство
type Device struct {
	MAC    string
	IP     string
	Name   string
	IsIoT  bool // IoT устройство (умный дом) с малым трафиком
}

// Generator генерирует demo данные
type Generator struct {
	devices []Device
	rand    *rand.Rand
}

// NewGenerator создает новый генератор с уникальным seed
func NewGenerator() *Generator {
	// Используем текущее время с наносекундами для уникальности
	seed := time.Now().UnixNano()

	devices := []Device{
		// 4 обычных устройства (до 15 ГБ/день)
		{MAC: "00:11:22:33:44:55", IP: "192.168.1.10", Name: "Desktop PC", IsIoT: false},
		{MAC: "aa:bb:cc:dd:ee:ff", IP: "192.168.1.20", Name: "Laptop", IsIoT: false},
		{MAC: "12:34:56:78:9a:bc", IP: "192.168.1.30", Name: "iPhone", IsIoT: false},
		{MAC: "fe:dc:ba:98:76:54", IP: "192.168.1.40", Name: "Smart TV", IsIoT: false},

		// 6 IoT устройств (до 2 МБ/день)
		{MAC: "11:22:33:44:55:66", IP: "192.168.1.50", Name: "Smart Thermostat", IsIoT: true},
		{MAC: "aa:11:bb:22:cc:33", IP: "192.168.1.60", Name: "Smart Light", IsIoT: true},
		{MAC: "ff:ee:dd:cc:bb:aa", IP: "192.168.1.70", Name: "Security Camera", IsIoT: true},
		{MAC: "99:88:77:66:55:44", IP: "192.168.1.80", Name: "Smart Speaker", IsIoT: true},
		{MAC: "bb:aa:99:88:77:66", IP: "192.168.1.90", Name: "Smart Lock", IsIoT: true},
		{MAC: "cc:dd:ee:ff:00:11", IP: "192.168.1.100", Name: "Smart Plug", IsIoT: true},
	}

	return &Generator{
		devices: devices,
		rand:    rand.New(rand.NewSource(seed)),
	}
}

// GenerateForDate генерирует данные для конкретной даты
func (g *Generator) GenerateForDate(date time.Time) *converter.TrafficData {
	data := &converter.TrafficData{
		Columns: []string{"family", "proto", "port", "mac", "ip", "conns", "rx_bytes", "rx_pkts", "tx_bytes", "tx_pkts", "layer7"},
		Data:    make([][]interface{}, 0),
	}

	// 5% дней - пустые (нулевой трафик)
	if g.rand.Float64() < 0.05 {
		return data // возвращаем пустые данные
	}

	// Для каждого устройства генерируем записи
	for _, device := range g.devices {
		// Генерируем суммарный трафик устройства за день
		var totalRx, totalTx uint64
		var numRecords int

		if device.IsIoT {
			// IoT: 100 KB - 2 MB в день
			totalRx = g.generateIoTTraffic()
			totalTx = g.generateIoTTraffic()
			numRecords = g.rand.Intn(3) + 1 // от 1 до 3 записей для IoT
		} else {
			// Обычные: с распределением по весам
			totalRx = g.generateNormalDeviceTraffic()
			// Upload обычно меньше download
			uploadRatio := 0.3 + g.rand.Float64()*0.6
			totalTx = g.generateNormalDeviceTrafficWithRatio(uploadRatio)
			numRecords = g.rand.Intn(10) + 5 // от 5 до 15 записей для обычных
		}

		// Пропускаем устройства с нулевым трафиком
		if totalRx == 0 && totalTx == 0 {
			continue
		}

		// Распределяем суммарный трафик между записями (протоколами/портами)
		for i := 0; i < numRecords; i++ {
			// Доля трафика для этой записи
			portion := 1.0 / float64(numRecords)
			// Добавляем случайную вариацию
			portion = portion * (0.5 + g.rand.Float64())

			rxBytes := uint64(float64(totalRx) * portion)
			txBytes := uint64(float64(totalTx) * portion)

			row := g.generateRecordWithTraffic(device, rxBytes, txBytes)
			data.Data = append(data.Data, row)
		}
	}

	return data
}

// generateRecordWithTraffic генерирует одну запись трафика с заданными объемами
func (g *Generator) generateRecordWithTraffic(device Device, rxBytes, txBytes uint64) []interface{} {
	protocols := []struct {
		name  string
		proto uint8
		ports []uint16
	}{
		{"TCP", 6, []uint16{80, 443, 8080, 22, 3389, 5432, 3306}},
		{"UDP", 17, []uint16{53, 123, 1194, 500, 4500}},
		{"ICMP", 1, []uint16{0}},
	}

	// Выбираем случайный протокол
	protoIdx := g.rand.Intn(len(protocols))
	proto := protocols[protoIdx]

	// Выбираем случайный порт
	port := proto.ports[g.rand.Intn(len(proto.ports))]

	// Количество пакетов примерно пропорционально байтам
	rxPkts := rxBytes / uint64(g.rand.Intn(1000)+500)
	txPkts := txBytes / uint64(g.rand.Intn(1000)+500)
	if rxPkts == 0 && rxBytes > 0 {
		rxPkts = 1
	}
	if txPkts == 0 && txBytes > 0 {
		txPkts = 1
	}

	// Количество соединений
	conns := uint64(g.rand.Intn(100) + 1)

	return []interface{}{
		4,            // family (IPv4)
		proto.name,   // proto
		port,         // port
		device.MAC,   // mac
		device.IP,    // ip
		conns,        // conns
		rxBytes,      // rx_bytes
		rxPkts,       // rx_pkts
		txBytes,      // tx_bytes
		txPkts,       // tx_pkts
		nil,          // layer7
	}
}

// generateNormalDeviceTraffic генерирует трафик для обычного устройства
// Распределение: 2 ГБ = 70%, 0 ГБ = 15%, 15 ГБ = 15%
func (g *Generator) generateNormalDeviceTraffic() uint64 {
	dice := g.rand.Float64()

	if dice < 0.15 {
		// 15% - нулевой трафик
		return 0
	} else if dice < 0.85 {
		// 70% - около 2 ГБ (с вариацией от 1 до 3 ГБ)
		baseTraffic := 2 * 1024 * 1024 * 1024 // 2 ГБ
		variation := g.rand.Float64()*2 - 1   // от -1 до +1 ГБ
		traffic := float64(baseTraffic) + variation*1024*1024*1024
		if traffic < 0 {
			traffic = float64(g.rand.Intn(100*1024*1024) + 1024) // минимум 1 КБ
		}
		return uint64(traffic)
	} else {
		// 15% - около 15 ГБ (с вариацией от 10 до 15 ГБ)
		baseTraffic := 15 * 1024 * 1024 * 1024 // 15 ГБ
		variation := g.rand.Float64() * 5      // от 0 до 5 ГБ вниз
		traffic := float64(baseTraffic) - variation*1024*1024*1024
		return uint64(traffic)
	}
}

// generateNormalDeviceTrafficWithRatio генерирует трафик с учетом коэффициента
func (g *Generator) generateNormalDeviceTrafficWithRatio(ratio float64) uint64 {
	dice := g.rand.Float64()

	if dice < 0.15 {
		return 0
	} else if dice < 0.85 {
		// 70% - около 2 ГБ с учетом ratio
		baseTraffic := 2 * 1024 * 1024 * 1024
		variation := g.rand.Float64()*2 - 1
		traffic := (float64(baseTraffic) + variation*1024*1024*1024) * ratio
		if traffic < 0 {
			traffic = float64(g.rand.Intn(100*1024*1024) + 1024)
		}
		return uint64(traffic)
	} else {
		// 15% - около 15 ГБ с учетом ratio
		baseTraffic := 15 * 1024 * 1024 * 1024
		variation := g.rand.Float64() * 5
		traffic := (float64(baseTraffic) - variation*1024*1024*1024) * ratio
		return uint64(traffic)
	}
}

// generateIoTTraffic генерирует трафик для IoT устройства (100 KB - 2 MB)
func (g *Generator) generateIoTTraffic() uint64 {
	minTraffic := 100 * 1024      // 100 KB
	maxTraffic := 2 * 1024 * 1024 // 2 MB

	// Используем экспоненциальное распределение - большинство ближе к минимуму
	uniform := g.rand.Float64()
	weighted := math.Pow(uniform, 2.0) // степень 2 для смещения к меньшим значениям

	traffic := float64(minTraffic) + weighted*float64(maxTraffic-minTraffic)
	return uint64(traffic)
}

// GetAllDates возвращает все даты в диапазоне
func (dr *DateRange) GetAllDates() []time.Time {
	dates := make([]time.Time, 0)
	current := dr.From

	for !current.After(dr.To) {
		dates = append(dates, current)
		current = current.AddDate(0, 0, 1) // +1 день
	}

	return dates
}

// FormatDateForFilename форматирует дату для имени файла (YYYYMMDD)
func FormatDateForFilename(date time.Time) string {
	return date.Format("20060102")
}

// FormatDateISO форматирует дату в ISO формат (YYYY-MM-DD)
func FormatDateISO(date time.Time) string {
	return date.Format("2006-01-02")
}
