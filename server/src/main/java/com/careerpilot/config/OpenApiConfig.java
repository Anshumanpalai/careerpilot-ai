package com.careerpilot.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI careerPilotOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("CareerPilot AI Backend API")
                        .description("REST API foundation for CareerPilot AI — Intelligent Career & Application Copilot.")
                        .version("0.0.1-SNAPSHOT")
                        .contact(new Contact()
                                .name("CareerPilot Engineering")
                                .email("engineering@careerpilot.io"))
                        .license(new License()
                                .name("Proprietary")
                                .url("https://careerpilot.io")));
    }
}
