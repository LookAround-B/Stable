# API Documentation

## Authentication Endpoints

### Login with Email
```
POST /api/auth/login
Content-Type: application/json

Body:
{
  "email": "user@example.com"
}

Response 200:
{
  "token": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "designation": "Groomer"
  }
}
```

### Create Profile
```
POST /api/auth/profile
Content-Type: multipart/form-data
Authorization: Bearer {token}

Body:
{
  "fullName": "John Doe",
  "phoneNumber": "123-456-7890",
  "profileImage": <binary>
}

Response 201:
{
  "token": "eyJhbGc...",
  "user": {...}
}
```

### Get Current User
```
GET /api/auth/me
Authorization: Bearer {token}

Response 200:
{
  "id": "uuid",
  "fullName": "John Doe",
  "email": "john@example.com",
  "designation": "Groomer",
  "colorCode": "#FF5733",
  "profileImage": "url",
  "employmentStatus": "Active"
}
```

## Horse Endpoints

### List Horses
```
GET /api/horses?status=Active&owner=John
Authorization: Bearer {token}

Response 200:
[
  {
    "id": "uuid",
    "name": "Shadow",
    "gender": "Male",
    "breed": "Thoroughbred",
    "status": "Active",
    "profileImage": "url",
    ...
  }
]
```

### Create Horse
```
POST /api/horses
Content-Type: application/json
Authorization: Bearer {token}

Body:
{
  "name": "Shadow",
  "gender": "Male",
  "dateOfBirth": "2018-05-15",
  "breed": "Thoroughbred",
  "color": "Black",
  "height": 16.2,
  "status": "Active"
}

Response 201:
{
  "id": "uuid",
  "name": "Shadow",
  ...
}
```

## Task Endpoints

### List Tasks
```
GET /api/tasks?status=Pending&horseId=uuid
Authorization: Bearer {token}

Response 200:
[
  {
    "id": "uuid",
    "name": "Feed Morning",
    "status": "Pending",
    "scheduledTime": "2024-01-15T06:30:00Z",
    "horseId": "uuid",
    "assignedEmployeeId": "uuid",
    ...
  }
]
```

### Create Task
```
POST /api/tasks
Content-Type: application/json
Authorization: Bearer {token}

Body:
{
  "name": "Feed Morning",
  "type": "Daily",
  "horseId": "uuid",
  "assignedEmployeeId": "uuid",
  "scheduledTime": "2024-01-15T06:30:00Z",
  "timeWindow": {"start": "06:30", "end": "07:00"},
  "priority": "High",
  "requiredProof": true
}

Response 201:
{
  "id": "uuid",
  "name": "Feed Morning",
  ...
}
```

### Complete Task
```
POST /api/tasks/{id}/complete
Content-Type: application/json
Authorization: Bearer {token}

Body:
{
  "comments": "Task completed successfully"
}

Response 200:
{
  "id": "uuid",
  "status": "Completed",
  ...
}
```

### Upload Proof
```
POST /api/tasks/{id}/upload-proof
Content-Type: multipart/form-data
Authorization: Bearer {token}

Body:
{
  "images": [<binary>, <binary>],
  "timestamp": "2024-01-15T06:45:00Z"
}

Response 200:
{
  "proofImages": ["url1", "url2"],
  ...
}
```

## Approval Endpoints

### Get Pending Approvals
```
GET /api/approvals?status=Pending
Authorization: Bearer {token}

Response 200:
[
  {
    "id": "uuid",
    "taskId": "uuid",
    "approverId": "uuid",
    "approverLevel": "Zamindar",
    "status": "Pending",
    "slaDueDate": "2024-01-15T08:30:00Z",
    ...
  }
]
```

### Approve Task
```
POST /api/approvals/{id}/approve
Content-Type: application/json
Authorization: Bearer {token}

Body:
{
  "notes": "Approved with minor adjustments"
}

Response 200:
{
  "id": "uuid",
  "status": "Approved",
  "approvedAt": "2024-01-15T07:45:00Z",
  ...
}
```

### Reject Task
```
POST /api/approvals/{id}/reject
Content-Type: application/json
Authorization: Bearer {token}

Body:
{
  "notes": "Task completed late, please redo"
}

Response 200:
{
  "id": "uuid",
  "status": "Rejected",
  ...
}
```

## Report Endpoints

### Create Report
```
POST /api/reports
Content-Type: multipart/form-data
Authorization: Bearer {token}

Body:
{
  "reportedEmployeeId": "uuid",
  "category": "Missed Task",
  "reason": "Employee didn't complete the feeding task",
  "evidence": [<binary>],
  "taskId": "uuid"
}

Response 201:
{
  "id": "uuid",
  "reporterId": "uuid",
  "reportedEmployeeId": "uuid",
  "status": "Open",
  ...
}
```

### Get Reports
```
GET /api/reports?status=Open&reportedEmployeeId=uuid
Authorization: Bearer {token}

Response 200:
[
  {
    "id": "uuid",
    "reporterId": "uuid",
    "reportedEmployeeId": "uuid",
    "category": "Missed Task",
    "status": "Open",
    "evidence": ["url"],
    ...
  }
]
```

## Notification Endpoints

### Get Notifications
```
GET /api/notifications?isRead=false
Authorization: Bearer {token}

Response 200:
[
  {
    "id": "uuid",
    "type": "Task Assignment",
    "title": "New Task Assigned",
    "message": "You have been assigned to groom Shadow",
    "isRead": false,
    "createdAt": "2024-01-15T06:00:00Z",
    ...
  }
]
```

### Mark as Read
```
PUT /api/notifications/{id}/read
Authorization: Bearer {token}

Response 200:
{
  "id": "uuid",
  "isRead": true,
  "readAt": "2024-01-15T06:30:00Z"
}
```

## Health Record Endpoints

### Create Health Record
```
POST /api/health-records
Content-Type: multipart/form-data
Authorization: Bearer {token}

Body:
{
  "horseId": "uuid",
  "recordType": "Vaccination",
  "description": "Annual flu vaccination",
  "date": "2024-01-15",
  "nextDueDate": "2025-01-15",
  "administrator": "Dr. Smith",
  "images": [<binary>]
}

Response 201:
{
  "id": "uuid",
  "horseId": "uuid",
  "recordType": "Vaccination",
  ...
}
```

## Employee Endpoints

### Create Employee
```
POST /api/employees
Content-Type: application/json
Authorization: Bearer {token}

Body:
{
  "fullName": "Jane Smith",
  "email": "jane@example.com",
  "phoneNumber": "987-654-3210",
  "designation": "Groomer",
  "colorCode": "#FF5733"
}

Response 201:
{
  "id": "uuid",
  "fullName": "Jane Smith",
  "email": "jane@example.com",
  "isApproved": false,
  ...
}
```

### Approve Employee
```
POST /api/employees/{id}/approve
Authorization: Bearer {token}

Response 200:
{
  "id": "uuid",
  "isApproved": true,
  ...
}
```

## Settings Endpoints

### Get Settings
```
GET /api/settings
Authorization: Bearer {token}

Response 200:
[
  {
    "id": "uuid",
    "settingKey": "sla_zamindar_hours",
    "settingValue": {"hours": 2},
    ...
  }
]
```

### Update Setting
```
PUT /api/settings/{key}
Content-Type: application/json
Authorization: Bearer {token}

Body:
{
  "settingValue": {"hours": 3}
}

Response 200:
{
  "id": "uuid",
  "settingKey": "sla_zamindar_hours",
  "settingValue": {"hours": 3},
  ...
}
```

## Error Responses

```
401 Unauthorized:
{
  "error": "Access token required"
}

403 Forbidden:
{
  "error": "Unauthorized role"
}

404 Not Found:
{
  "error": "Resource not found"
}

500 Internal Server Error:
{
  "error": "Internal Server Error"
}
```

## Response Codes

- `200 OK` - Request succeeded
- `201 Created` - Resource created
- `204 No Content` - Request succeeded with no content
- `400 Bad Request` - Invalid request
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error
