# syntax=docker/dockerfile:1

# ---- Build stage ----
# Uses a JDK with the Maven wrapper to produce the executable jar. The project
# targets Java 21 bytecode; building on Temurin 21 keeps Lombok/MapStruct happy.
FROM eclipse-temurin:21-jdk AS build
WORKDIR /workspace

# Cache dependencies first for faster rebuilds.
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -q dependency:go-offline -DskipTests

# Build the application (tests run in CI, not in the image build).
COPY src/ src/
RUN ./mvnw -q clean package -DskipTests

# ---- Runtime stage ----
# Slim JRE for a small, secure runtime image. Runs as a non-root user.
FROM eclipse-temurin:21-jre AS runtime
WORKDIR /app

RUN groupadd --system app && useradd --system --gid app app
COPY --from=build /workspace/target/*.jar app.jar
RUN chown -R app:app /app
USER app

EXPOSE 8080

# Container-aware health check hitting the actuator liveness probe.
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD wget -qO- http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
