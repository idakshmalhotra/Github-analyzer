from flask import Flask, request, jsonify
from github import Github
import os
from collections import defaultdict
from datetime import datetime, timedelta
import re
from flask_cors import CORS
import time
import requests
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Load environment variables from .env file
def load_env():
    try:
        with open('.env', 'r') as f:
            for line in f:
                if '=' in line and not line.startswith('#'):
                    key, value = line.strip().split('=', 1)
                    os.environ[key] = value
    except FileNotFoundError:
        logger.info("No .env file found, continuing without it")
        pass

load_env()

app = Flask(__name__)
CORS(app, origins=[
    "https://github-analyzer2.vercel.app",
    "https://github-analyzer2-git-main-bharat-s-projects-3e1e346b.vercel.app",
    "https://github-analyzer2-qt5oz7tcs-bharat-s-projects-3e1e346b.vercel.app/"
])

def get_github_client():
    # Optionally use a GitHub token for higher rate limits
    token = "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"
    if token:
        logger.info("Using GitHub token for higher rate limits")
        return Github(token, per_page=30)
    else:
        logger.info("No GitHub token found. Using anonymous access (60 requests/hour limit)")
        return Github(per_page=30)

def safe_github_call(func, max_retries=3, delay=1):
    """Safely call GitHub API with retry logic and rate limit handling"""
    for attempt in range(max_retries):
        try:
            return func()
        except Exception as e:
            logger.error(f"GitHub API error (attempt {attempt + 1}/{max_retries}): {str(e)}")
            if "rate limit" in str(e).lower() or "403" in str(e):
                if attempt < max_retries - 1:
                    wait_time = delay * (2 ** attempt)
                    logger.info(f"Rate limited, waiting {wait_time}s before retry")
                    time.sleep(wait_time)
                    continue
            raise e

def build_tree(contents):
    tree = []
    for item in contents:
        if item.type == 'dir':
            subtree = build_tree(repo.get_contents(item.path))
            tree.append({'name': item.name, 'type': 'dir', 'children': subtree})
        else:
            tree.append({'name': item.name, 'type': 'file'})
    return tree

@app.route('/tree', methods=['GET'])
def repo_tree():
    repo_full_name = request.args.get('repo')
    if not repo_full_name:
        return jsonify({'error': 'Missing repo parameter'}), 400
    g = get_github_client()
    try:
        global repo
        repo = g.get_repo(repo_full_name)
        contents = repo.get_contents("")
        tree = build_tree(contents)
        return jsonify({'tree': tree})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analyze', methods=['GET'])
def analyze_repo():
    repo_full_name = request.args.get('repo')
    logger.info(f"Analyzing repository: {repo_full_name}")
    
    if not repo_full_name:
        logger.error("Missing repository name")
        return jsonify({'error': 'Missing repo parameter'}), 400
    
    try:
        g = get_github_client()
        
        def get_repo_data():
            logger.debug(f"Fetching data for {repo_full_name}")
            repo = g.get_repo(repo_full_name)
            
            # Get languages
            logger.debug("Fetching languages")
            languages = repo.get_languages()
            
            # Get contributors
            logger.debug("Fetching contributors")
            contributors_list = []
            try:
                contributors = list(repo.get_contributors())[:10]
                for contributor in contributors:
                    contributors_list.append({
                        'login': contributor.login,
                        'contributions': contributor.contributions
                    })
            except Exception as e:
                logger.error(f"Error fetching contributors: {e}")
            
            # Get basic stats
            logger.debug("Compiling repository statistics")
            stats = {
                'name': repo.name,
                'full_name': repo.full_name,
                'description': repo.description,
                'stars': repo.stargazers_count,
                'forks': repo.forks_count,
                'watchers': repo.watchers_count,
                'open_issues': repo.open_issues_count,
                'languages': languages,
                'contributors': contributors_list,
                'created_at': repo.created_at.isoformat() if repo.created_at else None,
                'updated_at': repo.updated_at.isoformat() if repo.updated_at else None
            }
            
            logger.info(f"Successfully analyzed repository {repo_full_name}")
            return stats
        
        data = safe_github_call(get_repo_data)
        return jsonify(data)
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error analyzing repository: {error_msg}")
        if "rate limit" in error_msg.lower():
            return jsonify({'error': 'GitHub API rate limit exceeded. Please try again in a few minutes.'}), 429
        elif "Not Found" in error_msg:
            return jsonify({'error': f'Repository {repo_full_name} not found'}), 404
        else:
            return jsonify({'error': error_msg}), 500

@app.route('/activity', methods=['GET'])
def repo_activity():
    repo_full_name = request.args.get('repo')
    if not repo_full_name:
        return jsonify({'error': 'Missing repo parameter'}), 400
    
    try:
        g = get_github_client()
        
        def get_activity_data():
            repo = g.get_repo(repo_full_name)
            commits = list(repo.get_commits())[:100]  # Limit to last 100 commits
            week_counts = defaultdict(int)
            for commit in commits:
                date = commit.commit.author.date
                week = date.strftime('%Y-%W')
                week_counts[week] += 1
            # Sort by week
            activity = [{'week': week, 'count': week_counts[week]} for week in sorted(week_counts)]
            return {'activity': activity}
        
        data = safe_github_call(get_activity_data)
        return jsonify(data)
        
    except Exception as e:
        error_msg = str(e)
        if "rate limit" in error_msg.lower():
            return jsonify({'error': 'GitHub API rate limit exceeded. Please try again in a few minutes.'}), 429
        else:
            return jsonify({'error': error_msg}), 500

@app.route('/coverage', methods=['GET'])
def repo_coverage():
    repo_full_name = request.args.get('repo')
    if not repo_full_name:
        return jsonify({'error': 'Missing repo parameter'}), 400
    g = get_github_client()
    try:
        repo = g.get_repo(repo_full_name)
        # Try to get README
        readme = repo.get_readme().decoded_content.decode('utf-8')
        # Look for coverage badge (Codecov, Coveralls, etc.)
        badge_match = re.search(r'(\d+)%25?\s*coverage', readme, re.IGNORECASE)
        if badge_match:
            coverage = int(badge_match.group(1))
            return jsonify({'coverage': coverage, 'source': 'badge'})
        # Try to find a coverage file
        files = repo.get_contents("")
        for f in files:
            if 'coverage' in f.name.lower():
                content = f.decoded_content.decode('utf-8', errors='ignore')
                percent_match = re.search(r'(\d+)%', content)
                if percent_match:
                    coverage = int(percent_match.group(1))
                    return jsonify({'coverage': coverage, 'source': f.name})
        return jsonify({'coverage': None, 'source': None})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/stats', methods=['GET'])
def repo_stats():
    repo_full_name = request.args.get('repo')
    if not repo_full_name:
        return jsonify({'error': 'Missing repo parameter'}), 400
    g = get_github_client()
    try:
        repo = g.get_repo(repo_full_name)
        
        # Get basic stats
        stats = {
            'stars': repo.stargazers_count,
            'forks': repo.forks_count,
            'watchers': repo.watchers_count,
            'open_issues': repo.open_issues_count,
            'size': repo.size,  # Size in KB
            'created_at': repo.created_at.isoformat(),
            'updated_at': repo.updated_at.isoformat(),
            'pushed_at': repo.pushed_at.isoformat(),
            'license': repo.license.name if repo.license else None,
            'default_branch': repo.default_branch,
            'archived': repo.archived,
            'fork': repo.fork,
            'private': repo.private,
            'has_wiki': repo.has_wiki,
            'has_pages': repo.has_pages,
            'has_downloads': repo.has_downloads,
            'has_issues': repo.has_issues,
            'has_projects': repo.has_projects
        }
        
        # Calculate age
        age_days = (datetime.now() - repo.created_at).days
        stats['age_days'] = age_days
        
        # Get commit count
        try:
            stats['total_commits'] = repo.get_commits().totalCount
        except:
            stats['total_commits'] = 0
            
        return jsonify(stats)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/issues', methods=['GET'])
def repo_issues():
    repo_full_name = request.args.get('repo')
    if not repo_full_name:
        return jsonify({'error': 'Missing repo parameter'}), 400
    g = get_github_client()
    try:
        repo = g.get_repo(repo_full_name)
        
        # Get recent issues
        issues = repo.get_issues(state='all', sort='created', direction='desc')
        recent_issues = []
        
        for issue in list(issues)[:20]:  # Get last 20 issues
            recent_issues.append({
                'number': issue.number,
                'title': issue.title,
                'state': issue.state,
                'created_at': issue.created_at.isoformat(),
                'updated_at': issue.updated_at.isoformat(),
                'user': issue.user.login,
                'labels': [label.name for label in issue.labels],
                'comments': issue.comments,
                'is_pull_request': issue.pull_request is not None
            })
        
        # Get issue statistics
        open_issues = repo.get_issues(state='open')
        closed_issues = repo.get_issues(state='closed')
        
        issue_stats = {
            'total_open': open_issues.totalCount,
            'total_closed': closed_issues.totalCount,
            'recent_issues': recent_issues
        }
        
        return jsonify(issue_stats)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/pull-requests', methods=['GET'])
def repo_pull_requests():
    repo_full_name = request.args.get('repo')
    if not repo_full_name:
        return jsonify({'error': 'Missing repo parameter'}), 400
    g = get_github_client()
    try:
        repo = g.get_repo(repo_full_name)
        
        # Get recent pull requests
        pull_requests = repo.get_pulls(state='all', sort='created', direction='desc')
        recent_prs = []
        
        for pr in list(pull_requests)[:20]:  # Get last 20 PRs
            recent_prs.append({
                'number': pr.number,
                'title': pr.title,
                'state': pr.state,
                'created_at': pr.created_at.isoformat(),
                'updated_at': pr.updated_at.isoformat(),
                'user': pr.user.login,
                'labels': [label.name for label in pr.labels],
                'comments': pr.comments,
                'commits': pr.commits,
                'additions': pr.additions,
                'deletions': pr.deletions,
                'changed_files': pr.changed_files,
                'merged': pr.merged,
                'mergeable': pr.mergeable
            })
        
        # Get PR statistics
        open_prs = repo.get_pulls(state='open')
        closed_prs = repo.get_pulls(state='closed')
        merged_prs = repo.get_pulls(state='closed', sort='updated', direction='desc')
        
        pr_stats = {
            'total_open': open_prs.totalCount,
            'total_closed': closed_prs.totalCount,
            'total_merged': sum(1 for pr in merged_prs if pr.merged),
            'recent_prs': recent_prs
        }
        
        return jsonify(pr_stats)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/releases', methods=['GET'])
def repo_releases():
    repo_full_name = request.args.get('repo')
    if not repo_full_name:
        return jsonify({'error': 'Missing repo parameter'}), 400
    g = get_github_client()
    try:
        repo = g.get_repo(repo_full_name)
        
        releases = repo.get_releases()
        release_list = []
        
        for release in releases:
            release_list.append({
                'tag_name': release.tag_name,
                'name': release.name,
                'body': release.body,
                'created_at': release.created_at.isoformat(),
                'published_at': release.published_at.isoformat() if release.published_at else None,
                'prerelease': release.prerelease,
                'draft': release.draft,
                'downloads': release.get_assets().totalCount
            })
        
        return jsonify({'releases': release_list})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/dependencies', methods=['GET'])
def repo_dependencies():
    repo_full_name = request.args.get('repo')
    if not repo_full_name:
        return jsonify({'error': 'Missing repo parameter'}), 400
    g = get_github_client()
    try:
        repo = g.get_repo(repo_full_name)
        
        dependencies = {
            'package.json': None,
            'requirements.txt': None,
            'pom.xml': None,
            'build.gradle': None,
            'Gemfile': None,
            'Cargo.toml': None,
            'go.mod': None
        }
        
        # Try to find dependency files
        try:
            contents = repo.get_contents("")
            for file in contents:
                if file.name in dependencies:
                    content = file.decoded_content.decode('utf-8', errors='ignore')
                    dependencies[file.name] = content
        except:
            pass
        
        return jsonify(dependencies)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/topics', methods=['GET'])
def repo_topics():
    repo_full_name = request.args.get('repo')
    if not repo_full_name:
        return jsonify({'error': 'Missing repo parameter'}), 400
    g = get_github_client()
    try:
        repo = g.get_repo(repo_full_name)
        topics = repo.get_topics()
        return jsonify({'topics': topics})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port) 