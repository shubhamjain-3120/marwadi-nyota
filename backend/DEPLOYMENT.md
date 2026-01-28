# Fly.io Deployment Guide

## Quick Start

### 1. Install Fly.io CLI (if not already installed)
```bash
brew install flyctl
fly auth login
```

### 2. Create the Fly App
```bash
# From the backend directory
fly apps create wedding-invite-backend --region iad
```

### 3. Set Secrets
```bash
# Set your API keys (REQUIRED)
fly secrets set GEMINI_API_KEY="your_gemini_key_here"
fly secrets set OPENAI_API_KEY="your_openai_key_here"

# Optional: Set CORS origin after frontend is deployed
fly secrets set CORS_ORIGIN="https://yourfrontend.com"
```

### 4. Deploy
```bash
fly deploy
```

### 5. Verify Deployment
```bash
# Check status
fly status

# Check logs
fly logs

# Test health endpoint
curl https://wedding-invite-backend.fly.dev/api/health
```

## Configuration Summary

- **Region**: iad (Ashburn, Virginia)
- **Machine Size**: shared-cpu-1x with 1GB RAM (~$8/month)
- **Always On**: No cold starts (min_machines_running = 1)
- **Concurrency**: Hard limit of 1 request at a time
- **Budget**: ~$8/month (well under $10 ceiling)

## Important Notes

### Memory Configuration
Using 1GB RAM provides safe headroom for Node.js + FFmpeg video processing. If you need to scale down to reduce costs:

```bash
# Scale down to 512MB (~$4/month) - may have occasional OOM issues
fly scale memory 512

# Scale down to 256MB (~$2/month) - likely OOM crashes
fly scale memory 256
```

### Monitoring
```bash
# Live tail logs
fly logs

# Check machine status
fly machine list

# SSH into machine
fly ssh console
```

### Update Frontend
After deployment, update your frontend to use the Fly.io backend:

```bash
# In frontend/.env.production
VITE_API_URL=https://wedding-invite-backend.fly.dev
```

## Troubleshooting

### FFmpeg Check
```bash
fly ssh console
ffmpeg -version
ls -lh /app/frontend/public/fonts/
exit
```

### Rollback
```bash
fly releases
fly releases rollback <version_number>
```

## Files Created
- `Dockerfile` - Node.js 18 Alpine with FFmpeg
- `fly.toml` - Fly.io configuration
- `.dockerignore` - Files to exclude from build
- `.gitignore` - Ignore copied frontend assets
- `frontend/` - Copied fonts and assets from ../frontend/public/

## Cost Estimate
- Compute: ~$8/month (shared-cpu-1x, 1GB, always-on)
- Bandwidth: ~$0 (free tier covers low traffic)
- **Total: ~$8/month** ✓ Under $10 budget
