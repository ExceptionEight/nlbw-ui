package converter

import (
	"compress/gzip"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"os"
	"sort"
	"strings"
)

const (
	Magic          = 0x6e6c626d
	AF_INET        = 2
	AF_INET6       = 10
	RecordDiskSize = 72
	HeaderSize     = 40
)

type Interval struct {
	Type  uint8
	_     [7]byte
	Base  uint64
	Value int32
	_     [4]byte
}

type Database struct {
	Magic     uint32
	Entries   uint32
	Timestamp uint32
	_         [4]byte
	Interval  Interval
}

type Record struct {
	Family   uint8
	Proto    uint8
	DstPort  uint16
	_        [4]byte
	SrcMAC   [8]byte
	SrcAddr  [16]byte
	Count    uint64
	OutPkts  uint64
	OutBytes uint64
	InPkts   uint64
	InBytes  uint64
}

type TrafficData struct {
	Columns []string        `json:"columns"`
	Data    [][]interface{} `json:"data"`
}

type Converter struct{}

func New() *Converter {
	return &Converter{}
}

func (c *Converter) ConvertFile(filename string) (*TrafficData, error) {
	db, records, err := c.readDatabase(filename)
	if err != nil {
		return nil, err
	}

	_ = db

	c.sortRecords(records)
	return c.recordsToJSON(records), nil
}

func (c *Converter) readDatabase(filename string) (*Database, []Record, error) {
	file, err := os.Open(filename)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()

	var reader io.Reader = file

	if strings.HasSuffix(filename, ".gz") {
		gzReader, err := gzip.NewReader(file)
		if err != nil {
			return nil, nil, fmt.Errorf("failed to create gzip reader: %w", err)
		}
		defer gzReader.Close()
		reader = gzReader
	}

	db := &Database{}
	if err := binary.Read(reader, binary.BigEndian, db); err != nil {
		return nil, nil, fmt.Errorf("failed to read database header: %w", err)
	}

	if db.Magic != Magic {
		return nil, nil, fmt.Errorf("invalid magic number: 0x%x (expected 0x%x)", db.Magic, Magic)
	}

	records := make([]Record, db.Entries)
	for i := uint32(0); i < db.Entries; i++ {
		if err := binary.Read(reader, binary.BigEndian, &records[i]); err != nil {
			return nil, nil, fmt.Errorf("failed to read record %d: %w", i, err)
		}
	}

	return db, records, nil
}

func (c *Converter) sortRecords(records []Record) {
	sort.Slice(records, func(i, j int) bool {
		if records[i].InBytes != records[j].InBytes {
			return records[i].InBytes > records[j].InBytes
		}
		if records[i].InPkts != records[j].InPkts {
			return records[i].InPkts > records[j].InPkts
		}
		if records[i].Family != records[j].Family {
			return records[i].Family < records[j].Family
		}
		if records[i].Proto != records[j].Proto {
			return records[i].Proto < records[j].Proto
		}
		if records[i].DstPort != records[j].DstPort {
			return records[i].DstPort < records[j].DstPort
		}
		for k := 0; k < 8; k++ {
			if records[i].SrcMAC[k] != records[j].SrcMAC[k] {
				return records[i].SrcMAC[k] < records[j].SrcMAC[k]
			}
		}
		for k := 0; k < 16; k++ {
			if records[i].SrcAddr[k] != records[j].SrcAddr[k] {
				return records[i].SrcAddr[k] < records[j].SrcAddr[k]
			}
		}
		if records[i].Count != records[j].Count {
			return records[i].Count < records[j].Count
		}
		if records[i].OutPkts != records[j].OutPkts {
			return records[i].OutPkts < records[j].OutPkts
		}
		if records[i].OutBytes != records[j].OutBytes {
			return records[i].OutBytes < records[j].OutBytes
		}
		return false
	})
}

func (c *Converter) recordsToJSON(records []Record) *TrafficData {
	output := &TrafficData{
		Columns: []string{"family", "proto", "port", "mac", "ip", "conns", "rx_bytes", "rx_pkts", "tx_bytes", "tx_pkts", "layer7"},
		Data:    make([][]interface{}, 0, len(records)),
	}

	for _, rec := range records {
		row := make([]interface{}, 11)
		if rec.Family == AF_INET {
			row[0] = 4
		} else {
			row[0] = 6
		}
		row[1] = formatProto(rec.Proto)
		row[2] = rec.DstPort
		row[3] = formatMAC(rec.SrcMAC)
		row[4] = formatIP(rec.Family, rec.SrcAddr)
		row[5] = rec.Count
		row[6] = rec.InBytes
		row[7] = rec.InPkts
		row[8] = rec.OutBytes
		row[9] = rec.OutPkts
		row[10] = nil

		output.Data = append(output.Data, row)
	}

	return output
}

func formatProto(proto uint8) string {
	protoNames := map[uint8]string{
		0:   "HOPOPT",
		1:   "ICMP",
		2:   "IGMP",
		4:   "IP-IN-IP",
		6:   "TCP",
		17:  "UDP",
		41:  "IPV6-IN-IP",
		47:  "GRE",
		50:  "ESP",
		51:  "AH",
		58:  "IPV6-ICMP",
		94:  "IPIP",
		115: "L2TPV3",
	}

	if name, ok := protoNames[proto]; ok {
		return name
	}
	return fmt.Sprintf("%d", proto)
}

func formatMAC(mac [8]byte) string {
	return fmt.Sprintf("%02x:%02x:%02x:%02x:%02x:%02x",
		mac[0], mac[1], mac[2], mac[3], mac[4], mac[5])
}

func formatIP(family uint8, addr [16]byte) string {
	if family == AF_INET {
		ip := net.IPv4(addr[3], addr[2], addr[1], addr[0])
		return ip.String()
	}
	ip := net.IP(addr[:])
	return ip.String()
}

func (td *TrafficData) ToJSON() ([]byte, error) {
	return json.Marshal(td)
}
