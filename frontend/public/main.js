document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('analyze-form');
    const repoInput = document.getElementById('repo-input');
    const resultsDiv = document.getElementById('results');
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    const exampleBtns = document.querySelectorAll('.example-btn');

    // Example buttons functionality
    exampleBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const repo = this.getAttribute('data-repo');
            repoInput.value = repo;
            form.dispatchEvent(new Event('submit'));
        });
    });

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        const repo = repoInput.value.trim();
        if (!repo) return;
        
        // Show loading state
        showLoadingState();
        hideResults();
        hideError();
        
        try {
            // Simulate loading steps
            simulateLoadingSteps();
            
            // Fetch basic analysis with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
            
            const response = await fetch(`http://127.0.0.1:5001/analyze?repo=${encodeURIComponent(repo)}`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            const data = await response.json();
            
            if (data.error) {
                showError('Error: ' + data.error);
                return;
            }
            
            // Update repository overview
            updateRepositoryOverview(data);
            
            // Render existing visualizations
            window.renderLanguageBreakdown(data.languages);
            window.renderContributionGraph(data.contributors);
            
            // Fetch and render all new features
            await Promise.all([
                fetchAndRenderTree(repo),
                fetchAndRenderActivity(repo),
                fetchAndRenderCoverage(repo),
                fetchAndRenderStats(repo),
                fetchAndRenderIssues(repo),
                fetchAndRenderPullRequests(repo),
                fetchAndRenderReleases(repo),
                fetchAndRenderDependencies(repo),
                fetchAndRenderTopics(repo)
            ]);
            
            hideLoadingState();
            showResults();
            
        } catch (err) {
            if (err.name === 'AbortError') {
                showError('Request timed out. GitHub API might be rate limited. Please try again in a few minutes.');
            } else {
                showError('Error: ' + err.message);
            }
            hideLoadingState();
        }
    });
});

// Helper functions for new features
async function fetchAndRenderTree(repo) {
    try {
        const res = await fetch(`http://127.0.0.1:5001/tree?repo=${encodeURIComponent(repo)}`);
        const treeData = await res.json();
        if (treeData.tree) {
            window.renderDirectoryTree(treeData.tree);
        } else {
            document.getElementById('directory-tree').innerHTML = '<p class="no-data">No directory tree data available.</p>';
        }
    } catch (err) {
        document.getElementById('directory-tree').innerHTML = '<p class="error">Error loading directory tree.</p>';
    }
}

async function fetchAndRenderActivity(repo) {
    try {
        const res = await fetch(`http://127.0.0.1:5001/activity?repo=${encodeURIComponent(repo)}`);
        const activityData = await res.json();
        if (activityData.activity) {
            window.renderActivityTimeline(activityData.activity);
        } else {
            document.getElementById('activity-timeline').innerHTML = '<p class="no-data">No activity data available.</p>';
        }
    } catch (err) {
        document.getElementById('activity-timeline').innerHTML = '<p class="error">Error loading activity data.</p>';
    }
}

async function fetchAndRenderCoverage(repo) {
    try {
        const res = await fetch(`http://127.0.0.1:5001/coverage?repo=${encodeURIComponent(repo)}`);
        const coverageData = await res.json();
        window.renderTestCoverage(coverageData.coverage, coverageData.source);
    } catch (err) {
        document.getElementById('test-coverage').innerHTML = '<p class="error">Error loading coverage data.</p>';
    }
}

async function fetchAndRenderStats(repo) {
    try {
        const res = await fetch(`http://127.0.0.1:5001/stats?repo=${encodeURIComponent(repo)}`);
        const statsData = await res.json();
        if (statsData.error) {
            document.getElementById('stats-grid').innerHTML = '<p class="error">Error loading repository statistics.</p>';
        } else {
            renderRepositoryStats(statsData);
        }
    } catch (err) {
        document.getElementById('stats-grid').innerHTML = '<p class="error">Error loading repository statistics.</p>';
    }
}

async function fetchAndRenderIssues(repo) {
    try {
        const res = await fetch(`http://127.0.0.1:5001/issues?repo=${encodeURIComponent(repo)}`);
        const issuesData = await res.json();
        renderIssuesAnalysis(issuesData);
    } catch (err) {
        document.getElementById('issues-stats').innerHTML = '<p class="error">Error loading issues data.</p>';
    }
}

async function fetchAndRenderPullRequests(repo) {
    try {
        const res = await fetch(`http://127.0.0.1:5001/pull-requests?repo=${encodeURIComponent(repo)}`);
        const prData = await res.json();
        renderPullRequestsAnalysis(prData);
    } catch (err) {
        document.getElementById('pr-stats').innerHTML = '<p class="error">Error loading pull requests data.</p>';
    }
}

async function fetchAndRenderReleases(repo) {
    try {
        const res = await fetch(`http://127.0.0.1:5001/releases?repo=${encodeURIComponent(repo)}`);
        const releasesData = await res.json();
        renderReleases(releasesData.releases);
    } catch (err) {
        document.getElementById('releases-list').innerHTML = '<p class="error">Error loading releases data.</p>';
    }
}

async function fetchAndRenderDependencies(repo) {
    try {
        const res = await fetch(`http://127.0.0.1:5001/dependencies?repo=${encodeURIComponent(repo)}`);
        const depsData = await res.json();
        renderDependencies(depsData);
    } catch (err) {
        document.getElementById('dependencies-list').innerHTML = '<p class="error">Error loading dependencies data.</p>';
    }
}

async function fetchAndRenderTopics(repo) {
    try {
        const res = await fetch(`http://127.0.0.1:5001/topics?repo=${encodeURIComponent(repo)}`);
        const topicsData = await res.json();
        renderTopics(topicsData.topics);
    } catch (err) {
        document.getElementById('topics-list').innerHTML = '<p class="error">Error loading topics data.</p>';
    }
}

// Rendering functions for new features
function renderRepositoryStats(stats) {
    const statsGrid = document.getElementById('stats-grid');
    statsGrid.innerHTML = `
        <div class="stat-card">
            <div class="stat-value">${formatNumber(stats.stars)}</div>
            <div class="stat-label">Stars</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${formatNumber(stats.forks)}</div>
            <div class="stat-label">Forks</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${formatNumber(stats.watchers)}</div>
            <div class="stat-label">Watchers</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${formatNumber(stats.open_issues)}</div>
            <div class="stat-label">Open Issues</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${formatNumber(stats.total_commits)}</div>
            <div class="stat-label">Total Commits</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${formatNumber(stats.age_days)}</div>
            <div class="stat-label">Days Old</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${Math.round(stats.size / 1024)}</div>
            <div class="stat-label">Size (MB)</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${stats.license || 'N/A'}</div>
            <div class="stat-label">License</div>
        </div>
    `;
}

function renderIssuesAnalysis(issuesData) {
    const issuesStats = document.getElementById('issues-stats');
    const stats = issuesData.statistics;
    const recentIssues = issuesData.recent_issues;
    
    let html = `
        <div class="issues-overview">
            <div class="issue-stat">
                <div class="stat-number">${stats.total_open}</div>
                <div class="stat-label">Open Issues</div>
            </div>
            <div class="issue-stat">
                <div class="stat-number">${stats.total_closed}</div>
                <div class="stat-label">Closed Issues</div>
            </div>
            <div class="issue-stat">
                <div class="stat-number">${stats.avg_response_time || 'N/A'}</div>
                <div class="stat-label">Avg Response (days)</div>
            </div>
        </div>
    `;
    
    if (recentIssues && recentIssues.length > 0) {
        html += '<div class="recent-issues">';
        html += '<h4>Recent Issues</h4>';
        recentIssues.slice(0, 5).forEach(issue => {
            const stateClass = issue.state === 'open' ? 'open' : 'closed';
            html += `
                <div class="issue-item ${stateClass}">
                    <div class="issue-header">
                        <span class="issue-number">#${issue.number}</span>
                        <span class="issue-state ${stateClass}">${issue.state}</span>
                    </div>
                    <div class="issue-title">${issue.title}</div>
                    <div class="issue-meta">
                        <span>by ${issue.user}</span>
                        <span>${formatDate(issue.created_at)}</span>
                    </div>
                </div>
            `;
        });
        html += '</div>';
    }
    
    issuesStats.innerHTML = html;
}

function renderPullRequestsAnalysis(prData) {
    const prStats = document.getElementById('pr-stats');
    const stats = prData.statistics;
    const recentPRs = prData.recent_prs;
    
    let html = `
        <div class="pr-overview">
            <div class="pr-stat">
                <div class="stat-number">${stats.total_open}</div>
                <div class="stat-label">Open PRs</div>
            </div>
            <div class="pr-stat">
                <div class="stat-number">${stats.total_merged}</div>
                <div class="stat-label">Merged PRs</div>
            </div>
            <div class="pr-stat">
                <div class="stat-number">${stats.avg_merge_time || 'N/A'}</div>
                <div class="stat-label">Avg Merge Time (days)</div>
            </div>
        </div>
    `;
    
    if (recentPRs && recentPRs.length > 0) {
        html += '<div class="recent-prs">';
        html += '<h4>Recent Pull Requests</h4>';
        recentPRs.slice(0, 5).forEach(pr => {
            const stateClass = pr.state === 'open' ? 'open' : pr.merged_at ? 'merged' : 'closed';
            html += `
                <div class="pr-item ${stateClass}">
                    <div class="pr-header">
                        <span class="pr-number">#${pr.number}</span>
                        <span class="pr-state ${stateClass}">${pr.state}</span>
                    </div>
                    <div class="pr-title">${pr.title}</div>
                    <div class="pr-meta">
                        <span>by ${pr.user}</span>
                        <span>${formatDate(pr.created_at)}</span>
                    </div>
                </div>
            `;
        });
        html += '</div>';
    }
    
    prStats.innerHTML = html;
}

function renderReleases(releases) {
    const releasesList = document.getElementById('releases-list');
    
    if (!releases || releases.length === 0) {
        releasesList.innerHTML = '<p class="no-data">No releases found.</p>';
        return;
    }
    
    let html = '<div class="releases-grid">';
    releases.slice(0, 6).forEach(release => {
        html += `
            <div class="release-card">
                <div class="release-header">
                    <span class="release-tag">${release.tag_name}</span>
                    <span class="release-date">${formatDate(release.published_at)}</span>
                </div>
                <h4 class="release-title">${release.name}</h4>
                <p class="release-description">${release.body ? release.body.substring(0, 100) + '...' : 'No description'}</p>
            </div>
        `;
    });
    html += '</div>';
    
    releasesList.innerHTML = html;
}

function renderDependencies(deps) {
    const dependenciesList = document.getElementById('dependencies-list');
    
    if (!deps || Object.keys(deps).length === 0) {
        dependenciesList.innerHTML = '<p class="no-data">No dependency files found.</p>';
        return;
    }
    
    let html = '<div class="dependencies-grid">';
    Object.entries(deps).forEach(([filename, content]) => {
        html += `
            <div class="dependency-card">
                <h4 class="dependency-filename">${filename}</h4>
                <div class="dependency-content">
                    <pre>${content.substring(0, 300)}${content.length > 300 ? '...' : ''}</pre>
                </div>
            </div>
        `;
    });
    html += '</div>';
    
    dependenciesList.innerHTML = html;
}

function renderTopics(topics) {
    const topicsList = document.getElementById('topics-list');
    
    if (!topics || topics.length === 0) {
        topicsList.innerHTML = '<p class="no-data">No topics found.</p>';
        return;
    }
    
    let html = '<div class="topics-grid">';
    topics.forEach(topic => {
        html += `<span class="topic-tag">${topic}</span>`;
    });
    html += '</div>';
    
    topicsList.innerHTML = html;
}

// Utility functions
function updateRepositoryOverview(data) {
    document.getElementById('repo-name').textContent = data.name;
    document.getElementById('repo-description').textContent = data.description || 'No description available';
    document.getElementById('repo-stars').textContent = formatNumber(data.stargazers_count || 0);
    document.getElementById('repo-forks').textContent = formatNumber(data.forks_count || 0);
    document.getElementById('repo-watchers').textContent = formatNumber(data.watchers_count || 0);
}

function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function simulateLoadingSteps() {
    const steps = document.querySelectorAll('.step');
    let currentStep = 0;
    
    const interval = setInterval(() => {
        if (currentStep < steps.length) {
            steps[currentStep].classList.add('active');
            currentStep++;
        } else {
            clearInterval(interval);
        }
    }, 800);
}

function showLoadingState() {
    document.getElementById('loading').classList.remove('hidden');
}

function hideLoadingState() {
    document.getElementById('loading').classList.add('hidden');
}

function showResults() {
    document.getElementById('results').classList.remove('hidden');
}

function hideResults() {
    document.getElementById('results').classList.add('hidden');
}

function showError(message) {
    document.getElementById('error-message').textContent = message;
    document.getElementById('error').classList.remove('hidden');
}

function hideError() {
    document.getElementById('error').classList.add('hidden');
} 