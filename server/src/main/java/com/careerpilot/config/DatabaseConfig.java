package com.careerpilot.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;

import javax.sql.DataSource;
import java.net.URI;

@Configuration
public class DatabaseConfig {

    private static final Logger log = LoggerFactory.getLogger(DatabaseConfig.class);

    @Bean
    @Primary
    @Profile("!test")
    public DataSource dataSource(DataSourceProperties properties) {
        String databaseUrl = System.getenv("DATABASE_URL");
        if (databaseUrl != null && !databaseUrl.isBlank() && !databaseUrl.startsWith("jdbc:")) {
            try {
                // Railway and Heroku provide DATABASE_URL in postgresql://user:password@host:port/dbname format
                String normalizedUrl = databaseUrl.replace("postgres://", "postgresql://");
                URI uri = new URI(normalizedUrl);
                String host = uri.getHost();
                int port = uri.getPort() == -1 ? 5432 : uri.getPort();
                String path = uri.getPath();
                String jdbcUrl = "jdbc:postgresql://" + host + ":" + port + path;
                if (uri.getQuery() != null && !uri.getQuery().isBlank()) {
                    jdbcUrl += "?" + uri.getQuery();
                }

                String username = properties.getUsername();
                String password = properties.getPassword();
                if (uri.getUserInfo() != null) {
                    String[] userInfoParts = uri.getUserInfo().split(":", 2);
                    username = userInfoParts[0];
                    if (userInfoParts.length > 1) {
                        password = userInfoParts[1];
                    }
                }

                log.info("Auto-configured PostgreSQL DataSource from DATABASE_URL for host: {}, port: {}, database: {}", host, port, path);
                return DataSourceBuilder.create()
                        .url(jdbcUrl)
                        .username(username)
                        .password(password)
                        .driverClassName("org.postgresql.Driver")
                        .build();
            } catch (Exception e) {
                log.warn("Failed to parse DATABASE_URL ({}), falling back to standard datasource configuration: {}", databaseUrl, e.getMessage());
            }
        }
        return properties.initializeDataSourceBuilder().build();
    }
}

