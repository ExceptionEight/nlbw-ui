export const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i]
}

export const formatMegabytes = (bytes) => {
  if (bytes === 0) return '0 MB'
  const mb = bytes / (1024 * 1024)
  return Math.round(mb).toLocaleString() + ' MB'
}

export const formatNumber = (num) => {
  return num.toLocaleString()
}
