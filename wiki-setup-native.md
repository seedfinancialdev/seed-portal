# Wiki.js Native Setup (Without Docker)

Since Docker isn't available in the Replit environment, here's how to set up Wiki.js natively:

## Prerequisites
- Node.js (already available)
- PostgreSQL database (already configured in your Replit)

## Setup Steps

### 1. Download and Setup Wiki.js

```bash
# Create wiki directory
mkdir wiki-js
cd wiki-js

# Download Wiki.js
wget https://github.com/Requarks/wiki/releases/latest/download/wiki-js.tar.gz

# Extract
tar xzf wiki-js.tar.gz

# Install dependencies
npm install
```

### 2. Create Configuration

Create `config.yml` with your database settings:

```yaml
#######################################################################
# Wiki.js - CONFIGURATION                                            #
#######################################################################

# Database Configuration
db:
  type: postgres
  host: localhost
  port: 5432
  user: your_db_user
  pass: your_db_password
  db: wiki
  ssl: false

# Server Configuration
port: 3001
host: 0.0.0.0

# Data Path
dataPath: ./data

# Log Level
logLevel: info
```

### 3. Create Database

```sql
CREATE DATABASE wiki;
```

### 4. Start Wiki.js

```bash
node server
```

### 5. Access Setup

Visit `http://localhost:3001` to complete the installation wizard.