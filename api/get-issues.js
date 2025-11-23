// GitHub Issues API 代理端點 - 讀取 Issues
// 部署到 Vercel、Netlify Functions 或其他 serverless 平台
//
// 環境變數：
// GITHUB_TOKEN: GitHub Personal Access Token (可選，但建議設置以獲取更多資訊)
//
// 使用方法：
// 1. 部署到 Vercel: vercel
// 2. 設置環境變數 GITHUB_TOKEN（可選）
// 3. 更新前端代碼中的 API_ENDPOINT

export default async function handler(req, res) {
    // 設置 CORS
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
        const repoName = 'oldfish-profile';
        const githubToken = process.env.GITHUB_TOKEN;
        
        // 讀取 GitHub Issues（公開的，不需要 token，但使用 token 可以獲取更多資訊）
        const url = `https://api.github.com/repos/${repoOwner}/${repoName}/issues?labels=whisper&state=all&per_page=100&sort=created&direction=desc`;
        
        const headers = {
            'Accept': 'application/vnd.github.v3+json'
        };
        
        if (githubToken) {
            headers['Authorization'] = `token ${githubToken}`;
        }
        
        const response = await fetch(url, { headers });
        
        if (!response.ok) {
            throw new Error('Failed to fetch issues');
        }
        
        const issues = await response.json();
        
        // 解析 Issues 為訊息格式
        const messages = issues.map(issue => {
            // 從 Issue body 中解析訊息
            const body = issue.body || '';
            const nameMatch = body.match(/\*\*姓名：\*\* (.+)/);
            const emailMatch = body.match(/\*\*Email：\*\* (.+)/);
            const messageMatch = body.match(/\*\*訊息內容：\*\*\s*\n\n(.+?)\n\n---/s);
            
            return {
                id: issue.number,
                name: nameMatch ? nameMatch[1].trim() : '未知',
                email: emailMatch ? emailMatch[1].trim() : '未知',
                message: messageMatch ? messageMatch[1].trim() : issue.body,
                timestamp: issue.created_at,
                read: issue.state === 'closed',
                issueUrl: issue.html_url,
                issueNumber: issue.number
            };
        });
        
        return res.status(200).json({
            success: true,
            messages: messages
        });
        
    } catch (error) {
        console.error('Error fetching issues:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}

