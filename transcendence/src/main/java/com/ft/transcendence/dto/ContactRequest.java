package com.ft.transcendence.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class ContactRequest {
    @NotBlank(message = "L'email est requis")
    @Email(message = "L'email doit etre valide")
    private String email;

    @NotBlank(message = "Le sujet est requis")
    @Size(max = 200, message = "Le sujet est trop long")
    private String subject;

    @NotBlank(message = "Le message est requis")
    @Size(max = 5000, message = "Le message est trop long")
    private String message;

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}
