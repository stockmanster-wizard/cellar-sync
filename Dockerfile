FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

COPY . .

RUN if [ ! -f firebase-applet-config.json ]; then cp firebase-applet-config.example.json firebase-applet-config.json; fi
RUN npm run build

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["npm", "start"]
