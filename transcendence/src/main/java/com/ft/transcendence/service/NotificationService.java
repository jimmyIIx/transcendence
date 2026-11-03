package com.ft.transcendence.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);
    private static final int MAX_BUFFER = 20;
    private static final long TICKET_TTL_MS = 30_000;

    // username → active SSE emitters (multiple tabs supported)
    private final Map<String, CopyOnWriteArrayList<SseEmitter>> userEmitters = new ConcurrentHashMap<>();

    // username → recent notification buffer (newest first)
    private final Map<String, LinkedList<Map<String, Object>>> userBuffer = new ConcurrentHashMap<>();

    // ticket → (username, expiresAt)
    private final Map<String, long[]> ticketExpiry = new ConcurrentHashMap<>();
    private final Map<String, String> ticketUser  = new ConcurrentHashMap<>();

    private final ObjectMapper objectMapper;

    public NotificationService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    // ── Ticket management ─────────────────────────────────────────────────────

    public String createTicket(String username) {
        String ticket = UUID.randomUUID().toString();
        ticketUser.put(ticket, username);
        ticketExpiry.put(ticket, new long[]{ System.currentTimeMillis() + TICKET_TTL_MS });
        return ticket;
    }

    public Optional<String> consumeTicket(String ticket) {
        String username = ticketUser.remove(ticket);
        long[] expiry  = ticketExpiry.remove(ticket);
        if (username == null || expiry == null || expiry[0] < System.currentTimeMillis()) {
            return Optional.empty();
        }
        return Optional.of(username);
    }

    // ── SSE subscription ──────────────────────────────────────────────────────

    public SseEmitter subscribe(String username) {
        SseEmitter emitter = new SseEmitter(0L); // no timeout
        emitter.onCompletion(() -> removeEmitter(username, emitter));
        emitter.onTimeout(()    -> removeEmitter(username, emitter));
        emitter.onError(e       -> removeEmitter(username, emitter));

        userEmitters.computeIfAbsent(username, k -> new CopyOnWriteArrayList<>()).add(emitter);

        // Replay buffered notifications so the client catches up
        List<Map<String, Object>> buffered = getBuffer(username);
        for (Map<String, Object> event : buffered) {
            if (!sendEvent(emitter, event)) return emitter;
        }

        // Ack
        try {
            emitter.send(SseEmitter.event().name("connected").data("ok"));
        } catch (IOException e) {
            emitter.completeWithError(e);
        }
        return emitter;
    }

    // ── Send notifications ────────────────────────────────────────────────────

    public void notifyUser(String username, String type, String message, Map<String, Object> extra) {
        Map<String, Object> event = buildEvent(type, message, extra);
        buffer(username, event);
        push(username, event);
    }

    public void notifyUsers(Collection<String> usernames, String type, String message, Map<String, Object> extra) {
        Map<String, Object> event = buildEvent(type, message, extra);
        for (String u : usernames) {
            buffer(u, event);
            push(u, event);
        }
    }

    // ── Internals ─────────────────────────────────────────────────────────────

    private Map<String, Object> buildEvent(String type, String message, Map<String, Object> extra) {
        Map<String, Object> e = new LinkedHashMap<>();
        e.put("id", UUID.randomUUID().toString());
        e.put("type", type);
        e.put("message", message);
        e.put("timestamp", LocalDateTime.now().toString());
        if (extra != null) e.putAll(extra);
        return e;
    }

    private void push(String username, Map<String, Object> event) {
        List<SseEmitter> emitters = userEmitters.get(username);
        if (emitters == null || emitters.isEmpty()) return;

        String json;
        try { json = objectMapper.writeValueAsString(event); }
        catch (Exception ex) { log.warn("Failed to serialize notification", ex); return; }

        List<SseEmitter> dead = new ArrayList<>();
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().name("notification").data(json));
            } catch (Exception ex) {
                dead.add(emitter);
            }
        }
        emitters.removeAll(dead);
    }

    private boolean sendEvent(SseEmitter emitter, Map<String, Object> event) {
        try {
            emitter.send(SseEmitter.event()
                    .name("notification")
                    .data(objectMapper.writeValueAsString(event)));
            return true;
        } catch (Exception e) {
            emitter.completeWithError(e);
            return false;
        }
    }

    private void buffer(String username, Map<String, Object> event) {
        userBuffer.computeIfAbsent(username, k -> new LinkedList<>()).addFirst(event);
        LinkedList<Map<String, Object>> list = userBuffer.get(username);
        while (list != null && list.size() > MAX_BUFFER) list.removeLast();
    }

    private List<Map<String, Object>> getBuffer(String username) {
        LinkedList<Map<String, Object>> list = userBuffer.get(username);
        return list != null ? new ArrayList<>(list) : List.of();
    }

    private void removeEmitter(String username, SseEmitter emitter) {
        CopyOnWriteArrayList<SseEmitter> list = userEmitters.get(username);
        if (list != null) list.remove(emitter);
    }
}
