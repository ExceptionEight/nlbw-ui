# NLBW UI

Web interface for visualizing [nlbwmon](https://github.com/jow-/nlbwmon) data (by Jo-Philipp Wich).

## Configuring nlbwmon

For proper operation, nlbwmon must be installed and configured correctly. To check and automatically fix the configuration:

```sh
wget -qO- https://raw.githubusercontent.com/ExceptionEight/nlbw-ui/refs/heads/main/scripts/check-nlbwmon.sh | ash
```

## Installation on OpenWRT

```sh
wget -qO- https://raw.githubusercontent.com/ExceptionEight/nlbw-ui/refs/heads/main/scripts/install.sh | ash
```

Uninstall:

```sh
wget -qO- https://raw.githubusercontent.com/ExceptionEight/nlbw-ui/refs/heads/main/scripts/install.sh | ash -s -- --uninstall
```

## Screenshots

### Dashboard

![Dashboard](.github/screenshots/dashboard.png)

### Activity

![Activity](.github/screenshots/activity.png)

### Charts

![Charts](.github/screenshots/charts.png)

### Compare

![Compare](.github/screenshots/compare.png)

## Memory Usage

The application caches data in memory. Usage depends on the amount of data:

| Period   | Days | RAM (RSS) |
|----------|------|-----------|
| 1 day    | 1    | 7.5 MB    |
| 30 days  | 31   | 8 MB      |
| 1 year   | 365  | 13.25 MB  |
| 5 years  | 1826 | 35 MB     |
| 20 years | 7305 | 113.75 MB |

*Estimates based on approximately 10 devices per day. Average consumption is about 15.6 KB per day of data.*
