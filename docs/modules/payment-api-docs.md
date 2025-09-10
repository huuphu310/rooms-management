# Payment Receiving System API Documentation

## Overview

This payment receiving system enables merchants to accept bank transfers through QR codes and receive real-time payment notifications via webhooks. The system integrates with SeaPay for automated payment verification.

## Table of Contents

1. [Authentication](#authentication)
2. [Webhook Configuration](#webhook-configuration)
3. [Bank Account Management](#bank-account-management)
4. [QR Code Generation](#qr-code-generation)
5. [Payment Verification](#payment-verification)
6. [Error Handling](#error-handling)

---

## Authentication

### API Key Management

All API requests must be authenticated using an API key passed in the request header.

**Header Format:**
```
X-API-Key: your_api_key_here
```

### Generate New API Key


**Request:**
```json
{
  "regenerate": true,
  "old_api_key": "current_api_key",
  "expires_at":  "2025-01-15T10:30:00Z" #default unlimit
}
```

**Response:**
```json
{
  "success": true,
  "api_key": "new_generated_api_key",
  "created_at": "2024-01-15T10:30:00Z",
  "expires_at": "2025-01-15T10:30:00Z" #default unlimit
}
```

---

## Webhook Configuration

### Register Webhook Endpoint

Configure a webhook URL to receive real-time payment notifications.


**Request:**
```json
{
  "webhook_url": "https://your-domain.com/payment/callback",
  "api_key": "your_api_key",
  "retry_attempts": 3,
  "timeout_seconds": 30
}
```

**Response:**
```json
{
  "success": true,
  "webhook_id": "wh_123456",
  "status": "active",
  "created_at": "2024-01-15T10:30:00Z"
}
```

### Webhook Payload Structure

When a payment is received, the system will send a POST request to your webhook URL:

**Webhook Request:**
```json
{
  "id": "txn_abc123",
  "transferAmount": 500000,
  "accumulated":19077000, 
  "accountNumber": "1234567890",
  "gateway": "VCB",
  "content": "HD123456 789012 thanh toan don hang",
  "transactionDate": "2023-03-25 14:02:37",
  "transferType":"in",
  "code":null,
  "subAccount":null,
  "referenceCode":"MBVCB.3278907687",
  "description":""
}
```

**Important:** The `content` field contains the full transfer message. You must parse this field to extract the invoice code and random verification number.


---

## Bank Account Management 

### Create Bank Account


**Request:**
```json
{
  "bank_code": "VCB",
  "bank_name": "Vietcombank",
  "account_number": "1234567890",
  "account_name": "CONG TY ABC",
  "is_seapay_integrated": true,
  "is_default": false
}
```

**Response:**
```json
{
  "success": true,
  "account_id": "acc_123456",
  "bank_code": "VCB",
  "bank_name": "Vietcombank",
  "account_number": "1234567890",
  "account_name": "CONG TY ABC",
  "is_seapay_integrated": true,
  "is_default": false,
  "created_at": "2024-01-15T10:30:00Z"
}
```

### List Bank Accounts 

**Endpoint:** `GET /api/v1/bank-accounts`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `is_seapay_integrated` (optional): Filter by SeaPay integration status

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "account_id": "acc_123456",
      "bank_code": "VCB",
      "bank_name": "Vietcombank",
      "account_number": "1234567890",
      "account_name": "CONG TY ABC",
      "is_seapay_integrated": true,
      "is_default": true,
      "status": "active"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5
  }
}
```

### Update Bank Account

**Endpoint:** `PUT /api/v1/bank-accounts/{account_id}`

**Request:**
```json
{
  "account_name": "CONG TY ABC UPDATED",
  "is_seapay_integrated": true,
  "is_default": true,
  "status": "active"
}
```

### Delete Bank Account

**Endpoint:** `DELETE /api/v1/bank-accounts/{account_id}`

**Response:**
```json
{
  "success": true,
  "message": "Bank account deleted successfully"
}
```

### Supported Banks
Retrieve the list of supported banks from the provided JSON file in docs/modules/banks.json. Key fields:
- `code`: Bank code (use for API calls)
- `bin`: Bank identification number
- `short_name`: Display name
- `supported`: Whether the bank is currently supported

---

## QR Code Generation

### Generate Payment QR Code

**Endpoint:** `POST /api/v1/qr-codes/generate`

**Request:**
```json
{
  "account_id": "acc_123456",
  "amount": 500000,
  "invoice_code": "HD123456",
  "expiry_hours": 24,
  "description": "Payment for order #123456"
}
```

**Response:**
```json
{
  "success": true,
  "qr_code_id": "qr_789012",
  "qr_image_url": "https://qr.sepay.vn/img?acc=1234567890&bank=VCB&amount=500000&des=HD123456%20789012",
  "payment_content": "HD123456 789012",
  "random_code": "789012",
  "amount": 500000,
  "bank_account": "1234567890",
  "bank_code": "VCB",
  "expires_at": "2024-01-16T10:30:00Z",
  "status": "pending"
}
```

### QR Code URL Format

The QR code image is generated using the following URL pattern:

```
https://qr.sepay.vn/img?acc={ACCOUNT_NUMBER}&bank={BANK_CODE}&amount={AMOUNT}&des={CONTENT}
```

**Parameters:**
- `acc`: Bank account number
- `bank`: Bank code (from supported banks list)
- `amount`: Payment amount in VND
- `des`: Payment content (invoice code + random number)

**Example:**
```
https://qr.sepay.vn/img?acc=1234567890&bank=VCB&amount=500000&des=HD123456%20789012
```

### QR Code Validation Rules

1. **Expiry Time**: Default 24 hours (configurable via `QR_CODE_EXPIRY_HOURS` environment variable)
2. **Random Code**: 6-digit random number appended to invoice code to prevent duplicate payments
3. **Content Format**: `{INVOICE_CODE} {RANDOM_CODE}`

### Check QR Code Status

**Endpoint:** `GET /api/v1/qr-codes/{qr_code_id}/status`

**Response:**
```json
{
  "success": true,
  "qr_code_id": "qr_789012",
  "status": "paid",
  "payment_confirmed_at": "2024-01-15T15:30:00Z",
  "transaction_id": "txn_abc123",
  "expires_at": "2024-01-16T10:30:00Z"
}
```

**Status Values:**
- `pending`: Waiting for payment
- `paid`: Payment confirmed
- `expired`: QR code expired (after 24 hours)
- `cancelled`: Manually cancelled

---

## Payment Verification

### Verify Payment Transaction

**Endpoint:** `POST /api/v1/payments/verify`

**Request:**
```json
{
  "transaction_id": "txn_abc123",
  "qr_code_id": "qr_789012",
  "amount": 500000,
  "message": "HD123456 789012 thanh toan don hang"
}
```

**Response:**
```json
{
  "success": true,
  "verified": true,
  "transaction_id": "txn_abc123",
  "qr_code_id": "qr_789012",
  "invoice_code": "HD123456",
  "random_code": "789012",
  "amount_matched": true,
  "content_matched": true,
  "verified_at": "2024-01-15T15:30:00Z"
}
```

### Payment Verification Process

1. **Extract Invoice Code**: Parse the transfer message to find the invoice code
2. **Validate Random Code**: Verify the random code matches the QR code
3. **Check Expiry**: Ensure payment is within 24-hour window
4. **Amount Verification**: Confirm the payment amount matches
5. **Update Status**: Mark QR code as paid if all checks pass

### Message Parsing Logic

```javascript
function extractPaymentInfo(message) {
  // Remove extra spaces and normalize
  const normalized = message.trim().replace(/\s+/g, ' ');
  
  // Pattern: INVOICE_CODE RANDOM_CODE [optional text]
  const pattern = /([A-Z0-9]+)\s+(\d{6})/;
  const match = normalized.match(pattern);
  
  if (match) {
    return {
      invoice_code: match[1],
      random_code: match[2]
    };
  }
  
  return null;
}
```

---

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "INVALID_BANK_ACCOUNT",
    "message": "The specified bank account does not exist",
    "details": {
      "account_id": "acc_invalid"
    }
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Common Error Codes

| Code | Description | HTTP Status |
|------|-------------|------------|
| `UNAUTHORIZED` | Invalid or missing API key | 401 |
| `INVALID_BANK_ACCOUNT` | Bank account not found or inactive | 404 |
| `SEAPAY_NOT_INTEGRATED` | Bank account not integrated with SeaPay | 400 |
| `QR_CODE_EXPIRED` | QR code has exceeded 24-hour limit | 410 |
| `DUPLICATE_PAYMENT` | Payment already processed for this QR code | 409 |
| `INVALID_AMOUNT` | Payment amount doesn't match | 400 |
| `WEBHOOK_FAILED` | Failed to deliver webhook notification | 500 |

---

## Environment Variables

Configure the system using these environment variables:

```env
# API Configuration

# QR Code Settings
QR_CODE_EXPIRY_HOURS=24
QR_CODE_BASE_URL=https://qr.sepay.vn/img

# Webhook Settings
WEBHOOK_TIMEOUT_SECONDS=30
WEBHOOK_RETRY_ATTEMPTS=3
WEBHOOK_RETRY_DELAY_SECONDS=60

```

---

## Implementation Notes

### Security Considerations

1. **API Key Storage**: Store API keys securely using encryption
2. **HTTPS Only**: All endpoints must use HTTPS
3. **Rate Limiting**: Implement rate limiting (recommended: 100 requests/minute)
4. **Webhook Validation**: Always verify webhook signatures
5. **Input Validation**: Validate all input parameters

### Best Practices

1. **Idempotency**: Make QR code generation idempotent using invoice codes
2. **Logging**: Log all transactions and webhook deliveries
3. **Monitoring**: Set up alerts for failed webhooks and expired QR codes
4. **Backup**: Implement fallback mechanisms for webhook failures
5. **Testing**: Use sandbox environment for integration testing

### Integration Checklist

- [ ] Generate and secure API key
- [ ] Register webhook endpoint
- [ ] Add bank accounts with SeaPay integration flag
- [ ] Implement webhook signature verification
- [ ] Test QR code generation
- [ ] Implement message parsing for payment verification
- [ ] Set up error handling and logging
- [ ] Configure environment variables
- [ ] Test end-to-end payment flow
- [ ] Monitor webhook delivery success rate