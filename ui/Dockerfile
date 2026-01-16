# Use Node for development
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy only package files first (better caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Expose Vite dev server port
EXPOSE 5173

# Default command: run Vite dev server with host enabled
CMD ["npm", "run", "dev", "--", "--host"]
