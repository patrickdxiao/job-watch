package com.jobwatch.apiservice.services;

import com.jobwatch.apiservice.models.Company;
import com.jobwatch.apiservice.models.User;
import com.jobwatch.apiservice.models.Watchlist;
import com.jobwatch.apiservice.repositories.CompanyRepository;
import com.jobwatch.apiservice.repositories.UserRepository;
import com.jobwatch.apiservice.repositories.WatchlistRepository;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class WatchlistService {

    private static final String PRIORITY_QUEUE_KEY = "priority_scrape_queue";

    private final WatchlistRepository watchlistRepository;
    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final CompanyDiscoveryService companyDiscoveryService;
    private final StringRedisTemplate redisTemplate;

    public WatchlistService(WatchlistRepository watchlistRepository,
                            CompanyRepository companyRepository,
                            UserRepository userRepository,
                            CompanyDiscoveryService companyDiscoveryService,
                            StringRedisTemplate redisTemplate) {
        this.watchlistRepository = watchlistRepository;
        this.companyRepository = companyRepository;
        this.userRepository = userRepository;
        this.companyDiscoveryService = companyDiscoveryService;
        this.redisTemplate = redisTemplate;
    }

    // Get all companies in watchlist
    public List<Watchlist> getWatchlist(String email) {
        User user = userRepository.findByUsername(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return watchlistRepository.findByUser(user);
    }

    // Add a company to watchlist
    public Watchlist addToWatchlist(String email, Long companyId) {
        User user = userRepository.findByUsername(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new RuntimeException("Company not found"));

        if (watchlistRepository.existsByUserAndCompany(user, company)) {
            throw new RuntimeException("Company already in watchlist");
        }

        Watchlist watchlist = new Watchlist();
        watchlist.setUser(user);
        watchlist.setCompany(company);
        Watchlist saved = watchlistRepository.save(watchlist);
        redisTemplate.opsForList().leftPush(PRIORITY_QUEUE_KEY, company.getSlug());
        return saved;
    }

    // Remove a company from watchlist
    public void removeFromWatchlist(String email, Long companyId) {
        User user = userRepository.findByUsername(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new RuntimeException("Company not found"));

        Watchlist watchlist = watchlistRepository.findByUserAndCompany(user, company)
                .orElseThrow(() -> new RuntimeException("Company not in watchlist"));

        watchlistRepository.delete(watchlist);
    }

    // Search companies by name, falling back to ATS discovery if nothing found in DB
    public List<Company> searchCompanies(String query) {
        List<Company> results = companyRepository.findByNameContainingIgnoreCase(query);
        if (!results.isEmpty()) return results;

        // Nothing in DB — try to discover the company by treating the query as a slug
        String slug = query.toLowerCase().trim();
        Optional<Company> discovered = companyDiscoveryService.discover(slug);
        return discovered.map(List::of).orElse(List.of());
    }
}