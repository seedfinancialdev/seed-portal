# Wiki.js Knowledge Base Setup

## Quick Start

This project includes a Wiki.js knowledge base integration accessible at `/knowledge-base` in the portal.

### 1. Start Wiki.js with Docker

```bash
# Start Wiki.js and PostgreSQL database
docker-compose -f docker-compose.wiki.yml up -d

# Check if containers are running
docker-compose -f docker-compose.wiki.yml ps
```

### 2. Initial Setup

1. **Access Wiki.js**: Open `http://localhost:3001` in your browser
2. **Complete Setup Wizard**: Follow the installation wizard
3. **Create Admin Account**: Set up your administrator credentials
4. **Configure Settings**: Customize your wiki settings

### 3. Access from Portal

Once setup is complete, the knowledge base will be accessible:
- **Portal Route**: `/knowledge-base` 
- **Direct Wiki Access**: `/wiki` (proxied to Wiki.js)
- **Dashboard Button**: "Open Wiki.js" button in Knowledge Base card

## Configuration Details

### Environment Variables

The Wiki.js setup uses these default credentials (change in production):
- **Database**: `wiki`
- **User**: `wikijs` 
- **Password**: `seedwiki2025`

### Ports

- **Wiki.js**: `localhost:3001`
- **Main App**: `localhost:5000`
- **Wiki Proxy**: `localhost:5000/wiki`

### Proxy Integration

The Express server automatically proxies `/wiki` requests to the Wiki.js instance running on port 3001, providing seamless integration with the employee portal.

## Features

### Knowledge Base Page (`/knowledge-base`)
- Wiki.js status monitoring
- Setup guide for first-time users
- Quick access to common documentation
- Search functionality
- Avatar menu with full portal navigation

### Dashboard Integration
- Knowledge Base card with direct access button
- Links to common documentation categories
- Consistent portal navigation

## Troubleshooting

### Wiki.js Not Starting
```bash
# Check container logs
docker-compose -f docker-compose.wiki.yml logs wiki

# Restart services
docker-compose -f docker-compose.wiki.yml restart
```

### Database Issues
```bash
# Reset database (WARNING: This will delete all data)
docker-compose -f docker-compose.wiki.yml down -v
docker-compose -f docker-compose.wiki.yml up -d
```

### Port Conflicts
- Ensure port 3001 is not being used by other services
- Modify `docker-compose.wiki.yml` if needed

## Data Backup

Wiki.js supports Git synchronization for content backup:
1. **Admin Panel** → **Storage** → **Git**
2. Connect to your repository
3. Enable automatic synchronization

## Production Considerations

1. **Change default passwords** in `docker-compose.wiki.yml`
2. **Enable SSL** for the Wiki.js instance
3. **Set up regular backups** via Git or database dumps
4. **Configure authentication** (LDAP, OAuth, etc.)

The knowledge base is now fully integrated with the Seed Financial Employee Portal!