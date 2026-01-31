FROM node:20-slim

WORKDIR /app

# Install deps needed by Playwright Chromium
RUN apt-get update && apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libnss3 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpangocairo-1.0-0 \
    libpango-1.0-0 \
    libgtk-3-0 \
    libx11-xcb1 \
    libxshmfence1 \
    libxext6 \
    libx11-6 \
    libdrm2 \
    wget \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY server.js ./

ENV PLAYWRIGHT_BROWSERS_PATH=0
RUN npx playwright install chromium

ENV PORT=8080
EXPOSE 8080

CMD ["node", "server.js"]
