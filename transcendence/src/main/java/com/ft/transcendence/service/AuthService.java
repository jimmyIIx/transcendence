package com.ft.transcendence.service;

import com.ft.transcendence.model.Role;
import com.ft.transcendence.model.User;
import com.ft.transcendence.repository.UserRepository;
import com.ft.transcendence.utils.ConfirmationTokenGenerator;
import com.ft.transcendence.utils.ValidationUtils;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private static final long PASSWORD_RESET_TOKEN_EXPIRATION_HOURS = 1;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, EmailService emailService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
    }

    public User register(String username, String email, String password, String frontendBaseUrl) {
        // register new user with validation and email confirmation
        ValidationUtils.validateUsername(username);
        ValidationUtils.validateEmail(email);
        ValidationUtils.validatePassword(password);

        if (userRepository.findByUsername(username).isPresent()) {
            throw new RuntimeException("Ce nom d'utilisateur existe déjà");
        }

        if (userRepository.findByEmail(email).isPresent()) {
            throw new RuntimeException("Cet email est déjà enregistré");
        }

        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(password));
        user.setRole(Role.USER);
        user.setEmailVerified(false);
        // generate confirmation token
        String confirmationToken = ConfirmationTokenGenerator.generateToken();
        user.setConfirmationToken(confirmationToken);
        user.setConfirmationTokenExpiresAt(LocalDateTime.now().plusHours(24));
        User savedUser = userRepository.save(user);
        // send confirmation email with link
        emailService.sendConfirmationEmail(email, username, confirmationToken, frontendBaseUrl);

        return savedUser;
    }

    public void resendConfirmationEmail(String email, String frontendBaseUrl) {
    // Generate and send a new confirmation email
    ValidationUtils.validateEmail(email);

    User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("Aucun compte associé à cet email"));

    // If already verified, throw error
    if (user.isEmailVerified()) {
        throw new RuntimeException("L'email est déjà vérifié");
    }

    // Generate new confirmation token
    String newConfirmationToken = ConfirmationTokenGenerator.generateToken();
    user.setConfirmationToken(newConfirmationToken);
    user.setConfirmationTokenExpiresAt(LocalDateTime.now().plusHours(24)); // Token expires in 24 hours

    userRepository.save(user);

    // Send new confirmation email
    emailService.sendConfirmationEmail(email, user.getUsername(), newConfirmationToken, frontendBaseUrl);
}

    public User authenticate(String username, String password) {
        // check credentials and validate email confirmation
        if (username == null || username.isEmpty()) {
            throw new RuntimeException("Le nom d'utilisateur ne peut pas être vide");
        }
        if (password == null || password.isEmpty()) {
            throw new RuntimeException("Le mot de passe ne peut pas être vide");
        }

        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new RuntimeException("Mot de passe invalide");
        }

        if (!user.isEmailVerified()) {
            throw new RuntimeException("Email non vérifié. Veuillez consulter votre boîte mail pour le lien de confirmation.");
        }

        return user;
    }

    public User confirmEmail(String token) {
    User user = userRepository.findByConfirmationToken(token)
            .orElseThrow(() -> new RuntimeException("Jeton de confirmation invalide ou expiré"));

    // Check if token has expired
    if (user.getConfirmationTokenExpiresAt() != null && 
        LocalDateTime.now().isAfter(user.getConfirmationTokenExpiresAt())) {
        throw new RuntimeException("Le jeton de confirmation a expiré. Veuillez demander un nouvel email de confirmation.");
    }

    user.setEmailVerified(true);
    user.setConfirmationToken(null);
    user.setConfirmationTokenExpiresAt(null); // clear the expiration date
    return userRepository.save(user);
}
    public void initiatePasswordReset(String email, String frontendBaseUrl) {
        ValidationUtils.validateEmail(email);

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("Aucun compte associé à cet email"));

        // generate password reset token (in plain text for email) and hash it for storage
        String resetToken = UUID.randomUUID().toString();
        String hashedResetToken = passwordEncoder.encode(resetToken);
        
        user.setPasswordResetToken(hashedResetToken);
        user.setPasswordResetTokenExpiresAt(
                LocalDateTime.now().plusHours(PASSWORD_RESET_TOKEN_EXPIRATION_HOURS)
        );

        userRepository.save(user);

        // send password reset email with plain text token
        emailService.sendPasswordResetEmail(email, user.getUsername(), resetToken, frontendBaseUrl);
    }

    public void resetPassword(String token, String newPassword, String confirmPassword) {
        // reset password with token validation
        ValidationUtils.validatePassword(newPassword);
        ValidationUtils.validatePasswordMatch(newPassword, confirmPassword);

        // Find user by comparing hashed token (linear search)
        User user = userRepository.findAll().stream()
                .filter(u -> u.getPasswordResetToken() != null && 
                           passwordEncoder.matches(token, u.getPasswordResetToken()))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Jeton de réinitialisation invalide ou expiré"));

        // check if token is expired
        if (user.getPasswordResetTokenExpiresAt() != null &&
                LocalDateTime.now().isAfter(user.getPasswordResetTokenExpiresAt())) {
            throw new RuntimeException("Le jeton de réinitialisation a expiré");
        }

        // update password
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setPasswordResetToken(null); // clear the token
        user.setPasswordResetTokenExpiresAt(null);

        userRepository.save(user);
    }

    public User getUserById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
    }
}