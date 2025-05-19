FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
COPY wait-for.sh /wait-for.sh
RUN chmod +x /wait-for.sh
EXPOSE 8080
CMD ["/bin/sh", "-c", "/wait-for.sh && node index.js"
