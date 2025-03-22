package com.realtime.controller;

import com.realtime.service.OpenAIService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.ResponseEntity;

@RestController
public class WebRTCController {

    @Autowired
    private OpenAIService openAIService;

    @GetMapping(value = "/session", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> getEphemeralToken() {
        String response = openAIService.createEphemeralToken();
        
        // Check if the response contains an error
        if (response.contains("\"error\"")) {
            return ResponseEntity.badRequest().body(response);
        }
        
        return ResponseEntity.ok(response);
    }
}