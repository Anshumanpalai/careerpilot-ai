# Multi-stage Dockerfile for CareerPilot AI Spring Boot Backend
# Stage 1: Build application with Maven
FROM maven:3.9.9-eclipse-temurin-21-alpine AS builder
WORKDIR /build

# Cache dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -B || true

# Copy source code and build production jar
COPY src ./src
RUN mvn clean package -DskipTests -B

# Stage 2: Minimal production runtime
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Run as non-root user for security
RUN addgroup -S spring && adduser -S spring -G spring

# Ensure storage directory for resumes exists with correct permissions
RUN mkdir -p /app/storage/resumes && chown -R spring:spring /app

USER spring:spring

# Copy built artifact from builder stage
COPY --from=builder --chown=spring:spring /build/target/*.jar app.jar

# Railway automatically assigns $PORT and Spring Boot binds to it via server.port: ${PORT:8080}
ENV PORT=8080
EXPOSE 8080

# Configure JVM for container memory limits and faster startup
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
