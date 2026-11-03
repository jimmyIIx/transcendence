package com.ft.transcendence.controller;

import com.ft.transcendence.dto.ContactRequest;
import com.ft.transcendence.service.EmailService;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/contact")
public class ContactController {

    private final EmailService emailService;

    public ContactController(EmailService emailService) {
        this.emailService = emailService;
    }

    @PostMapping
    public ResponseEntity<Void> submitContact(@Valid @RequestBody ContactRequest request) {
        emailService.sendContactEmail(request.getEmail(), request.getSubject(), request.getMessage());
        return ResponseEntity.ok().build();
    }
}
