# Deck Building Assistant - Infrastructure Requirements

## 1. Tech Stack Overview

*   **Frontend:** HTML/CSS + **Vue.js** (Progressive approach via CDN script tag)
*   **Backend API:** **Apache HTTP Server** + **PHP**
*   **Database:** **MongoDB**

## 2. Local Development Environment (POC / Testing)

The local environment will utilize Docker to ensure a clean, reproducible setup without cluttering the host machine.

*   **Containerization:** Docker Compose
*   **Services:**
    1.  **Web Server Container:** An image running Apache and PHP, with the MongoDB PHP extension installed. This container will map a local directory (containing the PHP and Vue/HTML files) to `/var/www/html` to allow for live code editing.
    2.  **Database Container:** An official MongoDB image. Data will be mapped to a local Docker volume so that deck and card data persists between container restarts.

## 3. Cloud Production Environment

The production environment prioritizes low cost (utilizing free tiers where possible) while maintaining a standard, reliable architecture.

### 3.1 Web Hosting (Google Cloud Platform - GCP)
*   **Service:** GCP Compute Engine
*   **Instance Type:** `e2-micro` (Eligible for GCP's "Always Free" tier in select US regions).
*   **Setup:** A standard Linux Virtual Machine. Apache and PHP will be installed on the machine. The frontend Vue files and backend PHP scripts will be served from here. 
*   *Note: If you decide to Dockerize the production environment later, GCP Cloud Run is an excellent, cheap serverless alternative.*

### 3.2 Database Hosting (MongoDB Atlas)
*   **Service:** MongoDB Atlas (Cloud Database as a Service)
*   **Tier:** `M0 Sandbox` (Free forever tier).
*   **Setup:** Instead of hosting MongoDB directly on the GCP VM (which only has 1GB of RAM on the free tier), the database will be fully managed by MongoDB Atlas. The GCP PHP server will connect to Atlas via a secure connection string.

## 4. Why This Stack?
*   **Vue.js:** Provides the reactivity needed for a complex UI (like dynamic filtering and active deck state management) without the file bloat and build-step complexity of a full React environment.
*   **Apache/PHP:** A proven, widely supported backend that is incredibly simple to deploy.
*   **Cost Efficiency:** By utilizing GCP's Always Free compute instance and MongoDB Atlas's free tier, the hosting costs for the application can effectively be $0/month.

