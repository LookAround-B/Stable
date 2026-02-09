# Configuration Guide

## Environment Variables

### Backend Configuration (.env)

#### Server Configuration
```
PORT=5000
NODE_ENV=development
```

#### Database Configuration
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=stable_management
DB_PORT=3306
```

#### JWT Configuration
Generate a secure random string for JWT_SECRET:
```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Then set:
```
JWT_SECRET=your_generated_secret_here
JWT_EXPIRE=7d
```

#### AWS Configuration
Get credentials from AWS Console:
```
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name
```

#### Application URLs
```
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000
```

#### Email Configuration (Optional)
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
```

### Frontend Configuration (.env)

```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_ENVIRONMENT=development
```

## System Settings (Database)

The following settings can be configured in the system_settings table:

### SLA Configuration
```
sla_zamindar_hours: {"hours": 2}
sla_instructor_hours: {"hours": 4}
```

### Media Configuration
```
image_retention_months: {"months": 12}
max_image_size_mb: {"mb": 10}
image_compression_quality: {"quality": 80}
watermark_format: {"format": "timestamp_username"}
```

### Working Hours
```
working_hours_start: {"time": "06:00"}
working_hours_end: {"time": "18:00"}
break_times: {"breaks": [{"start": "12:00", "end": "13:00"}]}
```

### Task Configuration
```
default_task_expiry_minutes: {"minutes": 30}
require_photo_proof_default: {"require": true}
```

### Report Configuration
```
report_categories: {"categories": ["Missed Task", "Poor Quality", "Late Completion", "Safety Violation"]}
```

## Database Configuration

### Connection Pooling
The application uses Sequelize connection pooling. Configure in backend/src/config/database.js:

```javascript
pool: {
  max: 5,        // Maximum connections
  min: 2,        // Minimum connections
  acquire: 30000,
  idle: 10000
}
```

### Query Logging
For development, enable query logging:
```javascript
sequelize = new Sequelize(..., {
  logging: console.log  // Log SQL queries
})
```

## AWS S3 Configuration

### Bucket Policy
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::YOUR_ACCOUNT_ID:user/YOUR_USER"
      },
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::your-bucket-name",
        "arn:aws:s3:::your-bucket-name/*"
      ]
    }
  ]
}
```

### CORS Configuration
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["http://localhost:3000"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

## Logging Configuration

### Backend Logging
Configure in backend/src/config/logger.js:

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

### Frontend Error Tracking
Configure Sentry (optional):
```
REACT_APP_SENTRY_DSN=your_sentry_dsn_here
```

## Development Tools Configuration

### ESLint Configuration (.eslintrc.json)
```json
{
  "env": {
    "node": true,
    "es6": true
  },
  "extends": "eslint:recommended",
  "rules": {
    "semi": ["error", "always"],
    "quotes": ["error", "single"]
  }
}
```

### Prettier Configuration (.prettierrc)
```json
{
  "singleQuote": true,
  "trailingComma": "es5",
  "tabWidth": 2,
  "semi": true
}
```

## Performance Configuration

### Database Query Optimization
```sql
-- Create indexes for frequently queried fields
CREATE INDEX idx_task_status_scheduled ON tasks(status, scheduledTime);
CREATE INDEX idx_approval_task_status ON approvals(taskId, status);
CREATE INDEX idx_horse_status ON horses(status);
CREATE INDEX idx_employee_designation ON employees(designation);
```

### Caching Strategy
Configure Redis for session storage (future enhancement):
```
REDIS_URL=redis://localhost:6379
REDIS_SESSION_EXPIRY=86400
```

## Production Configuration

### Environment Variables for Production
```
NODE_ENV=production
PORT=443
DB_HOST=production-db-host
DB_USER=production_user
DB_PASSWORD=strong_password_here
JWT_SECRET=very_long_secure_secret_here
AWS_REGION=us-east-1
FRONTEND_URL=https://your-domain.com
BACKEND_URL=https://api.your-domain.com
```

### SSL/TLS Configuration
Use AWS Certificate Manager or Let's Encrypt for SSL certificates.

### Database Backups
```bash
# Automated daily backup
mysqldump --single-transaction -h production-host -u backup_user -p database_name > backup_$(date +%Y%m%d).sql
```

### Monitoring & Alerts
Configure CloudWatch alarms for:
- Database CPU usage > 80%
- Memory usage > 85%
- Error rate > 1%
- Response time > 2 seconds

## Configuration Checklist

- [ ] Create .env file in backend directory
- [ ] Create .env file in frontend directory
- [ ] Generate secure JWT_SECRET
- [ ] Configure AWS S3 credentials
- [ ] Set database connection details
- [ ] Verify API URLs match deployment
- [ ] Enable HTTPS in production
- [ ] Configure CORS for production domain
- [ ] Set up automated backups
- [ ] Configure monitoring and alerts
- [ ] Enable SSL/TLS certificates
- [ ] Set up logging aggregation
- [ ] Configure email service (optional)
- [ ] Set up CDN for static assets (optional)
