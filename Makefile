.PHONY: all frontend backend build clean run dev install help release-all

all: build

help:
	@echo "Available targets:"
	@echo "  make install     - Install frontend dependencies"
	@echo "  make frontend    - Build frontend (React + Vite)"
	@echo "  make backend     - Build backend (Go server)"
	@echo "  make build       - Build both frontend and backend"
	@echo "  make run         - Run the server"
	@echo "  make dev         - Run frontend in dev mode"
	@echo "  make clean       - Clean build artifacts"
	@echo "  make release-all - Build for all platforms (Windows, Linux, macOS)"

install:
	@echo "Installing frontend dependencies..."
	cd frontend && npm install

frontend:
	@echo "Building frontend..."
	cd frontend && npm run build
	@echo "Frontend built successfully!"

backend:
	@echo "Building backend..."
	go mod download
	go build -o nlbw-ui .
	@echo "Backend built successfully!"

build: frontend backend
	@echo "Build complete! Run with: ./nlbw-ui"

run:
	./nlbw-ui

dev:
	@echo "Starting frontend dev server..."
	@echo "Make sure backend is running on port 8080"
	cd frontend && npm run dev

clean:
	@echo "Cleaning build artifacts..."
	rm -rf frontend/dist/*
	rm -f nlbw-ui
	rm -f nlbw-ui-*
	@echo "Clean complete!"

release-all: frontend
	@echo "Building for all platforms..."
	@mkdir -p dist
	CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -ldflags="-s -w" -o dist/nlbw-ui-windows-amd64.exe .
	CGO_ENABLED=0 GOOS=windows GOARCH=arm64 go build -ldflags="-s -w" -o dist/nlbw-ui-windows-arm64.exe .
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o dist/nlbw-ui-linux-amd64 .
	CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -ldflags="-s -w" -o dist/nlbw-ui-linux-arm64 .
	CGO_ENABLED=0 GOOS=darwin GOARCH=amd64 go build -ldflags="-s -w" -o dist/nlbw-ui-darwin-amd64 .
	CGO_ENABLED=0 GOOS=darwin GOARCH=arm64 go build -ldflags="-s -w" -o dist/nlbw-ui-darwin-arm64 .
	@echo "Build complete! Binaries are in ./dist/"
