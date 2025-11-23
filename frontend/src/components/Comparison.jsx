import React, { useState } from 'react'
import { Card, DatePicker, Button, Row, Col, Statistic, Table, Space, Typography } from 'antd'
import { ArrowUpOutlined, ArrowDownOutlined, SwapOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { formatBytes } from '../utils/format'

const { RangePicker } = DatePicker
const { Title, Text } = Typography

function Comparison() {
  const [period1, setPeriod1] = useState([dayjs().subtract(60, 'days'), dayjs().subtract(31, 'days')])
  const [period2, setPeriod2] = useState([dayjs().subtract(30, 'days'), dayjs()])
  const [data1, setData1] = useState(null)
  const [data2, setData2] = useState(null)
  const [loading, setLoading] = useState(false)

  const fetchData = async (from, to) => {
    const response = await fetch(`/api/summary?from=${from}&to=${to}`)
    return await response.json()
  }

  const handleCompare = async () => {
    setLoading(true)
    try {
      const [d1, d2] = await Promise.all([
        fetchData(period1[0].format('YYYY-MM-DD'), period1[1].format('YYYY-MM-DD')),
        fetchData(period2[0].format('YYYY-MM-DD'), period2[1].format('YYYY-MM-DD')),
      ])
      setData1(d1)
      setData2(d2)
    } catch (error) {
      console.error('Failed to compare:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateChange = (val1, val2) => {
    if (val1 === 0) return val2 > 0 ? 100 : 0
    return ((val2 - val1) / val1) * 100
  }

  const renderComparison = () => {
    if (!data1 || !data2) return null

    const downloadedChange = calculateChange(data1.total_downloaded, data2.total_downloaded)
    const uploadedChange = calculateChange(data1.total_uploaded, data2.total_uploaded)

    return (
      <div>
        <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
          <Col span={12}>
            <Card>
              <Statistic
                title="Downloaded - Period 1"
                value={formatBytes(data1.total_downloaded)}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={12}>
            <Card>
              <Statistic
                title="Downloaded - Period 2"
                value={formatBytes(data2.total_downloaded)}
                valueStyle={{ color: '#52c41a' }}
                prefix={downloadedChange > 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                suffix={
                  <Text type={downloadedChange > 0 ? 'success' : 'danger'}>
                    {Math.abs(downloadedChange).toFixed(1)}%
                  </Text>
                }
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
          <Col span={12}>
            <Card>
              <Statistic
                title="Uploaded - Period 1"
                value={formatBytes(data1.total_uploaded)}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
          <Col span={12}>
            <Card>
              <Statistic
                title="Uploaded - Period 2"
                value={formatBytes(data2.total_uploaded)}
                valueStyle={{ color: '#fa8c16' }}
                prefix={uploadedChange > 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                suffix={
                  <Text type={uploadedChange > 0 ? 'warning' : 'success'}>
                    {Math.abs(uploadedChange).toFixed(1)}%
                  </Text>
                }
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={24}>
          <Col span={12}>
            <Card title="Period 1 Summary">
              <div>
                <Text>From: {data1.from}</Text>
                <br />
                <Text>To: {data1.to}</Text>
                <br />
                <Text>Days: {data1.days.length}</Text>
              </div>
            </Card>
          </Col>
          <Col span={12}>
            <Card title="Period 2 Summary">
              <div>
                <Text>From: {data2.from}</Text>
                <br />
                <Text>To: {data2.to}</Text>
                <br />
                <Text>Days: {data2.days.length}</Text>
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    )
  }

  return (
    <div>
      <Card title="Compare Two Periods" style={{ marginBottom: 24 }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Row gutter={24} align="middle">
            <Col span={10}>
              <div>
                <Text strong>Period 1:</Text>
                <br />
                <RangePicker
                  value={period1}
                  onChange={setPeriod1}
                  format="YYYY-MM-DD"
                  style={{ width: '100%', marginTop: 8 }}
                />
              </div>
            </Col>
            <Col span={4} style={{ textAlign: 'center' }}>
              <SwapOutlined style={{ fontSize: 24, color: '#8b949e' }} />
            </Col>
            <Col span={10}>
              <div>
                <Text strong>Period 2:</Text>
                <br />
                <RangePicker
                  value={period2}
                  onChange={setPeriod2}
                  format="YYYY-MM-DD"
                  style={{ width: '100%', marginTop: 8 }}
                />
              </div>
            </Col>
          </Row>

          <Button
            type="primary"
            onClick={handleCompare}
            loading={loading}
            size="large"
            block
          >
            Compare Periods
          </Button>
        </Space>
      </Card>

      {renderComparison()}
    </div>
  )
}

export default Comparison
