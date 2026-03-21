package com.jobwatch.apiservice.services;

import com.jobwatch.apiservice.models.Company;
import com.jobwatch.apiservice.models.UnsupportedCompany;
import com.jobwatch.apiservice.repositories.CompanyRepository;
import com.jobwatch.apiservice.repositories.UnsupportedCompanyRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;
import java.util.Optional;

@Service
public class CompanyDiscoveryService {

    private final CompanyRepository companyRepository;
    private final UnsupportedCompanyRepository unsupportedCompanyRepository;
    private final RestTemplate restTemplate;

    public CompanyDiscoveryService(CompanyRepository companyRepository,
                                   UnsupportedCompanyRepository unsupportedCompanyRepository) {
        this.companyRepository = companyRepository;
        this.unsupportedCompanyRepository = unsupportedCompanyRepository;
        this.restTemplate = new RestTemplate();
    }

    // Returns a Company if the slug is discoverable on any ATS platform, empty otherwise.
    public Optional<Company> discover(String slug) {
        // Already in DB
        Optional<Company> existing = companyRepository.findBySlug(slug);
        if (existing.isPresent()) return existing;

        // Already confirmed unsupported
        if (unsupportedCompanyRepository.existsBySlug(slug)) return Optional.empty();

        // Try each platform in order
        Optional<Company> discovered = tryGreenhouse(slug)
                .or(() -> tryLever(slug))
                .or(() -> tryAshby(slug));

        if (discovered.isPresent()) {
            return Optional.of(companyRepository.save(discovered.get()));
        }

        // Cache the miss so future searches skip ATS lookups
        unsupportedCompanyRepository.save(new UnsupportedCompany(slug));
        return Optional.empty();
    }

    private Optional<Company> tryGreenhouse(String slug) {
        try {
            String url = "https://boards-api.greenhouse.io/v1/boards/" + slug + "/jobs";
            restTemplate.getForObject(url, Map.class);
            Company c = new Company();
            c.setSlug(slug);
            c.setName(capitalize(slug));
            c.setPlatform("greenhouse");
            c.setPlatformId(slug);
            c.setLogoUrl("https://www.google.com/s2/favicons?domain=" + slug + ".com&sz=64");
            return Optional.of(c);
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    private Optional<Company> tryLever(String slug) {
        try {
            String url = "https://api.lever.co/v0/postings/" + slug;
            restTemplate.getForObject(url, Object.class);
            Company c = new Company();
            c.setSlug(slug);
            c.setName(capitalize(slug));
            c.setPlatform("lever");
            c.setPlatformId(slug);
            c.setLogoUrl("https://www.google.com/s2/favicons?domain=" + slug + ".com&sz=64");
            return Optional.of(c);
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    private Optional<Company> tryAshby(String slug) {
        try {
            String url = "https://api.ashbyhq.com/posting-api/job-board/" + slug;
            restTemplate.getForObject(url, Map.class);
            Company c = new Company();
            c.setSlug(slug);
            c.setName(capitalize(slug));
            c.setPlatform("ashby");
            c.setPlatformId(slug);
            c.setLogoUrl("https://www.google.com/s2/favicons?domain=" + slug + ".com&sz=64");
            return Optional.of(c);
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    private String capitalize(String slug) {
        if (slug == null || slug.isEmpty()) return slug;
        return Character.toUpperCase(slug.charAt(0)) + slug.substring(1);
    }
}
