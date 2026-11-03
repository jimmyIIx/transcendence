package com.ft.transcendence.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import com.ft.transcendence.model.Role;
import jakarta.validation.constraints.Pattern;

public class CreateUserRequest {
    @NotBlank(message = "Le nom d'utilisateur est requis")
    private String username;

    @NotBlank(message = "L'email est requis")
    @Email(message = "L'email doit etre valide")
    private String email;

    @NotBlank(message = "Le mot de passe est requis")
    @Size(min = 8, max = 128, message = "Le mot de passe ne respecte pas la politique de securite")
    @Pattern(
        regexp = "^(?=\\S)(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,128}(?<=\\S)$",
        message = "Le mot de passe doit contenir une minuscule, une majuscule et un chiffre, sans espace au debut ou a la fin"
    )
    private String password;

    private Role role;

    public String getUsername() { 
        return username; 
    }
    
    public void setUsername(String username) { 
        this.username = username; 
    }

    public String getEmail() { 
        return email; 
    }
    
    public void setEmail(String email) { 
        this.email = email; 
    }

    public String getPassword() { 
        return password; 
    }
    
    public void setPassword(String password) { 
        this.password = password; 
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }
}
