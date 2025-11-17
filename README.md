
# ScraperX — Render Deployment

## Steps:
1. Create a new GitHub repo named `scraperx`.
2. Upload all files from this ZIP.
3. Go to https://render.com → New Web Service → Connect your GitHub.
4. Select `scraperx` repo.
5. Render detects Node.js automatically.
6. Add environment variable:
   - KEY: OPENAI_API_KEY
   - VALUE: sk-xxxx
7. Deploy.

Your API endpoint becomes:
https://scraperx.onrender.com/enrich
