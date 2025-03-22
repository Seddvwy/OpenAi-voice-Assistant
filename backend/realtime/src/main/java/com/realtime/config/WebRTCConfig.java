package com.realtime.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration
public class WebRTCConfig {

    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}
