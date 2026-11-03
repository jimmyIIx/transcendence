package com.ft.transcendence.service;
import com.ft.transcendence.model.Role;
import com.ft.transcendence.model.User;
import com.ft.transcendence.repository.UserRepository;
import com.ft.transcendence.repository.RefreshTokenRepository;
import com.ft.transcendence.utils.ConfirmationTokenGenerator;
import com.ft.transcendence.utils.ValidationUtils;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.Optional;
import java.time.LocalDateTime;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    public UserService(UserRepository userRepository,
                       RefreshTokenRepository refreshTokenRepository,
                       PasswordEncoder passwordEncoder,
                       EmailService emailService) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
    }

    public User createUser(String username, String email, String password, Role role, String frontendBaseUrl) {
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
        user.setRole(role != null ? role : Role.USER);
        user.setEmailVerified(false);

        String confirmationToken = ConfirmationTokenGenerator.generateToken();
        user.setConfirmationToken(confirmationToken);

        User savedUser = userRepository.save(user);
        emailService.sendConfirmationEmail(email, username, confirmationToken, frontendBaseUrl);

        return savedUser;
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public User getUserById(Long id) {
        Optional<User> user = userRepository.findById(id);
        return user.orElse(null);
    }

    public User updateUser(Long id, String username, String email, String password, Role role, Boolean emailVerified) {
        User user = getUserById(id);
        if (user != null) {
            if (!user.getUsername().equals(username) && userRepository.findByUsername(username).isPresent()) {
                throw new RuntimeException("Ce nom d'utilisateur existe déjà");
            }

            if (!user.getEmail().equals(email) && userRepository.findByEmail(email).isPresent()) {
                throw new RuntimeException("Cet email est déjà enregistré");
            }

            user.setUsername(username);
            user.setEmail(email);
            if (password != null && !password.isEmpty()) {
                ValidationUtils.validatePassword(password);
                user.setPassword(passwordEncoder.encode(password));
            }
            if (role != null) {
                user.setRole(role);
            }
            if (emailVerified != null) {
                user.setEmailVerified(emailVerified);
                if (emailVerified) {
                    user.setConfirmationToken(null);
                }
            }
            return userRepository.save(user);
        }
        return null;
    }

    public User changeUserRole(Long id, Role role) {
        User user = getUserById(id);
        if (user != null) {
            user.setRole(role);
            return userRepository.save(user);
        }
        return null;
    }

    @Transactional
    public User enableMarketGenerationConsent(String username) {
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));

        if (!"42".equals(user.getOauthProvider())) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Le consentement est disponible uniquement pour les comptes connectés avec 42."
            );
        }

        if (user.getOauthProfileSnapshot() == null || user.getOauthProfileSnapshot().isBlank()) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Le profil OAuth est manquant. Veuillez vous reconnecter avec 42 d'abord."
            );
        }

        user.setMarketGenerationConsent(true);
        user.setMarketGenerationConsentAt(LocalDateTime.now());
        user.setMarketGenerationRevokedAt(null);
        return userRepository.save(user);
    }

    @Transactional
    public User revokeMarketGenerationConsent(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));

        if (!"42".equals(user.getOauthProvider())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le consentement est disponible uniquement pour les comptes connectés avec 42."
            );
        }

        user.setMarketGenerationConsent(false);
        user.setMarketGenerationRevokedAt(LocalDateTime.now());
        return userRepository.save(user);
    }

    public List<User> getConsenting42Users() {
        return userRepository.findByOauthProviderAndMarketGenerationConsentTrue("42");
    }

    public User getUserByUsername(String username) {
        return userRepository.findByUsername(username).orElse(null);
    }

    @Transactional
    public User updateWalletAddress(String username, String walletAddress) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        if (walletAddress == null || !BlockchainService.isValidAddress(walletAddress)) {
            throw new RuntimeException("Adresse de wallet invalide (format attendu: 0x suivi de 40 caractères hexadécimaux)");
        }
        user.setWalletAddress(walletAddress.trim());
        return userRepository.save(user);
    }

    @Transactional
    public void deleteUser(Long id) {
        // First delete the RefreshToken to avoid cascade issues
        refreshTokenRepository.deleteByUserId(id);
        // Then delete the User
        userRepository.deleteById(id);
    }

    public void resendConfirmationEmail(Long userId, String frontendBaseUrl) {
        User user = getUserById(userId);
        if (user == null) {
            throw new RuntimeException("Utilisateur introuvable");
        }

        if (user.isEmailVerified()) {
            throw new RuntimeException("L'email est déjà vérifié");
        }

        String confirmationToken = ConfirmationTokenGenerator.generateToken();
        user.setConfirmationToken(confirmationToken);
        userRepository.save(user);

        emailService.sendConfirmationEmail(user.getEmail(), user.getUsername(), confirmationToken, frontendBaseUrl);
    }

    @Transactional
    public User adjustBalance(Long userId, java.math.BigDecimal delta) {
        User user = getUserById(userId);
        if (user == null) {
            throw new RuntimeException("Utilisateur introuvable");
        }
        java.math.BigDecimal newBalance = user.getBalance().add(delta);
        if (newBalance.compareTo(java.math.BigDecimal.ZERO) < 0) {
            throw new RuntimeException("Solde insuffisant pour effectuer ce débit");
        }
        user.setBalance(newBalance);
        return userRepository.save(user);
    }
}