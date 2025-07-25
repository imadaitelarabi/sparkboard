# Production CORS and Cloudflare Configuration Guide

## Issues Identified

The production image loading failures are caused by:

1. **Signed URL Expiration**: URLs expire after 1 hour ✅ **FIXED** (now 24 hours)
2. **Cloudflare Bot Management**: `__cf_bm` cookie rejection indicates Cloudflare's bot management is interfering
3. **OpaqueResponseBlocking**: Browser security policy blocking cross-origin image requests

## Solutions Implemented

### ✅ Code-Level Fixes (Already Implemented)
1. **Extended URL Expiry**: Changed from 1 hour to 24 hours
2. **Smart URL Refresh**: Automatic detection and refresh of expired URLs
3. **Background Refresh Service**: Proactive URL renewal before expiration
4. **Enhanced Error Handling**: Multi-level retry with CORS fallbacks

### 🔧 Production Configuration Needed

#### 1. Supabase Storage CORS Configuration

Add CORS headers to your Supabase project:

```sql
-- Add to your Supabase project via Dashboard > Storage > Settings
-- Or via API/CLI configuration

-- Allow your domain in CORS settings
-- Origin: https://your-domain.com
-- Methods: GET, HEAD
-- Headers: authorization, x-client-info, apikey, content-type
```

#### 2. Cloudflare Configuration (if using Cloudflare)

##### Option A: Disable Bot Management for Storage URLs
```yaml
# Cloudflare Page Rules or Workers
- Pattern: *supabase.co/storage/v1/object/sign/*
  Settings:
    - Security Level: Essentially Off
    - Bot Fight Mode: Off
```

##### Option B: Whitelist Your Application
```javascript
// Cloudflare Worker or Edge Rules
if (request.url.includes('supabase.co/storage/v1/object/sign/')) {
  // Skip bot management for signed URLs
  return fetch(request);
}
```

#### 3. Alternative: Use Public Bucket (Trade-off)

If CORS issues persist, consider switching to a public bucket:

```sql
-- Update bucket to public (removes signed URL requirement)
UPDATE storage.buckets 
SET public = true 
WHERE id = 'images';
```

**Pros**: No CORS issues, no URL expiration
**Cons**: Reduced security, direct URL access

### 🔍 Debugging Steps

1. **Check Browser Console**: Look for specific CORS error messages
2. **Test Direct URL Access**: Try accessing signed URLs directly in browser
3. **Monitor Network Tab**: Check if requests are being blocked before reaching Supabase
4. **Verify Referrer**: Ensure your domain is allowed in Supabase settings

### 🚀 Recommended Implementation Order

1. **Immediate**: Deploy the code fixes (already implemented)
2. **Short-term**: Configure Supabase CORS settings
3. **Medium-term**: Adjust Cloudflare rules if needed
4. **Long-term**: Monitor and optimize URL refresh intervals

### 📊 Monitoring

The URL refresh service provides status information:

```javascript
import { urlRefreshService } from '../lib/url-refresh-service';

// Check service status
console.log(urlRefreshService.getStatus());
```

### 🔒 Security Considerations

- Signed URLs remain the most secure option
- Public buckets require application-level access control
- Monitor for unauthorized image access
- Regular cleanup of expired URL mappings

## Testing

1. **Local Testing**: Verify fixes work in development
2. **Staging**: Test with production-like Cloudflare setup
3. **Production**: Monitor error rates and user reports

## Contact Points

- **Supabase Support**: For storage and CORS configuration
- **Cloudflare Support**: For bot management and security rules
- **Browser DevTools**: For debugging specific CORS errors