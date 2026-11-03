package com.ft.transcendence.controller;

import com.ft.transcendence.service.NotificationService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.security.Principal;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    /**
     * Authenticated users call this to get a short-lived ticket (30 s).
     * The ticket is then passed to /stream as a query param (EventSource cannot set headers).
     */
    @PostMapping("/ticket")
    public ResponseEntity<Map<String, String>> ticket(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(Map.of("ticket", notificationService.createTicket(principal.getName())));
    }

    /**
     * SSE stream — no JWT header needed; the one-time ticket authenticates the request.
     */
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@RequestParam String ticket) {
        Optional<String> username = notificationService.consumeTicket(ticket);
        if (username.isEmpty()) {
            SseEmitter err = new SseEmitter();
            err.completeWithError(new IllegalArgumentException("Ticket invalide ou expiré"));
            return err;
        }
        return notificationService.subscribe(username.get());
    }
}
