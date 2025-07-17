window.renderLanguageBreakdown = function(languages) {
    const container = document.getElementById('language-breakdown');
    container.innerHTML = '<h3>Language Breakdown</h3>';
    if (!languages || Object.keys(languages).length === 0) {
        container.innerHTML += '<p>No language data available.</p>';
        return;
    }
    // Prepare data for D3
    const data = Object.entries(languages).map(([lang, value]) => ({lang, value}));
    // Remove previous SVG
    d3.select('#language-breakdown svg').remove();
    const width = 400, height = 300, radius = Math.min(width, height) / 2;
    const svg = d3.select('#language-breakdown')
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${width/2},${height/2})`);
    const color = d3.scaleOrdinal(d3.schemeCategory10);
    const pie = d3.pie().value(d => d.value);
    const arc = d3.arc().innerRadius(0).outerRadius(radius);
    const arcs = svg.selectAll('arc')
        .data(pie(data))
        .enter()
        .append('g');
    arcs.append('path')
        .attr('d', arc)
        .attr('fill', d => color(d.data.lang));
    arcs.append('text')
        .attr('transform', d => `translate(${arc.centroid(d)})`)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .text(d => d.data.lang);
};

window.renderContributionGraph = function(contributors) {
    const container = document.getElementById('contribution-graph');
    container.innerHTML = '<h3>Contribution Graph</h3>';
    if (!contributors || contributors.length === 0) {
        container.innerHTML += '<p>No contributor data available.</p>';
        return;
    }
    // Remove previous SVG
    d3.select('#contribution-graph svg').remove();
    const width = 500, height = 300;
    const margin = {top: 30, right: 20, bottom: 60, left: 60};
    const svg = d3.select('#contribution-graph')
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    const x = d3.scaleBand()
        .domain(contributors.map(d => d.login))
        .range([margin.left, width - margin.right])
        .padding(0.2);
    const y = d3.scaleLinear()
        .domain([0, d3.max(contributors, d => d.contributions)])
        .nice()
        .range([height - margin.bottom, margin.top]);
    svg.append('g')
        .attr('transform', `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x))
        .selectAll('text')
        .attr('transform', 'rotate(-40)')
        .style('text-anchor', 'end');
    svg.append('g')
        .attr('transform', `translate(${margin.left},0)`)
        .call(d3.axisLeft(y));
    svg.selectAll('.bar')
        .data(contributors)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', d => x(d.login))
        .attr('y', d => y(d.contributions))
        .attr('width', x.bandwidth())
        .attr('height', d => y(0) - y(d.contributions))
        .attr('fill', '#007bff');
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', margin.top - 10)
        .attr('text-anchor', 'middle')
        .attr('font-size', '16px')
        .text('Commits per Contributor');
};

window.renderDirectoryTree = function(treeData) {
    const container = document.getElementById('directory-tree');
    container.innerHTML = '<h3>Directory Tree</h3>';
    if (!treeData || treeData.length === 0) {
        container.innerHTML += '<p>No directory data available.</p>';
        return;
    }
    // Remove previous SVG
    d3.select('#directory-tree svg').remove();
    // D3 expects a single root, so wrap in a root node
    const root = { name: 'root', children: treeData };
    const width = 600, height = 400;
    const svg = d3.select('#directory-tree')
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', 'translate(40,0)');
    const treeLayout = d3.tree().size([height - 40, width - 160]);
    const rootNode = d3.hierarchy(root);
    treeLayout(rootNode);
    // Links
    svg.selectAll('path.link')
        .data(rootNode.links())
        .enter()
        .append('path')
        .attr('class', 'link')
        .attr('fill', 'none')
        .attr('stroke', '#555')
        .attr('stroke-width', 1.5)
        .attr('d', d3.linkHorizontal()
            .x(d => d.y)
            .y(d => d.x));
    // Nodes
    const node = svg.selectAll('g.node')
        .data(rootNode.descendants())
        .enter()
        .append('g')
        .attr('class', 'node')
        .attr('transform', d => `translate(${d.y},${d.x})`);
    node.append('circle')
        .attr('r', 5)
        .attr('fill', d => d.data.type === 'dir' ? '#007bff' : '#aaa');
    node.append('text')
        .attr('dy', 3)
        .attr('x', d => d.children ? -10 : 10)
        .style('text-anchor', d => d.children ? 'end' : 'start')
        .text(d => d.data.name);
};

window.renderActivityTimeline = function(activity) {
    const container = document.getElementById('activity-timeline');
    container.innerHTML = '<h3>Activity Timeline</h3>';
    if (!activity || activity.length === 0) {
        container.innerHTML += '<p>No activity data available.</p>';
        return;
    }
    // Remove previous SVG
    d3.select('#activity-timeline svg').remove();
    const width = 600, height = 300, margin = {top: 30, right: 30, bottom: 50, left: 60};
    const svg = d3.select('#activity-timeline')
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    // Parse data
    const parseWeek = d3.timeParse('%Y-%W');
    const data = activity.map(d => ({
        week: parseWeek(d.week),
        count: d.count
    })).filter(d => d.week);
    // X and Y scales
    const x = d3.scaleTime()
        .domain(d3.extent(data, d => d.week))
        .range([margin.left, width - margin.right]);
    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.count)]).nice()
        .range([height - margin.bottom, margin.top]);
    // X axis
    svg.append('g')
        .attr('transform', `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).ticks(8).tickFormat(d3.timeFormat('%Y-%W')))
        .selectAll('text')
        .attr('transform', 'rotate(-40)')
        .style('text-anchor', 'end');
    // Y axis
    svg.append('g')
        .attr('transform', `translate(${margin.left},0)`)
        .call(d3.axisLeft(y));
    // Line
    const line = d3.line()
        .x(d => x(d.week))
        .y(d => y(d.count));
    svg.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', '#007bff')
        .attr('stroke-width', 2)
        .attr('d', line);
    // Title
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', margin.top - 10)
        .attr('text-anchor', 'middle')
        .attr('font-size', '16px')
        .text('Commits per Week');
};

window.renderTestCoverage = function(coverage, source) {
    const container = document.getElementById('test-coverage');
    container.innerHTML = '<h3>Test Coverage</h3>';
    if (coverage === null || coverage === undefined) {
        container.innerHTML += '<p>No coverage data available.</p>';
        return;
    }
    // Remove previous SVG
    d3.select('#test-coverage svg').remove();
    const width = 300, height = 80;
    const svg = d3.select('#test-coverage')
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    // Draw bar
    svg.append('rect')
        .attr('x', 20)
        .attr('y', 30)
        .attr('width', 260)
        .attr('height', 20)
        .attr('fill', '#eee');
    svg.append('rect')
        .attr('x', 20)
        .attr('y', 30)
        .attr('width', 2.6 * coverage)
        .attr('height', 20)
        .attr('fill', coverage >= 80 ? '#28a745' : coverage >= 50 ? '#ffc107' : '#dc3545');
    svg.append('text')
        .attr('x', 150)
        .attr('y', 25)
        .attr('text-anchor', 'middle')
        .attr('font-size', '18px')
        .text(`${coverage}%`);
    svg.append('text')
        .attr('x', 150)
        .attr('y', 65)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .text(source ? `Source: ${source}` : '');
}; 