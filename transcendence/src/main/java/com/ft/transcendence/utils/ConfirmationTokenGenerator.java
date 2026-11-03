package com.ft.transcendence.utils;

import java.util.UUID;

public class ConfirmationTokenGenerator {

    public static String generateToken() {
        return UUID.randomUUID().toString();
    }
}
