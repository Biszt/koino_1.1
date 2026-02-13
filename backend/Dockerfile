# Node.js alap image
FROM node:18-alpine

# Munkakönyvtár beállítása
WORKDIR /app

# Package fájlok másolása
COPY package*.json ./

# Függőségek telepítése
# Python és make szükséges a bcrypt fordításához
RUN apk add --no-cache python3 make g++ && \
    npm install && \
    apk del python3 make g++

# Backend fájlok másolása
COPY . .

# Port kiadása
EXPOSE 3000

# Nodemon indítása development módban
CMD ["npm", "run", "dev"]
