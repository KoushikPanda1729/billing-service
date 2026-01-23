# OSRM (Open Source Routing Machine) Setup Guide

This guide explains how to set up a self-hosted OSRM server for calculating road distances in the billing service.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Setup](#detailed-setup)
- [API Usage](#api-usage)
- [Integration with Billing Service](#integration-with-billing-service)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)

---

## Overview

### What is OSRM?

- **Open Source Routing Machine** - A high-performance routing engine
- Uses **OpenStreetMap** data (free, community-driven map data)
- Calculates **actual road distance** (not straight-line)
- Provides **estimated travel time**
- **Completely free** - no API costs

### Why Self-Host?

| Public Demo        | Self-Hosted             |
| ------------------ | ----------------------- |
| Rate limited       | Unlimited requests      |
| Slow response      | Fast (~10-50ms)         |
| Not for production | Production ready        |
| Free               | Free (only server cost) |

---

## Prerequisites

- **Docker** installed ([Install Docker](https://docs.docker.com/get-docker/))
- **Minimum 4GB RAM** (for India map data)
- **~3GB disk space** (for processed map data)
- **Linux/macOS/Windows** with Docker support

### Verify Docker Installation

```bash
docker --version
# Docker version 24.x.x or higher
```

---

## Quick Start

### For Development (Using Docker Compose)

Create `docker-compose.osrm.yml` in your project root:

```yaml
version: "3.8"

services:
    osrm:
        image: osrm/osrm-backend
        container_name: osrm-server
        ports:
            - "5000:5000"
        volumes:
            - ./osrm-data:/data
        command: osrm-routed --algorithm mld /data/india-latest.osrm
        restart: unless-stopped
```

---

## Detailed Setup

### Step 1: Create Directory for Map Data

```bash
mkdir -p osrm-data
cd osrm-data
```

### Step 2: Download OpenStreetMap Data

Download map data from [Geofabrik](https://download.geofabrik.de/):

```bash
# For entire India (~1.2GB download, recommended for production)
wget https://download.geofabrik.de/asia/india-latest.osm.pbf

# OR for specific regions (smaller, faster processing):

# South India
wget https://download.geofabrik.de/asia/india/southern-zone-latest.osm.pbf

# North India
wget https://download.geofabrik.de/asia/india/northern-zone-latest.osm.pbf

# Karnataka only
wget https://download.geofabrik.de/asia/india/karnataka-latest.osm.pbf

# Maharashtra only
wget https://download.geofabrik.de/asia/india/maharashtra-latest.osm.pbf
```

### Step 3: Process Map Data (One-time setup)

This step extracts and processes the map data for routing. Run these commands in order:

```bash
# Navigate to osrm-data directory
cd osrm-data

# Step 3a: Extract road network (~5-15 mins for India)
docker run -t -v "${PWD}:/data" osrm/osrm-backend osrm-extract -p /opt/car.lua /data/india-latest.osm.pbf

# Step 3b: Partition the graph (~5-10 mins)
docker run -t -v "${PWD}:/data" osrm/osrm-backend osrm-partition /data/india-latest.osrm

# Step 3c: Customize the graph (~2-5 mins)
docker run -t -v "${PWD}:/data" osrm/osrm-backend osrm-customize /data/india-latest.osrm
```

**Note:** Processing time depends on region size and machine specs.

| Region       | Download Size | Processing Time | RAM Required |
| ------------ | ------------- | --------------- | ------------ |
| Karnataka    | ~100MB        | ~2 mins         | 2GB          |
| South India  | ~300MB        | ~5 mins         | 3GB          |
| Entire India | ~1.2GB        | ~15-20 mins     | 4GB          |

### Step 4: Start OSRM Server

```bash
# Start the routing server
docker run -t -d \
  --name osrm-server \
  -p 5000:5000 \
  -v "${PWD}:/data" \
  osrm/osrm-backend \
  osrm-routed --algorithm mld /data/india-latest.osrm

# Verify it's running
docker ps | grep osrm

# Check logs
docker logs osrm-server
```

### Step 5: Test the Server

```bash
# Test with sample coordinates (Bangalore to Electronic City)
curl "http://localhost:5000/route/v1/driving/77.5946,12.9716;77.6600,12.8458?overview=false"
```

Expected Response:

```json
{
  "code": "Ok",
  "routes": [
    {
      "distance": 18500.5,
      "duration": 2100.3,
      "legs": [...]
    }
  ],
  "waypoints": [...]
}
```

- `distance`: Road distance in **meters**
- `duration`: Travel time in **seconds**

---

## API Usage

### Route API (Distance Calculation)

**Endpoint:** `GET /route/v1/driving/{lng1},{lat1};{lng2},{lat2}`

**Parameters:**
| Parameter | Description |
|-----------|-------------|
| `{lng1},{lat1}` | Origin coordinates (longitude,latitude) |
| `{lng2},{lat2}` | Destination coordinates (longitude,latitude) |
| `overview` | `false` (no polyline), `full` (full polyline) |
| `steps` | `true` (turn-by-turn directions), `false` (summary only) |

**Example Request:**

```bash
# Restaurant: 12.9716, 77.5946 (Bangalore)
# Customer: 12.8458, 77.6600 (Electronic City)

curl "http://localhost:5000/route/v1/driving/77.5946,12.9716;77.6600,12.8458?overview=false"
```

**Example Response:**

```json
{
    "code": "Ok",
    "routes": [
        {
            "distance": 18500.5,
            "duration": 2100.3,
            "weight": 2100.3,
            "weight_name": "routability",
            "legs": [
                {
                    "distance": 18500.5,
                    "duration": 2100.3,
                    "steps": [],
                    "summary": "",
                    "weight": 2100.3
                }
            ]
        }
    ],
    "waypoints": [
        {
            "hint": "...",
            "distance": 10.5,
            "name": "MG Road",
            "location": [77.5946, 12.9716]
        },
        {
            "hint": "...",
            "distance": 15.2,
            "name": "Hosur Road",
            "location": [77.66, 12.8458]
        }
    ]
}
```

### Nearest API (Find Nearest Road)

```bash
curl "http://localhost:5000/nearest/v1/driving/77.5946,12.9716?number=1"
```

### Table API (Distance Matrix - Multiple Origins/Destinations)

```bash
# Calculate distances between multiple points
curl "http://localhost:5000/table/v1/driving/77.5946,12.9716;77.6600,12.8458;77.7000,12.9000?annotations=distance,duration"
```

---

## Integration with Billing Service

### Step 1: Add Environment Variable

Add to your `.env` or `config/development.yaml`:

```yaml
# config/development.yaml
osrm:
    url: "http://localhost:5000"
```

### Step 2: Create Distance Service

Create `src/common/services/distance-service.ts`:

```typescript
import Config from "../config";

export interface DistanceResult {
    distanceKm: number;
    durationMins: number;
}

export class DistanceService {
    private baseUrl: string;

    constructor() {
        this.baseUrl = Config.OSRM_URL || "http://localhost:5000";
    }

    async calculateDistance(
        originLat: number,
        originLng: number,
        destLat: number,
        destLng: number
    ): Promise<DistanceResult> {
        const url = `${this.baseUrl}/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=false`;

        try {
            const response = await fetch(url);
            const data = await response.json();

            if (data.code !== "Ok" || !data.routes?.length) {
                throw new Error("Unable to calculate route");
            }

            const route = data.routes[0];

            return {
                distanceKm: Math.round((route.distance / 1000) * 100) / 100, // Convert to km, 2 decimals
                durationMins: Math.ceil(route.duration / 60), // Convert to minutes
            };
        } catch (error) {
            console.error("OSRM Error:", error);
            throw new Error("Distance calculation failed");
        }
    }

    async isWithinDeliveryRange(
        originLat: number,
        originLng: number,
        destLat: number,
        destLng: number,
        maxDistanceKm: number
    ): Promise<{ withinRange: boolean; distanceKm: number }> {
        const result = await this.calculateDistance(
            originLat,
            originLng,
            destLat,
            destLng
        );

        return {
            withinRange: result.distanceKm <= maxDistanceKm,
            distanceKm: result.distanceKm,
        };
    }
}
```

### Step 3: Usage Example

```typescript
import { DistanceService } from "./common/services/distance-service";

const distanceService = new DistanceService();

// Calculate delivery distance
const result = await distanceService.calculateDistance(
    12.9716,
    77.5946, // Restaurant location
    12.8458,
    77.66 // Customer location
);

console.log(`Distance: ${result.distanceKm} km`);
console.log(`Duration: ${result.durationMins} mins`);

// Check if within delivery range
const rangeCheck = await distanceService.isWithinDeliveryRange(
    12.9716,
    77.5946,
    12.8458,
    77.66,
    15 // Max 15km delivery range
);

if (!rangeCheck.withinRange) {
    throw new Error(
        `Delivery not available. Distance: ${rangeCheck.distanceKm}km exceeds 15km limit`
    );
}
```

---

## Production Deployment

### Option 1: Docker Compose (Recommended)

Add to your main `docker-compose.yml`:

```yaml
services:
    # ... your other services ...

    osrm:
        image: osrm/osrm-backend
        container_name: osrm-server
        ports:
            - "5000:5000"
        volumes:
            - ./osrm-data:/data
        command: osrm-routed --algorithm mld /data/india-latest.osrm --max-table-size 10000
        restart: unless-stopped
        deploy:
            resources:
                limits:
                    memory: 4G
                reservations:
                    memory: 2G
```

### Option 2: Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
    name: osrm-server
spec:
    replicas: 2
    selector:
        matchLabels:
            app: osrm
    template:
        metadata:
            labels:
                app: osrm
        spec:
            containers:
                - name: osrm
                  image: osrm/osrm-backend
                  args:
                      - osrm-routed
                      - --algorithm
                      - mld
                      - /data/india-latest.osrm
                  ports:
                      - containerPort: 5000
                  resources:
                      requests:
                          memory: "2Gi"
                          cpu: "500m"
                      limits:
                          memory: "4Gi"
                          cpu: "2000m"
                  volumeMounts:
                      - name: osrm-data
                        mountPath: /data
            volumes:
                - name: osrm-data
                  persistentVolumeClaim:
                      claimName: osrm-pvc
---
apiVersion: v1
kind: Service
metadata:
    name: osrm-service
spec:
    selector:
        app: osrm
    ports:
        - port: 5000
          targetPort: 5000
    type: ClusterIP
```

### Performance Tuning

```bash
# For high traffic, use multiple threads
docker run -t -d \
  --name osrm-server \
  -p 5000:5000 \
  -v "${PWD}:/data" \
  osrm/osrm-backend \
  osrm-routed \
    --algorithm mld \
    --max-table-size 10000 \
    --max-matching-size 1000 \
    /data/india-latest.osrm
```

---

## Updating Map Data

OpenStreetMap data is updated frequently. To update:

```bash
# 1. Stop the server
docker stop osrm-server

# 2. Download latest map data
cd osrm-data
wget -O india-latest.osm.pbf https://download.geofabrik.de/asia/india-latest.osm.pbf

# 3. Re-process (same as initial setup)
docker run -t -v "${PWD}:/data" osrm/osrm-backend osrm-extract -p /opt/car.lua /data/india-latest.osm.pbf
docker run -t -v "${PWD}:/data" osrm/osrm-backend osrm-partition /data/india-latest.osrm
docker run -t -v "${PWD}:/data" osrm/osrm-backend osrm-customize /data/india-latest.osrm

# 4. Restart server
docker start osrm-server
```

**Recommendation:** Update map data monthly or quarterly.

---

## Troubleshooting

### Error: "No route found"

- Check if coordinates are within the map data region
- Verify coordinates format: `longitude,latitude` (not lat,lng!)
- Ensure the location is near a road

### Error: "Connection refused"

```bash
# Check if container is running
docker ps | grep osrm

# Check logs
docker logs osrm-server

# Restart if needed
docker restart osrm-server
```

### Error: "Out of memory"

- Use a smaller region map (e.g., state instead of entire India)
- Increase Docker memory limit
- Use a machine with more RAM

### Slow Processing

- Use SSD for faster I/O
- Increase CPU cores available to Docker
- Process during off-peak hours

### Testing Coordinates

```bash
# Bangalore coordinates for testing
# MG Road: 12.9716, 77.5946
# Koramangala: 12.9352, 77.6245
# Electronic City: 12.8458, 77.6600
# Whitefield: 12.9698, 77.7500

# Test command
curl "http://localhost:5000/route/v1/driving/77.5946,12.9716;77.6245,12.9352?overview=false"
```

---

## Useful Links

- [OSRM Official Documentation](http://project-osrm.org/docs/v5.24.0/api/)
- [OpenStreetMap](https://www.openstreetmap.org/)
- [Geofabrik Downloads](https://download.geofabrik.de/)
- [OSRM Docker Hub](https://hub.docker.com/r/osrm/osrm-backend)
- [OSRM GitHub](https://github.com/Project-OSRM/osrm-backend)

---

## Summary

| Step         | Command                                                                                                                 |
| ------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Download map | `wget https://download.geofabrik.de/asia/india-latest.osm.pbf`                                                          |
| Extract      | `docker run -t -v "${PWD}:/data" osrm/osrm-backend osrm-extract -p /opt/car.lua /data/india-latest.osm.pbf`             |
| Partition    | `docker run -t -v "${PWD}:/data" osrm/osrm-backend osrm-partition /data/india-latest.osrm`                              |
| Customize    | `docker run -t -v "${PWD}:/data" osrm/osrm-backend osrm-customize /data/india-latest.osrm`                              |
| Run server   | `docker run -t -d -p 5000:5000 -v "${PWD}:/data" osrm/osrm-backend osrm-routed --algorithm mld /data/india-latest.osrm` |
| Test         | `curl "http://localhost:5000/route/v1/driving/77.5946,12.9716;77.6245,12.9352"`                                         |
