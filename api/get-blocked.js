// 取得全站攔截紀錄 API 端點（從 GitHub Issues 讀取）
//
// 使用方法：
// GET /api/get-blocked

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const repoOwner = 'oldfish101240';
        const repoName = 'whisper-box';
        const githubToken = process.env.GITHUB_TOKEN;

        const url = `https://api.github.com/repos/${repoOwner}/${repoName}/issues?labels=analytics,blocked-content&state=all&per_page=100&sort=created&direction=desc`;

        const headers = { 'Accept': 'application/vnd.github.v3+json' };
        if (githubToken) headers['Authorization'] = `token ${githubToken}`;

        const response = await fetch(url, { headers });
        if (!response.ok) throw new Error('Failed to fetch blocked logs');

        const issues = await response.json();

        const logs = issues.map(issue => {
            const body = issue.body || '';
            const timeMatch = body.match(/\*\*時間：\*\* (.+)/);
            const pageMatch = body.match(/\*\*頁面：\*\* (.+)/);
            const nameMatch = body.match(/\*\*姓名：\*\* (.+)/);
            const wordsMatch = body.match(/\*\*觸發詞：\*\* (.+)/);
            const countryMatch = body.match(/\*\*國家\/地區：\*\* (.+)/);
            const msgMatch = body.match(/\*\*被攔截內容：\*\*\s*\n\n([\s\S]*?)\n\n---/);

            return {
                id: issue.number,
                timestamp: timeMatch ? timeMatch[1].trim() : issue.created_at,
                page: pageMatch ? pageMatch[1].trim() : '/',
                name: nameMatch ? nameMatch[1].trim() : '',
                words: wordsMatch ? wordsMatch[1].trim() : '',
                country: countryMatch ? countryMatch[1].trim() : '未知',
                message: msgMatch ? msgMatch[1].trim() : '',
                issueUrl: issue.html_url
            };
        });

        return res.status(200).json({ success: true, logs });
    } catch (error) {
        console.error('Error fetching blocked logs:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}



