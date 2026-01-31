# Cloud Run Crawler

Playwright로 URL 본문을 추출하는 경량 API.

## 로컬 테스트
```bash
cd crawler
npm install
npm start
```

```bash
curl -X POST http://localhost:8080/extract \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com"}'
```

## Cloud Run 배포
```bash
gcloud config set project YOUR_PROJECT

gcloud builds submit --tag gcr.io/YOUR_PROJECT/blog-crawler ./crawler

gcloud run deploy blog-crawler \
  --image gcr.io/YOUR_PROJECT/blog-crawler \
  --platform managed \
  --region asia-northeast3 \
  --allow-unauthenticated
```

## (선택) API 키 보호
```bash
gcloud run services update blog-crawler \
  --set-env-vars CRAWLER_API_KEY=YOUR_KEY
```

요청 시 헤더 추가:
```
X-Crawler-Key: YOUR_KEY
```
