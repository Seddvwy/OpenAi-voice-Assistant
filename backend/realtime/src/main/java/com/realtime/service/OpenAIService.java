package com.realtime.service;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import java.util.Collections;

@Service
public class OpenAIService {

    @Value("${openai.api.key}")
    private String openaiApiKey;

    public String createEphemeralToken() {
        String url = "https://api.openai.com/v1/realtime/sessions";
        RestTemplate restTemplate = new RestTemplate();

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + openaiApiKey);
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));

        // Using a single voice to prevent multiple voices issue
        // Removed the max_duration parameter that was causing the error
        String requestBody = "{\"model\": \"gpt-4o-realtime-preview-2024-12-17\", " +
                             "\"voice\": \"echo\"}";  // Using the 'echo' voice consistently

        HttpEntity<String> entity = new HttpEntity<>(requestBody, headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                url, HttpMethod.POST, entity, String.class);
            return response.getBody();
        } catch (Exception e) {
            // Log the error and return a structured error response
            System.err.println("Error creating ephemeral token: " + e.getMessage());
            return "{\"error\": \"Failed to create session with OpenAI\", \"details\": \"" + e.getMessage() + "\"}";
        }
    }
}