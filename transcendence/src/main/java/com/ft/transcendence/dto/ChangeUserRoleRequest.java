package com.ft.transcendence.dto;

import com.ft.transcendence.model.Role;
import jakarta.validation.constraints.NotNull;

public class ChangeUserRoleRequest {
    @NotNull(message = "Le role est requis")
    private Role role;

    public Role getRole() { 
        return role; 
    }
    
    public void setRole(Role role) { 
        this.role = role; 
    }
}
