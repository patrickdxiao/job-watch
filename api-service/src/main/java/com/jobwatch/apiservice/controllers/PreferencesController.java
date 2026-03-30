package com.jobwatch.apiservice.controllers;

import com.jobwatch.apiservice.models.Company;
import com.jobwatch.apiservice.models.User;
import com.jobwatch.apiservice.models.UserPreferences;
import com.jobwatch.apiservice.repositories.CompanyRepository;
import com.jobwatch.apiservice.repositories.UserPreferencesRepository;
import com.jobwatch.apiservice.repositories.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@RestController
public class PreferencesController {

    private final UserPreferencesRepository preferencesRepository;
    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;

    public PreferencesController(UserPreferencesRepository preferencesRepository,
                                 UserRepository userRepository,
                                 CompanyRepository companyRepository) {
        this.preferencesRepository = preferencesRepository;
        this.userRepository = userRepository;
        this.companyRepository = companyRepository;
    }

    // User fetches their own preferences
    @GetMapping("/api/preferences")
    public ResponseEntity<PreferencesResponse> getPreferences(Authentication authentication) {
        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        return preferencesRepository.findByUser(user)
                .map(p -> ResponseEntity.ok(toResponse(p)))
                .orElse(ResponseEntity.ok(new PreferencesResponse(List.of(), List.of(), List.of())));
    }

    // User saves their preferences
    @PostMapping("/api/preferences")
    public ResponseEntity<PreferencesResponse> savePreferences(
            @RequestBody PreferencesRequest request,
            Authentication authentication) {

        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        UserPreferences prefs = preferencesRepository.findByUser(user)
                .orElse(new UserPreferences());
        prefs.setUser(user);
        prefs.setCategories(String.join(",", request.categories()));
        prefs.setSeniorities(String.join(",", request.seniorities()));
        preferencesRepository.save(prefs);

        return ResponseEntity.ok(toResponse(prefs));
    }

    // Toggle mute for a company — adds if not muted, removes if already muted
    @PostMapping("/api/watchlist/{companyId}/mute")
    public ResponseEntity<PreferencesResponse> toggleMute(
            @PathVariable Long companyId,
            Authentication authentication) {

        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new RuntimeException("Company not found"));

        UserPreferences prefs = preferencesRepository.findByUser(user)
                .orElse(new UserPreferences());
        prefs.setUser(user);

        List<String> muted = new ArrayList<>(splitOrEmpty(prefs.getMutedCompanies()));
        if (muted.contains(company.getSlug())) {
            muted.remove(company.getSlug());
        } else {
            muted.add(company.getSlug());
        }
        prefs.setMutedCompanies(String.join(",", muted));
        preferencesRepository.save(prefs);

        return ResponseEntity.ok(toResponse(prefs));
    }

    // Internal — notification-service checks a user's preferences by username
    @GetMapping("/internal/preferences")
    public ResponseEntity<PreferencesResponse> getPreferencesInternal(@RequestParam String email) {
        User user = userRepository.findByUsername(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return preferencesRepository.findByUser(user)
                .map(p -> ResponseEntity.ok(toResponse(p)))
                .orElse(ResponseEntity.ok(new PreferencesResponse(List.of(), List.of(), List.of())));
    }

    private PreferencesResponse toResponse(UserPreferences p) {
        return new PreferencesResponse(
                splitOrEmpty(p.getCategories()),
                splitOrEmpty(p.getSeniorities()),
                splitOrEmpty(p.getMutedCompanies())
        );
    }

    private List<String> splitOrEmpty(String value) {
        if (value == null || value.isBlank()) return List.of();
        return Arrays.asList(value.split(","));
    }

    record PreferencesRequest(List<String> categories, List<String> seniorities) {}
    record PreferencesResponse(List<String> categories, List<String> seniorities, List<String> mutedCompanies) {}
}
