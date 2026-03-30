package com.jobwatch.apiservice.models;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "user_preferences")
public class UserPreferences {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    // Comma-separated values e.g. "technical,product" or "" for no filter
    @Column(name = "categories", length = 500)
    private String categories;

    @Column(name = "seniorities", length = 500)
    private String seniorities;

    @Column(name = "muted_companies", length = 2000)
    private String mutedCompanies;
}
