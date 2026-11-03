package com.ft.transcendence.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import jakarta.mail.internet.MimeMessage;

@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;

    @Value("${spring.mail.from:noreply@transcendence.com}")
    private String fromEmail;

    @Value("${app.frontend.url:http://localhost:4200}")
    private String frontendUrl;

    @Value("${app.support.email}")
    private String supportEmail;

    private static final String SECONDARY_SUPPORT_EMAIL = "support.42bet@gmail.com";

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendContactEmail(String senderEmail, String subject, String messageBody) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(new String[] { supportEmail, SECONDARY_SUPPORT_EMAIL });
            helper.setReplyTo(senderEmail);
            helper.setSubject("[Support 42bets] " + subject);
            helper.setText(buildContactEmailBody(senderEmail, subject, messageBody), true);

            mailSender.send(message);
            logger.info("Contact email sent from {}", senderEmail);
        } catch (Exception e) {
            logger.error("Failed to send contact email from {}", senderEmail, e);
            throw new RuntimeException("Contact email send failed: " + e.getMessage(), e);
        }
    }

    private String buildContactEmailBody(String senderEmail, String subject, String messageBody) {
        return "<!DOCTYPE html>" +
                "<html>" +
                "<body style=\"font-family: Arial, sans-serif;\">" +
                "<div style=\"max-width: 600px; margin: 0 auto;\">" +
                "<h2>Nouveau message de support</h2>" +
                "<p><strong>De :</strong> " + escapeHtml(senderEmail) + "</p>" +
                "<p><strong>Sujet :</strong> " + escapeHtml(subject) + "</p>" +
                "<p><strong>Message :</strong></p>" +
                "<p style=\"white-space: pre-wrap;\">" + escapeHtml(messageBody) + "</p>" +
                "</div>" +
                "</body>" +
                "</html>";
    }

    private String escapeHtml(String value) {
        return value.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }

    public void sendConfirmationEmail(String userEmail, String username, String confirmationToken) {
        sendConfirmationEmail(userEmail, username, confirmationToken, frontendUrl);
    }

    public void sendConfirmationEmail(String userEmail, String username, String confirmationToken, String frontendBaseUrl) {
        try {
            String confirmationLink = frontendBaseUrl + "/confirm-email/" + confirmationToken;

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(userEmail);
            helper.setSubject("Welcome to Transcendence - Email Confirmation");
            helper.setText(buildConfirmationEmailBody(username, confirmationLink), true);

            mailSender.send(message);
            logger.info("Confirmation email sent to {}", userEmail);
        } catch (Exception e) {
            logger.error("Failed to send confirmation email to {}", userEmail, e);
            throw new RuntimeException("Email confirmation send failed: " + e.getMessage(), e);
        }
    }

    private String buildConfirmationEmailBody(String username, String confirmationLink) {
        return "<!DOCTYPE html>" +
                "<html>" +
                "<head>" +
                "<style>" +
                "body { font-family: Arial, sans-serif; background-color: #f5f5f5; }" +
                ".container { max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; }" +
                ".header { color: #333; margin-bottom: 20px; }" +
                ".content { color: #555; line-height: 1.6; margin-bottom: 20px; }" +
                ".button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px; margin-top: 10px; }" +
                ".footer { color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; }" +
                "</style>" +
                "</head>" +
                "<body>" +
                "<div class=\"container\">" +
                "<h1 class=\"header\">Welcome to Transcendence, " + username + "! 🎉</h1>" +
                "<div class=\"content\">" +
                "<p>Your account has been successfully created!</p>" +
                "<p>To activate your account and start betting, please confirm your email address by clicking the button below:</p>" +
                "</div>" +
                "<a href=\"" + confirmationLink + "\" class=\"button\">Confirm Email Address</a>" +
                "<div class=\"content\">" +
                "<p>Or copy and paste this link in your browser:</p>" +
                "<p style=\"word-break: break-all;\"><small>" + confirmationLink + "</small></p>" +
                "<p><strong>This link will expire in 24 hours.</strong></p>" +
                "</div>" +
                "<div class=\"footer\">" +
                "<p>If you didn't create this account, please ignore this email.</p>" +
                "<p>Best regards,<br>The Transcendence Team</p>" +
                "</div>" +
                "</div>" +
                "</body>" +
                "</html>";
    }

    public void sendPasswordResetEmail(String userEmail, String username, String resetToken) {
        sendPasswordResetEmail(userEmail, username, resetToken, frontendUrl);
    }

    public void sendPasswordResetEmail(String userEmail, String username, String resetToken, String frontendBaseUrl) {
        try {
            String resetLink = frontendBaseUrl + "/reset-password/" + resetToken;

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(userEmail);
            helper.setSubject("Reset Your Transcendence Password");
            helper.setText(buildPasswordResetEmailBody(username, resetLink), true);

            mailSender.send(message);
            logger.info("Password reset email sent to {}", userEmail);
        } catch (Exception e) {
            logger.error("Failed to send password reset email to {}", userEmail, e);
            throw new RuntimeException("Password reset email send failed: " + e.getMessage(), e);
        }
    }

    private String buildPasswordResetEmailBody(String username, String resetLink) {
        return "<!DOCTYPE html>" +
                "<html>" +
                "<head>" +
                "<style>" +
                "body { font-family: Arial, sans-serif; background-color: #f5f5f5; }" +
                ".container { max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; }" +
                ".header { color: #333; margin-bottom: 20px; }" +
                ".content { color: #555; line-height: 1.6; margin-bottom: 20px; }" +
                ".button { display: inline-block; padding: 12px 24px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 4px; margin-top: 10px; }" +
                ".footer { color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; }" +
                ".warning { background-color: #fff3cd; padding: 10px; border-radius: 4px; margin-bottom: 10px; }" +
                "</style>" +
                "</head>" +
                "<body>" +
                "<div class=\"container\">" +
                "<h1 class=\"header\">Password Reset Request</h1>" +
                "<div class=\"warning\">" +
                "<p><strong>⚠️ Warning:</strong> If you didn't request this password reset, please ignore this email.</p>" +
                "</div>" +
                "<div class=\"content\">" +
                "<p>Hello " + username + ",</p>" +
                "<p>We received a request to reset your password. Click the button below to create a new password:</p>" +
                "</div>" +
                "<a href=\"" + resetLink + "\" class=\"button\">Reset Password</a>" +
                "<div class=\"content\">" +
                "<p>Or copy and paste this link in your browser:</p>" +
                "<p style=\"word-break: break-all;\"><small>" + resetLink + "</small></p>" +
                "<p><strong>This link will expire in 1 hour.</strong></p>" +
                "</div>" +
                "<div class=\"footer\">" +
                "<p>For security reasons, never share this link with anyone.</p>" +
                "<p>Best regards,<br>The Transcendence Team</p>" +
                "</div>" +
                "</div>" +
                "</body>" +
                "</html>";
    }
}

