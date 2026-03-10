FROM node:20-alpine

WORKDIR /app

# Install dependencies only when needed
COPY package.json package-lock.json* ./
RUN npm install

# Copy all files
COPY . .

# Next.js telemetry disable
ENV NEXT_TELEMETRY_DISABLED 1

# Expose port 3000
EXPOSE 3000

# Start development server
CMD ["npm", "run", "dev"]
