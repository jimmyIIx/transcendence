package com.ft.transcendence.dto;

import jakarta.validation.constraints.NotBlank;

public class PasswordResetConfirmRequest {

    @NotBlank(message = "Le jeton est requis")
    private String token;

    @NotBlank(message = "Le nouveau mot de passe est requis")
    private String newPassword;

    @NotBlank(message = "La confirmation du mot de passe est requise")
    private String confirmPassword;

    public PasswordResetConfirmRequest() {}

    public PasswordResetConfirmRequest(String token, String newPassword, String confirmPassword) {
        this.token = token;
        this.newPassword = newPassword;
        this.confirmPassword = confirmPassword;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getNewPassword() {
        return newPassword;
    }

    public void setNewPassword(String newPassword) {
        this.newPassword = newPassword;
    }

    public String getConfirmPassword() {
        return confirmPassword;
    }

    public void setConfirmPassword(String confirmPassword) {
        this.confirmPassword = confirmPassword;
    }
}
