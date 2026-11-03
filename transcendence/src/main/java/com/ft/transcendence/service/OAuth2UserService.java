package com.ft.transcendence.service;

import com.ft.transcendence.model.Role;
import com.ft.transcendence.model.User;
import com.ft.transcendence.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class OAuth2UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ObjectMapper objectMapper;

    public OAuth2UserService(UserRepository userRepository, PasswordEncoder passwordEncoder, ObjectMapper objectMapper) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.objectMapper = objectMapper;
    }

    public User processOAuth2User(String provider, Map<String, Object> attributes) {
        String providerId = extractProviderId(provider, attributes);
        String email = extractEmail(attributes);
        String login = extractLogin(attributes);
        String avatarUrl = extractAvatarUrl(attributes);
        String resolvedEmail = resolveEmail(provider, providerId, login, email);

        Optional<User> existingUser = userRepository.findByOauthProviderAndOauthProviderId(provider, providerId);
        if (existingUser.isPresent()) {
            User user = existingUser.get();
            if (avatarUrl != null) {
                user.setAvatarUrl(avatarUrl);
            }
            user.setOauthProfileSnapshot(serializeAttributes(attributes));
            return userRepository.save(user);
        }

        Optional<User> userByEmail = userRepository.findByEmail(resolvedEmail);
        if (userByEmail.isPresent()) {
            User user = userByEmail.get();
            user.setOauthProvider(provider);
            user.setOauthProviderId(providerId);
            if (avatarUrl != null) {
                user.setAvatarUrl(avatarUrl);
            }
            user.setOauthProfileSnapshot(serializeAttributes(attributes));
            return userRepository.save(user);
        }

        if (email != null) {
            userByEmail = userRepository.findByEmail(email);
            if (userByEmail.isPresent()) {
                User user = userByEmail.get();
                user.setOauthProvider(provider);
                user.setOauthProviderId(providerId);
                if (avatarUrl != null) {
                    user.setAvatarUrl(avatarUrl);
                }
                user.setOauthProfileSnapshot(serializeAttributes(attributes));
                return userRepository.save(user);
            }
        }

        User newUser = new User();
        newUser.setUsername(resolveUsername(login, email));
        newUser.setEmail(resolvedEmail);
        newUser.setOauthProvider(provider);
        newUser.setOauthProviderId(providerId);
        newUser.setAvatarUrl(avatarUrl);
        newUser.setOauthProfileSnapshot(serializeAttributes(attributes));
        newUser.setEmailVerified(true);
        newUser.setRole(Role.USER);
        newUser.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));

        return userRepository.save(newUser);
    }

    private String serializeAttributes(Map<String, Object> attributes) {
        try {
            return objectMapper.writeValueAsString(attributes);
        } catch (Exception exception) {
            throw new RuntimeException("Unable to serialize OAuth profile snapshot", exception);
        }
    }

    private String resolveUsername(String login, String email) {
        if (login != null && !login.isBlank()) {
            return login;
        }

        if (email != null && !email.isBlank() && email.contains("@")) {
            return email.substring(0, email.indexOf('@'));
        }

        throw new RuntimeException("OAuth provider did not return a valid username or email");
    }

    private String extractEmail(Map<String, Object> attributes) {
        Object emailValue = attributes.get("email");
        if (emailValue instanceof String email && !email.isBlank()) {
            return email;
        }

        Object notificationEmailValue = attributes.get("notification_email");
        if (notificationEmailValue instanceof String notificationEmail && !notificationEmail.isBlank()) {
            return notificationEmail;
        }

        return null;
    }

    private String resolveEmail(String provider, String providerId, String login, String email) {
        if (email != null && !email.isBlank()) {
            return email;
        }

        String safeLogin = (login != null && !login.isBlank()) ? login : "user";
        return provider + "+" + providerId + "+" + safeLogin + "@oauth.local";
    }

    private String extractLogin(Map<String, Object> attributes) {
        Object loginValue = attributes.get("login");
        if (loginValue instanceof String login && !login.isBlank()) {
            return login;
        }
        return null;
    }

    private String extractAvatarUrl(Map<String, Object> attributes) {
        Object avatarValue = attributes.get("image");
        if (avatarValue instanceof String avatarUrl && !avatarUrl.isBlank()) {
            return avatarUrl;
        }

        Object pictureValue = attributes.get("picture");
        if (pictureValue instanceof String pictureUrl && !pictureUrl.isBlank()) {
            return pictureUrl;
        }

        Object imageValue = attributes.get("image");
        if (imageValue instanceof Map<?, ?> imageMap) {
            Object linkValue = imageMap.get("link");
            if (linkValue instanceof String link && !link.isBlank()) {
                return link;
            }
        }

        Object avatarUrlValue = attributes.get("avatar_url");
        if (avatarUrlValue instanceof String avatarUrl && !avatarUrl.isBlank()) {
            return avatarUrl;
        }

        return null;
    }

    private String extractProviderId(String provider, Map<String, Object> attributes) {
        switch (provider) {
            case "42":
            case "github":
                Object idValue = attributes.get("id");
                if (idValue == null) {
                    throw new RuntimeException("OAuth provider did not return an id");
                }
                return String.valueOf(idValue);
            case "google":
                Object subValue = attributes.get("sub");
                if (subValue == null) {
                    throw new RuntimeException("Google OAuth provider did not return a sub");
                }
                return String.valueOf(subValue);
            default:
                throw new RuntimeException("Unknown OAuth provider: " + provider);
        }
    }
}